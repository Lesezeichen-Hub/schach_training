(function (root) {
  "use strict";

  const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const pawnMemo = new Map();
  const RATING_STAGES = [
    { min: 400, name: "Bauer" }, { min: 700, name: "Springer" }, { min: 900, name: "Läufer" },
    { min: 1100, name: "Turm" }, { min: 1300, name: "Dame" }, { min: 1500, name: "Meister" }
  ];

  function uci(move) {
    return move.from + move.to + (move.promotion || "");
  }

  function validateTactic(task, move, step = 0) {
    const expected = task.line[step];
    return {
      correct: uci(move) === expected,
      expected,
      complete: uci(move) === expected && step === task.line.length - 1
    };
  }

  function updateRating(current, score, challengeRating) {
    const expected = 1 / (1 + 10 ** ((challengeRating - current) / 400));
    return Math.max(400, Math.min(2000, Math.round(current + 32 * (score - expected))));
  }

  function calculateMatchElo(current, opponent, score, games = 0) {
    const rating = Number.isFinite(current) ? current : 800;
    const opponentRating = Number.isFinite(opponent) ? opponent : 800;
    const result = Math.max(0, Math.min(1, Number(score)));
    const expected = 1 / (1 + 10 ** ((opponentRating - rating) / 400));
    const k = games < 10 ? 40 : games < 30 ? 32 : 24;
    const change = Math.round(k * (result - expected));
    return {
      rating: Math.max(300, Math.min(2400, rating + change)),
      change,
      expected,
      k
    };
  }

  function classifyMoveLoss(centipawnLoss) {
    const loss = Math.max(0, Number.isFinite(centipawnLoss) ? centipawnLoss : 0);
    if (loss <= 15) return { id: "best", label: "Bester Zug", quality: 100 };
    if (loss <= 40) return { id: "good", label: "Guter Zug", quality: 90 };
    if (loss <= 90) return { id: "inaccuracy", label: "Ungenauigkeit", quality: 70 };
    if (loss <= 180) return { id: "mistake", label: "Fehler", quality: 40 };
    return { id: "blunder", label: "Grober Fehler", quality: 10 };
  }

  function ratingStage(rating) {
    let index = 0;
    for (let i = 0; i < RATING_STAGES.length; i++) if (rating >= RATING_STAGES[i].min) index = i;
    const current = RATING_STAGES[index];
    const next = RATING_STAGES[index + 1] || null;
    const progress = next ? (rating - current.min) / (next.min - current.min) : 1;
    return { name: current.name, min: current.min, next, progress: Math.max(0, Math.min(1, progress)) };
  }

  function materialFor(engine, state, color) {
    let score = 0;
    for (const piece of state.board.flat()) {
      if (piece && engine.colorOf(piece) === color) score += VALUES[engine.typeOf(piece)] || 0;
    }
    return score;
  }

  function kingDistanceToEdge(engine, state, color) {
    const king = color === "w" ? "K" : "k";
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (state.board[r][c] === king) return Math.min(r, c, 7 - r, 7 - c);
    }
    return 0;
  }

  function findPiece(engine, state, piece) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (state.board[r][c] === piece) return [r, c];
    }
    return null;
  }

  function kingsInOpposition(engine, state) {
    const white = findPiece(engine, state, "K");
    const black = findPiece(engine, state, "k");
    if (!white || !black) return false;
    return (white[0] === black[0] && Math.abs(white[1] - black[1]) === 2) ||
      (white[1] === black[1] && Math.abs(white[0] - black[0]) === 2);
  }

  function canForcePawnWin(engine, state, depth = 12, memo = pawnMemo, visiting = new Set()) {
    const pieces = state.board.flat().filter(Boolean);
    if (pieces.some((piece) => engine.colorOf(piece) === "w" && ["q", "r"].includes(engine.typeOf(piece)))) return true;
    if (!pieces.includes("P") || depth <= 0) return false;
    const key = `${engine.toFEN(state).split(" ").slice(0, 4).join(" ")}|${depth}`;
    if (memo.has(key)) return memo.get(key);
    const positionKey = key.split("|")[0];
    if (visiting.has(positionKey)) return false;
    const moves = engine.legalMoves(state);
    if (!moves.length) return false;
    visiting.add(positionKey);
    const outcomes = moves.map((move) => canForcePawnWin(engine, engine.applyMove(state, move, false), depth - 1, memo, visiting));
    visiting.delete(positionKey);
    const wins = state.turn === "w" ? outcomes.some(Boolean) : outcomes.every(Boolean);
    memo.set(key, wins);
    return wins;
  }

  function chooseEndgameDefense(engine, state, lesson) {
    const moves = engine.legalMoves(state);
    if (!moves.length) return null;
    let best = -Infinity;
    let choices = [];
    for (const move of moves) {
      const next = engine.applyMove(state, move, false);
      let score = 0;
      if (move.capture) score += 10000 + (VALUES[engine.typeOf(move.capture)] || 0);
      if (lesson === "ladder-mate") score += kingDistanceToEdge(engine, next, "b") * 80 + moves.length;
      if (lesson === "pawn-opposition") {
        const pawn = findPiece(engine, next, "P");
        const king = findPiece(engine, next, "k");
        if (!pawn) score += 20000;
        else if (king) score -= (Math.abs(king[0] - pawn[0]) + Math.abs(king[1] - pawn[1])) * 35;
        if (kingsInOpposition(engine, next) && next.turn === "w") score += 250;
        if (!canForcePawnWin(engine, next, 10)) score += 5000;
      }
      if (score > best) { best = score; choices = [move]; }
      else if (score === best) choices.push(move);
    }
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function reviewEndgameMove(engine, before, after, lesson, move) {
    const status = engine.gameStatus(after);
    if (status.type === "stalemate") return { ok: false, title: "Patt – noch einmal", text: "Der König hat keinen legalen Zug, steht aber nicht im Schach. Lass ihm bis zum Matt immer ein Feld." };
    if (lesson === "ladder-mate") {
      const rookCanFall = engine.legalMoves(after).some((reply) => reply.capture && engine.typeOf(reply.capture) === "r");
      if (rookCanFall) return { ok: false, title: "Turm ungedeckt", text: "Der König kann im nächsten Zug einen Turm schlagen. Halte den angreifenden Turm auf Abstand." };
      if (status.type === "checkmate") return { ok: true, complete: true, title: "Treppenmatt geschafft!", text: "Die Türme haben den König Reihe für Reihe bis an den Rand gedrängt." };
      return { ok: true, title: "Weiter einschränken", text: "Gut. Schneide mit dem anderen Turm die nächste Reihe ab." };
    }

    const pawn = findPiece(engine, after, "P");
    if (!pawn) return { ok: false, title: "Bauer verloren", text: "Der Bauer darf nicht ohne Schutz vorgeschoben werden. Bringe zuerst den König vor ihn." };
    const canCapturePawn = engine.legalMoves(after).some((reply) => reply.capture === "P");
    if (canCapturePawn) return { ok: false, title: "Opposition verloren", text: "Der schwarze König kann den Bauern schlagen. Gewinne zuerst mit deinem König die Opposition." };
    if (!canForcePawnWin(engine, after)) return { ok: false, title: "Opposition verloren", text: "Mit diesem Zug kann Schwarz die Umwandlung regelgerecht verhindern. Halte den König vor dem Bauern und zwinge den gegnerischen König zum Ausweichen." };
    if (move.promotion) return { ok: true, complete: true, title: "Umwandlung geschafft!", text: "König vor den Bauern, Opposition nutzen, dann sicher umwandeln." };
    if (kingsInOpposition(engine, after) && after.turn === "b") return { ok: true, title: "Opposition gewonnen", text: "Perfekt: Schwarz muss ausweichen und dein König kann eindringen." };
    return { ok: true, title: "Stellung hält", text: "Prüfe vor dem nächsten Bauernzug, ob dein König weiter Raum gewinnen kann." };
  }

  function toPgn(records, result = "*") {
    const turns = [];
    for (let index = 0; index < records.length; index += 2) {
      turns.push(`${index / 2 + 1}. ${records[index]?.san || ""}${records[index + 1] ? ` ${records[index + 1].san}` : ""}`);
    }
    return `${turns.join(" ")} ${result}`.trim();
  }

  function coachReview(records, pgn = toPgn(records), playerColor = "w") {
    const ownMoves = records.filter((record) => record.color === playerColor);
    const castledEarly = ownMoves.slice(0, 15).some((record) => record.san === "O-O" || record.san === "O-O-O");
    const materialDrops = records.filter((record) => {
      if (record.color === playerColor) return false;
      const before = record.playerMaterialBefore ?? (playerColor === "w" ? record.whiteMaterialBefore : undefined);
      const after = record.playerMaterialAfter ?? (playerColor === "w" ? record.whiteMaterialAfter : undefined);
      return Number.isFinite(before) && Number.isFinite(after) && before - after >= 300;
    });
    const strengths = [];
    const improvements = [];
    if (!materialDrops.length) strengths.push("Du hast keine Leichtfigur oder Schwerfigur einzügig eingestellt.");
    else improvements.push(`Bei ${materialDrops.length} gegnerischen Zug${materialDrops.length === 1 ? "" : "en"} hast du mindestens eine Figur verloren. Prüfe vor jedem Zug: Was greift mein Gegner an?`);
    if (castledEarly) strengths.push("Du hast deinen König rechtzeitig durch die Rochade gesichert.");
    else improvements.push("Bringe deinen König früher in Sicherheit: Rochiere möglichst vor Zug 15.");
    return {
      title: improvements.length ? "Coach-Review: ein klarer Trainingsauftrag" : "Coach-Review: solide Partie",
      strengths,
      improvements,
      pgn,
      summary: `${strengths[0] || "Gut gekämpft!"} ${improvements[0] || "Wiederhole nun eine Taktikaufgabe, um das Muster zu festigen."}`
    };
  }

  const PHASES = ["explain", "demo", "guided", "practice"];
  let lessonRun = 0;
  const legalUci = (engine, game, code) => engine.legalMoves(game).find((move) => uci(move) === code);
  function arrowPoint(engine, square, flipped = false) {
    const [r, c] = engine.coords(square);
    return { x: (flipped ? 7 - c : c) + .5, y: (flipped ? 7 - r : r) + .5 };
  }
  function normalizeLesson(record) {
    return record.lesson || { revision: 0, goal: record.prompt || record.name, intro: record.explanation || (record.ideas || []).join(" · "), scenarios: [{ id: "main", title: "Hauptlinie", learnerSide: record.side || "w", startFen: record.fen, line: record.line, steps: record.line.map((code) => ({ before: `Lehrzug ${code}`, after: "Diese ältere Lektion enthält noch keine Detailerklärung.", hint: code, visual: { arrows: [{ from: code.slice(0, 2), to: code.slice(2, 4), kind: "move", label: "Zug" }] } })), outcome: "Lehrfolge abgeschlossen." }] };
  }
  function scenarioStart(engine, record, scenario) {
    if (scenario.startFen) return engine.fromFEN(scenario.startFen);
    let game = engine.fromFEN(record.fen || engine.START_FEN);
    for (const code of record.line.slice(0, scenario.startPly || 0)) {
      const move = legalUci(engine, game, code);
      if (!move) throw new Error(`Ungültiger Hauptlinienzug ${code}`);
      game = engine.applyMove(game, move);
    }
    game.history = [];
    return game;
  }
  function validateLesson(engine, record) {
    const errors = [];
    const lesson = normalizeLesson(record);
    const ids = new Set();
    for (const scenario of lesson.scenarios) {
      try {
        if (ids.has(scenario.id)) throw new Error("Doppelte Szenario-ID");
        ids.add(scenario.id);
        if (scenario.startFen && scenario.startPly != null) throw new Error("startFen und startPly sind exklusiv");
        if (!['w', 'b'].includes(scenario.learnerSide) || !scenario.line.length || scenario.steps.length !== scenario.line.length) throw new Error("Unvollständiges Szenario");
        let game = scenarioStart(engine, record, scenario);
        if (game.board.flat().filter((p) => p === 'K').length !== 1 || game.board.flat().filter((p) => p === 'k').length !== 1 || engine.inCheck(game, game.turn === 'w' ? 'b' : 'w')) throw new Error("Illegaler Ausgangszustand");
        for (const [index, code] of scenario.line.entries()) {
          const move = legalUci(engine, game, code);
          if (!move || engine.gameStatus(game).over) throw new Error(`Illegaler Zug ${code}`);
          const step = scenario.steps[index];
          if (!step.before || !step.after || !step.hint) throw new Error(`Erklärung fehlt bei ${code}`);
          for (const arrow of step.visual?.arrows || []) if (!/^[a-h][1-8]$/.test(arrow.from) || !/^[a-h][1-8]$/.test(arrow.to)) throw new Error("Ungültiger Pfeil");
          for (const mistake of step.mistakes || []) {
            let alternative = game;
            for (const wrong of [mistake.move, ...(mistake.reply || [])]) {
              const legal = legalUci(engine, alternative, wrong);
              if (!legal) throw new Error(`Illegaler Vergleichszug ${wrong}`);
              alternative = engine.applyMove(alternative, legal);
            }
          }
          game = engine.applyMove(game, move);
        }
      } catch (error) { errors.push(`${record.id}/${scenario.id}: ${error.message}`); }
    }
    return errors;
  }
  function createLessonSession(engine, record, options = {}) {
    const lesson = normalizeLesson(record);
    const scenario = lesson.scenarios.find((s) => s.id === options.scenario) || lesson.scenarios[0];
    const session = { engine, record, lesson, scenario, phase: PHASES.includes(options.phase) ? options.phase : "explain", learnerSide: scenario.learnerSide, ply: 0, game: scenarioStart(engine, record, scenario), runId: ++lessonRun, mistakes: 0, assisted: false, completionEmitted: false, completion: null };
    session.errors = validateLesson(engine, record);
    return session;
  }
  function getLessonView(session) {
    const { scenario, ply, phase, game, engine } = session;
    const status = session.errors.length ? "invalid-data" : ply === scenario.line.length ? "complete" : phase === "explain" ? "explaining" : phase === "demo" || game.turn !== session.learnerSide ? "awaiting-auto" : "awaiting-user";
    return { status, ply, total: scenario.line.length, step: scenario.steps[ply] || null, previous: scenario.steps[ply - 1] || null, expected: scenario.line[ply], flipped: session.learnerSide === "b", fen: engine.toFEN(game) };
  }
  function finishLesson(session) {
    if (session.ply !== session.scenario.line.length || session.completionEmitted) return null;
    session.completionEmitted = true;
    session.completion = { runId: session.runId, phase: session.phase, scenario: session.scenario.id, revision: session.lesson.revision, assisted: session.assisted, mistakes: session.mistakes, scored: session.phase === "practice" && !session.assisted };
    return session.completion;
  }
  function advanceLesson(session, assistance = false) {
    const view = getLessonView(session);
    if (["invalid-data", "complete", "explaining"].includes(view.status)) return { correct: false };
    if (view.status === "awaiting-user" && !assistance) return { correct: false, needsHelp: true };
    if (assistance && session.phase !== "demo") session.assisted = true;
    const move = legalUci(session.engine, session.game, view.expected);
    session.game = session.engine.applyMove(session.game, move);
    session.ply++;
    return { correct: true, move, completion: finishLesson(session) };
  }
  function submitLessonMove(session, candidate) {
    const view = getLessonView(session);
    if (view.status !== "awaiting-user") return { correct: false, blocked: true };
    const code = typeof candidate === "string" ? candidate : uci(candidate);
    const move = legalUci(session.engine, session.game, code);
    if (!move) return { correct: false, illegal: true, feedback: "Dieser Zug ist nicht legal." };
    if (code !== view.expected) {
      session.mistakes++;
      const example = view.step.mistakes?.find((m) => m.move === code);
      return { correct: false, feedback: example?.text || `${code.slice(0, 2)} → ${code.slice(2, 4)} ist legal, aber nicht Teil dieser Lehrfolge. Das ist keine Bewertung als schlechter Zug. Welche Antwort passt zum Szenarioziel?`, example };
    }
    session.game = session.engine.applyMove(session.game, move);
    session.ply++;
    return { correct: true, move, completion: finishLesson(session) };
  }
  function seekLesson(session, ply) {
    const target = Math.max(0, Math.min(session.scenario.line.length, ply));
    if (session.phase !== "demo" && session.phase !== "explain") session.assisted = true;
    session.game = scenarioStart(session.engine, session.record, session.scenario);
    session.ply = 0;
    for (const code of session.scenario.line.slice(0, target)) {
      session.game = session.engine.applyMove(session.game, legalUci(session.engine, session.game, code)); session.ply++;
    }
    return getLessonView(session);
  }
  function restartLesson(session) {
    // A new attempt after seeing the line is assisted, even after restarting.
    const next = createLessonSession(session.engine, session.record, { phase: session.phase, scenario: session.scenario.id });
    next.assisted = session.assisted || session.ply > 0;
    return next;
  }
  function setLessonReviewState(entry, scenario, needsReview) {
    if (!entry.scenarioErrors || typeof entry.scenarioErrors !== 'object' || Array.isArray(entry.scenarioErrors)) {
      entry.scenarioErrors = { main: Boolean(entry.openError) };
    }
    entry.scenarioErrors[scenario] = Boolean(needsReview);
    entry.openError = Object.values(entry.scenarioErrors).some(Boolean);
    return entry;
  }
  function moveRows(moves, initialFullmove = 1) {
    const rows = [];
    let number = initialFullmove;
    for (const move of moves) {
      if (move.color === 'w' || !rows.length || rows.at(-1).black) rows.push({ number, white: '', black: '' });
      rows.at(-1)[move.color === 'b' ? 'black' : 'white'] = move.san;
      if (move.color === 'b') number++;
    }
    return rows;
  }
  function normalizeProgress(value) {
    const saved = value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
    for (const key of ["puzzles", "themes", "ratings", "lessons"]) {
      if (!saved[key] || typeof saved[key] !== "object" || Array.isArray(saved[key])) saved[key] = {};
    }
    for (const key of ["count", "totalAttempts", "totalSolved"]) if (!Number.isFinite(saved[key]) || saved[key] < 0) saved[key] = 0;
    for (const area of ["tactics", "endgame", "strategy", "openings"]) if (!Number.isFinite(saved.ratings[area])) saved.ratings[area] = 800;
    for (const [id, item] of Object.entries(saved.puzzles)) {
      if (!item || typeof item !== "object" || Array.isArray(item)) { delete saved.puzzles[id]; continue; }
      for (const key of ["attempts", "successes", "errors"]) if (!Number.isFinite(item[key]) || item[key] < 0) item[key] = 0;
      if (typeof item.openError !== "boolean") item.openError = item.errors > 0;
    }
    for (const [id, item] of Object.entries(saved.themes)) {
      if (!item || typeof item !== "object" || Array.isArray(item)) { delete saved.themes[id]; continue; }
      for (const key of ["attempts", "successes"]) if (!Number.isFinite(item[key]) || item[key] < 0) item[key] = 0;
    }
    for (const [id, item] of Object.entries(saved.lessons)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) { delete saved.lessons[id]; continue; }
      if (!item.completions || typeof item.completions !== 'object' || Array.isArray(item.completions)) item.completions = {};
      for (const [key, count] of Object.entries(item.completions)) if (!Number.isFinite(count) || count < 0) delete item.completions[key];
      if (!Number.isFinite(item.errors) || item.errors < 0) item.errors = 0;
      item.openError = Boolean(item.openError);
    }
    if (!Array.isArray(saved.gameMistakes)) saved.gameMistakes = [];
    saved.gameMistakes = saved.gameMistakes.filter((item) => item && typeof item === "object" && typeof item.fen === "string" && typeof item.best === "string").slice(-50);
    for (const item of saved.gameMistakes) {
      item.attempts = Number.isFinite(item.attempts) && item.attempts >= 0 ? item.attempts : 0;
      item.successes = Number.isFinite(item.successes) && item.successes >= 0 ? item.successes : 0;
      item.mastered = Boolean(item.mastered);
    }
    return saved;
  }
  root.ChessTraining = { validateTactic, updateRating, calculateMatchElo, classifyMoveLoss, ratingStage, materialFor, kingsInOpposition, canForcePawnWin, chooseEndgameDefense, reviewEndgameMove, toPgn, coachReview, PHASES, legalUci, arrowPoint, normalizeLesson, scenarioStart, validateLesson, createLessonSession, getLessonView, submitLessonMove, advanceLesson, seekLesson, restartLesson, normalizeProgress, setLessonReviewState, moveRows };
})(typeof window !== "undefined" ? window : globalThis);
