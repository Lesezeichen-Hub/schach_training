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

  function coachReview(records, pgn = toPgn(records)) {
    const whiteMoves = records.filter((record) => record.color === "w");
    const castledEarly = whiteMoves.slice(0, 15).some((record) => record.san === "O-O" || record.san === "O-O-O");
    const materialDrops = records.filter((record) => record.color === "b" && record.whiteMaterialBefore - record.whiteMaterialAfter >= 300);
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

  root.ChessTraining = { validateTactic, updateRating, ratingStage, materialFor, kingsInOpposition, canForcePawnWin, chooseEndgameDefense, reviewEndgameMove, toPgn, coachReview };
})(typeof window !== "undefined" ? window : globalThis);
