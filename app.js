(function () {
  "use strict";

  const E = window.ChessEngine;
  const T = window.ChessTraining;
  const difficulties = E.DIFFICULTY_LEVELS;
  const glyph = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const boardEl = document.querySelector("#board");
  const statusCard = document.querySelector(".status-card");
  const state = {
    game: E.fromFEN(), mode: "home", level: "learner", colorChoice: "w", playerColor: "w", selected: null,
    legal: [], lastMove: null, opponentLastMove: null, moves: [], thinking: false, puzzleIndex: 0, puzzlePosition: 0,
    puzzleSolved: false, attemptsOnPuzzle: 0, solutionFrom: null, solutionTo: null,
    endgameId: "ladder-mate", endgameFailed: false, strategyStep: 0, strategySolved: false,
    openingIndex: 0, openingPly: 0, openingErrors: 0, basicsStep: 0, sessionId: 0, messageOverride: null,
    matchHint: null, hintThinking: false, hintRequest: 0, matchRated: false, matchResult: null,
    lesson: null, lessonTimer: null, lessonPlaying: false, lessonHint: false, seenLessons: new Set()
  };

  const trainingData = window.CHESS_TRAINING_DATA;
  const puzzles = trainingData.tactics;
  const categoryMeta = {
    fork: { title: "Gabel", concept: "Eine Figur greift zwei Ziele gleichzeitig an. Besonders stark ist eine Gabel mit Schach.", rule: "Suche Felder, von denen eine Figur zwei wertvolle Ziele gleichzeitig erreicht." },
    pin: { title: "Fesselung", concept: "Eine Figur kann nicht wegziehen, weil sie sonst König oder eine wertvollere Figur freigibt.", rule: "Folge Linien von Turm, Läufer und Dame bis zum gegnerischen König." },
    skewer: { title: "Spieß", concept: "Die wertvollere Figur steht vorn und muss ausweichen; die Figur dahinter geht anschließend verloren.", rule: "Gib dem vorderen Ziel Schach und prüfe, was dahinter ungeschützt bleibt." },
    discovered: { title: "Abzugsangriff", concept: "Eine Figur zieht mit Tempo weg und öffnet dadurch die Angriffslinie einer zweiten Figur.", rule: "Prüfe, welche eigenen Figuren Linien blockieren und mit Schach abziehen können." }
  };
  const basicsLessons = [
    { title: "Das Ziel des Spiels", fen: E.START_FEN, text: "Du gewinnst nicht durch das Schlagen aller Figuren, sondern durch Schachmatt gegen den gegnerischen König.", points: ["Schach: Der König wird angegriffen.", "Matt: Der König ist angegriffen und kann nicht entkommen.", "Der eigene König darf niemals im Schach stehen bleiben."] },
    { title: "So arbeiten die Figuren", fen: E.START_FEN, text: "Jede Figur bewegt sich anders. Für den Anfang reicht es, ihre Aufgaben grob zu kennen.", points: ["Dame und Türme wirken auf geraden Linien.", "Läufer ziehen diagonal, Springer springen in L-Form.", "Bauern ziehen vorwärts und schlagen diagonal."] },
    { title: "Schach, Matt und Patt", fen: "6k1/6pp/7Q/8/8/2B5/8/6K1 w - - 0 1", text: "Vor jedem Zug prüfst du zuerst, ob ein König angegriffen ist und welche Fluchtfelder bleiben.", points: ["Ein Schach muss sofort beantwortet werden.", "Beim Matt gibt es keine legale Antwort.", "Patt ist remis: kein legaler Zug, aber kein Schach."] },
    { title: "Dein Plan für die ersten Züge", fen: E.START_FEN, text: "Du musst keine langen Varianten auswendig lernen. Halte dich zunächst an drei einfache Regeln.", points: ["Besetze das Zentrum mit einem Bauern.", "Entwickle Springer und Läufer.", "Rochiere früh und bringe den König in Sicherheit."] }
  ];

  function $(selector) { return document.querySelector(selector); }
  function all(selector) { return [...document.querySelectorAll(selector)]; }
  function clearMatchHint() {
    state.hintRequest += 1;
    state.matchHint = null;
    state.hintThinking = false;
    const box = $("#matchHint");
    if (box) box.hidden = true;
  }
  function cancelLessonTimer() {
    window.clearTimeout(state.lessonTimer); state.lessonTimer = null;
    state.lessonPlaying = false; state.thinking = false;
  }
  function beginPositionSession() {
    if (state.lesson && (state.lesson.ply > 0 || state.lesson.assisted)) state.seenLessons.add(exposureKey(state.lesson));
    cancelLessonTimer(); clearMatchHint(); state.sessionId += 1; state.thinking = false; state.lesson = null;
    const dialog = $("#promotionDialog");
    if (dialog.open) dialog.close("cancel");
  }
  function isLessonMode() { return ["tactics", "openings"].includes(state.mode) && state.lesson; }
  function lessonKey() { return `${state.mode}:${state.lesson.record.id}`; }
  function exposureKey(session = state.lesson) { return `${session.record.category ? 'tactics' : 'openings'}:${session.record.id}:${session.scenario.id}`; }
  function startLesson(record, options = {}) {
    const previous = state.lesson;
    const phase = options.phase || previous?.phase || $("#lessonPhase").value;
    const scenario = options.scenario || "main";
    const previouslyAssisted = previous?.record.id === record.id && previous.scenario.id === scenario && (previous.assisted || previous.ply > 0 || previous.phase === "demo" || previous.phase === "guided");
    beginPositionSession();
    state.lesson = T.createLessonSession(E, record, { phase, scenario });
    const stored = getProgress().lessons[lessonKey()];
    const seenCompletion = stored?.revision === state.lesson.lesson.revision && Object.keys(stored.completions || {}).some((key) => key.startsWith(`${state.lesson.scenario.id}:`) && !key.includes(':explain:'));
    if (phase === "practice" && (previouslyAssisted || seenCompletion || state.seenLessons.has(exposureKey()))) state.lesson.assisted = true;
    if (["demo", "guided"].includes(phase)) state.seenLessons.add(exposureKey());
    state.lessonHint = false;
    $("#lessonPhase").value = phase;
    const select = $("#lessonScenario"); select.innerHTML = "";
    for (const item of state.lesson.lesson.scenarios) {
      const option = document.createElement("option"); option.value = item.id; option.textContent = item.title; select.appendChild(option);
    }
    select.value = state.lesson.scenario.id;
    state.messageOverride = null; state.puzzleSolved = false;
    syncLesson(); render(); scheduleLesson();
  }
  function syncLesson() {
    const session = state.lesson;
    state.game = session.game; state.selected = null; state.legal = [];
    state.lastMove = session.game.history.at(-1)?.move || null;
    state.moves = session.game.history.map((entry) => ({ color: E.fromFEN(entry.fen).turn, san: E.notation(E.fromFEN(entry.fen), entry.move) }));
    state.puzzleSolved = session.ply === session.scenario.line.length;
    state.openingPly = session.ply;
    $("#playerDetail").textContent = `Lernfarbe: ${session.learnerSide === "w" ? "Weiß" : "Schwarz"} · ${session.scenario.title}`;
  }
  function scheduleLesson() {
    if (!isLessonMode()) return;
    const session = state.lesson, view = T.getLessonView(session);
    if (view.status !== "awaiting-auto" || (session.phase === "demo" && !state.lessonPlaying)) return;
    const token = { sessionId: state.sessionId, runId: session.runId, scenario: session.scenario.id, phase: session.phase, ply: session.ply, fen: view.fen };
    window.clearTimeout(state.lessonTimer);
    state.thinking = session.phase !== "demo"; render();
    state.lessonTimer = window.setTimeout(() => {
      if (!isLessonMode() || state.sessionId !== token.sessionId || state.lesson.runId !== token.runId || state.lesson.scenario.id !== token.scenario || state.lesson.phase !== token.phase || state.lesson.ply !== token.ply || E.toFEN(state.game) !== token.fen) return;
      state.lessonTimer = null; state.thinking = false;
      lessonAdvance();
    }, session.phase === "demo" ? 1600 : 900);
  }
  function finishLesson(result) {
    if (!result.completion) return;
    const event = result.completion, saved = getProgress(), key = lessonKey();
    const item = saved.lessons[key];
    const entry = item && typeof item === 'object' && item.revision === event.revision ? item : { revision: event.revision, completions: {}, errors: item?.errors || 0, openError: item?.openError || saved.puzzles[state.lesson.record.id]?.openError };
    entry.completions = entry.completions && typeof entry.completions === 'object' ? entry.completions : {};
    const completionKey = `${event.scenario}:${event.phase}:${event.assisted ? "assisted" : "independent"}`;
    entry.completions[completionKey] = (Number(entry.completions[completionKey]) || 0) + 1;
    entry.last = { scenario: event.scenario, phase: event.phase, date: localDate(), assisted: event.assisted };
    entry.errors = Number(entry.errors) || 0;
    T.setLessonReviewState(entry, event.scenario, event.mistakes > 0);
    if (state.mode === 'tactics') {
      const puzzle = saved.puzzles[state.lesson.record.id];
      if (puzzle) puzzle.openError = entry.openError;
    }
    saved.lessons[key] = entry; saveProgress(saved);
    state.seenLessons.add(exposureKey());
    if (event.scored) {
      if (state.mode === "tactics") recordPuzzleAttempt(event.mistakes === 0);
      else updateLearningRating("openings", event.mistakes === 0 ? 1 : 0, state.lesson.record.rating);
    }
    cancelLessonTimer();
  }
  function lessonAdvance(assistance = false) {
    if (!isLessonMode()) return;
    const result = T.advanceLesson(state.lesson, assistance);
    if (result.needsHelp) {
      state.messageOverride = { kind: "", title: "Dein Zug wird nicht übersprungen", text: "Ziehe selbst. Mit „Hinweis und Pfeil“ kannst du ausdrücklich Unterstützung anfordern." }; render(); return;
    }
    if (result.correct) { state.messageOverride = null; state.lessonHint = false; syncLesson(); finishLesson(result); render(); scheduleLesson(); }
  }
  function lessonHelp() {
    if (!isLessonMode()) return;
    const session = state.lesson, view = T.getLessonView(session);
    if (!view.step) return;
    session.assisted = true; state.seenLessons.add(exposureKey()); state.lessonHint = true;
    state.messageOverride = { kind: "", title: "Unterstützter Versuch", text: `${view.step.before} ${view.step.after}` }; render();
  }
  function renderLesson() {
    $("#lessonControls").hidden = !isLessonMode();
    const svg = $("#lessonArrows"); svg.innerHTML = ""; svg.setAttribute('hidden', '');
    $("#arrowDescriptions").textContent = '';
    if (!isLessonMode()) return;
    const session = state.lesson, view = T.getLessonView(session);
    const visible = session.phase !== "practice" || state.lessonHint || view.status === "complete";
    const hideSolution = session.phase === 'practice' && !visible;
    $("#lessonGoal").textContent = hideSolution ? `${session.scenario.title}: Finde die Zugfolge zum trainierten Motiv oder Eröffnungsplan.` : session.scenario.purpose;
    if (state.mode === 'tactics') {
      const record = session.record;
      $("#conceptTitle").textContent = hideSolution ? categoryMeta[record.category].title : record.title;
      $("#puzzlePrompt").textContent = hideSolution ? 'Spiele die vollständige trainierte Folge.' : record.prompt;
    }
    if (state.mode === 'openings') {
      $("#openingIdeas").hidden = hideSolution;
      $("#openingWarning").hidden = hideSolution;
    }
    document.querySelector('.lesson-card').hidden = hideSolution;
    $("#lessonIntro").textContent = session.lesson.intro;
    $("#lessonIntro").hidden = session.phase === "practice" && !visible;
    $("#lessonProgress").textContent = `${view.ply} / ${view.total} Halbzüge`;
    $("#lessonState").textContent = view.status === "complete" ? "ABGESCHLOSSEN" : view.status === "awaiting-user" ? "DEIN ZUG" : view.status === "awaiting-auto" ? "GEGNER / VORFÜHRUNG" : "ERKLÄREN";
    $("#lessonExplanation").textContent = view.status === "invalid-data" ? session.errors.join('\n') : view.status === "complete" ? session.scenario.outcome : session.phase === "explain" ? `${session.lesson.intro}\n${session.scenario.purpose}\nWähle Vorführen, Geführt oder Selbst üben, um die Folge zu beginnen.` : visible ? `${view.previous ? `Vorheriger Schritt: ${view.previous.before}\n${view.previous.after}\n\n` : ''}Nächster Schritt: ${view.step.before}\n${view.step.after}` : `${session.game.turn === session.learnerSide ? 'Finde deinen nächsten Zug' : 'Kuratierte Gegnerantwort folgt'}. Das Szenarioziel steht oben. Hinweise werden als Unterstützung markiert.`;
    $("#lessonAssistance").textContent = session.phase === 'demo' || session.phase === 'explain' ? 'Keine Wertung in Erklärung oder Vorführung.' : session.assisted ? 'Unterstützt / Wiederholung – keine Lern-Elo und kein Tageszielpunkt.' : session.phase === 'guided' ? 'Geführt – separater Abschluss, keine Lern-Elo.' : 'Selbstständiger Versuch – Wertung erst nach der ganzen Folge.';
    const entry = getProgress().lessons[lessonKey()];
    $("#lessonSaved").textContent = entry?.revision === session.lesson.revision ? `Gespeicherte Abschlüsse dieser Revision: ${Object.values(entry.completions || {}).reduce((sum, n) => sum + (Number(n) || 0), 0)}` : 'Für diese Lernrevision noch kein vollständiger Abschluss. Alte Erfolge bleiben in der Statistik erhalten.';
    $("#lessonPrevious").disabled = !view.ply || view.status === 'invalid-data';
    $("#lessonNext").disabled = ['complete', 'explaining', 'invalid-data'].includes(view.status);
    $("#lessonPlay").disabled = session.phase !== 'demo' || view.status === 'complete' || view.status === 'invalid-data';
    $("#lessonPlay").textContent = state.lessonPlaying ? 'Pause' : 'Abspielen';
    $("#lessonPlay").setAttribute('aria-pressed', String(state.lessonPlaying));
    $("#lessonHelp").disabled = !view.step || view.status === 'invalid-data';
    $("#arrowLegend").hidden = !visible;
    $("#revealSolution").disabled = !view.step;
    if (state.mode === "openings") $("#openingLineProgress").textContent = `${view.ply} / ${view.total} Halbzüge · ${session.scenario.title}`;
    if (!visible) return;
    const step = view.step || view.previous;
    const arrows = step?.visual?.arrows || [];
    if (!arrows.length) return;
    const ns = 'http://www.w3.org/2000/svg';
    const makeSvg = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); return el; };
    const colors = { move: '#e7b65d', attack: '#ee6457', defense: '#329de2', counter: '#be83ef' };
    const defs = makeSvg('defs', {}); svg.appendChild(defs);
    for (const [index, arrow] of arrows.entries()) {
      const color = colors[arrow.kind] || colors.move;
      const id = `lesson-arrow-${index}`;
      const marker = makeSvg('marker', { id, markerWidth: 4, markerHeight: 4, refX: 3, refY: 2, orient: 'auto', markerUnits: 'strokeWidth' });
      marker.appendChild(makeSvg('path', { d: 'M0,0 L4,2 L0,4 Z', fill: color })); defs.appendChild(marker);
      const from = T.arrowPoint(E, arrow.from, view.flipped), to = T.arrowPoint(E, arrow.to, view.flipped);
      const line = makeSvg('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: color, 'stroke-width': .095, 'stroke-opacity': .86, 'marker-end': `url(#${id})` });
      if (arrow.kind !== 'move') line.setAttribute('stroke-dasharray', '.18 .08');
      const title = makeSvg('title', {}); title.textContent = arrow.label; line.appendChild(title); svg.appendChild(line);
      const label = makeSvg('text', { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - .12, 'text-anchor': 'middle' }); label.textContent = `${index + 1}`; svg.appendChild(label);
    }
    $("#arrowDescriptions").textContent = arrows.map((a, index) => `${index + 1}. ${a.label}: ${a.from} → ${a.to}`).join(' · ');
    svg.setAttribute('aria-label', arrows.map((a) => `${a.label}, ${a.from} nach ${a.to}`).join('; ')); svg.removeAttribute('hidden');
  }

  function render() {
    const currentStatus = E.gameStatus(state.game);
    if (state.mode === "match" && currentStatus.over) recordMatchResult(currentStatus);
    renderBoard();
    renderMoves();
    renderStatus();
    renderLesson();
    const interactiveBoard = !["home", "learn", "basics", "strategy"].includes(state.mode);
    $("#whiteTurn").classList.toggle("active", interactiveBoard && state.game.turn === "w" && !state.thinking);
    $("#blackTurn").classList.toggle("active", interactiveBoard && state.game.turn === "b");
    $("#thinking").hidden = !state.thinking;
    const hasOwnMatchMove = state.moves.some((move) => move.color === state.playerColor);
    $("#undoButton").disabled = !state.game.history.length || state.thinking || !["match", "practice"].includes(state.mode) || (state.mode === "match" && !hasOwnMatchMove);
    renderMatchHintControls();
    renderMatchRating();
    if (state.mode === "match" && currentStatus.over) renderCoachReview();
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    const checkColor = E.inCheck(state.game, state.game.turn) ? state.game.turn : null;
    const flipped = isLessonMode() ? state.lesson.learnerSide === 'b' : state.mode === "match" && state.playerColor === "b";
    boardEl.setAttribute('aria-label', `Schachbrett, ${flipped ? 'Schwarz' : 'Weiß'} unten`);
    for (let viewRow = 0; viewRow < 8; viewRow++) for (let viewCol = 0; viewCol < 8; viewCol++) {
      const r = flipped ? 7 - viewRow : viewRow;
      const c = flipped ? 7 - viewCol : viewCol;
      const squareName = E.sq(r, c);
      const piece = state.game.board[r][c];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "square" + ((r + c) % 2 ? " dark-square" : "");
      button.dataset.square = squareName;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${squareName}${piece ? ", " + pieceName(piece) : ", leer"}`);
      if (state.selected === squareName) button.classList.add("selected");
      const candidate = state.legal.find((move) => move.to === squareName);
      if (candidate) button.classList.add("legal", candidate.capture ? "capture" : "quiet");
      if (state.mode !== "match" && state.lastMove && (state.lastMove.from === squareName || state.lastMove.to === squareName)) button.classList.add("last-move");
      if (state.mode === "match" && state.opponentLastMove) {
        if (state.opponentLastMove.from === squareName) button.classList.add("opponent-last-from");
        if (state.opponentLastMove.to === squareName) button.classList.add("opponent-last-to");
      }
      if (state.mode === "match" && state.matchHint?.move) {
        if (state.matchHint.move.from === squareName) button.classList.add("hint-from");
        if (state.matchHint.move.to === squareName) button.classList.add("hint-to");
      }
      if (state.mode === "tactics" && (!isLessonMode() || state.lesson.phase !== 'practice' || state.lessonHint)) {
        const anchors = puzzles[state.puzzleIndex]?.anchors;
        if (anchors?.pieces.includes(squareName)) button.classList.add("training-piece");
        if (state.solutionFrom === squareName) button.classList.add("solution-from");
        if (state.solutionTo === squareName) button.classList.add("solution-to", "training-target");
      }
      if (piece && E.typeOf(piece) === "k" && E.colorOf(piece) === checkColor) button.classList.add("in-check");
      if (piece) button.innerHTML = `<span class="piece" aria-hidden="true">${glyph[piece]}</span>`;
      if (viewCol === 0) button.insertAdjacentHTML("beforeend", `<span class="coord rank" aria-hidden="true">${8 - r}</span>`);
      if (viewRow === 7) button.insertAdjacentHTML("beforeend", `<span class="coord file" aria-hidden="true">${"abcdefgh"[c]}</span>`);
      button.addEventListener("click", () => selectSquare(squareName));
      boardEl.appendChild(button);
    }
  }

  function pieceName(piece) {
    const names = { k: "König", q: "Dame", r: "Turm", b: "Läufer", n: "Springer", p: "Bauer" };
    return `${E.colorOf(piece) === "w" ? "weißer" : "schwarzer"} ${names[E.typeOf(piece)]}`;
  }

  async function selectSquare(square) {
    if (state.thinking || E.gameStatus(state.game).over) return;
    if (["home", "learn", "basics"].includes(state.mode)) return;
    if (state.mode === "tactics" && state.puzzleSolved) return;
    if (state.mode === "strategy" || (state.mode === "endgame" && (state.endgameFailed || state.game.turn === "b"))) return;
    if (isLessonMode() && T.getLessonView(state.lesson).status !== 'awaiting-user') return;
    if (state.mode === "match" && state.game.turn !== state.playerColor) return;
    const [r, c] = E.coords(square);
    const piece = state.game.board[r][c];
    const targetMoves = state.legal.filter((move) => move.to === square);
    if (state.selected && targetMoves.length) {
      let move = targetMoves[0];
      if (targetMoves.some((m) => m.promotion)) {
        const token = { sessionId: state.sessionId, fen: E.toFEN(state.game), lesson: state.lesson, ply: state.lesson?.ply };
        const promotion = await choosePromotion();
        if (!promotion || state.sessionId !== token.sessionId || E.toFEN(state.game) !== token.fen || state.lesson !== token.lesson || state.lesson?.ply !== token.ply) return;
        move = E.legalMoves(state.game).find((m) => m.from === move.from && m.to === move.to && m.promotion === promotion);
        if (!move) return;
      }
      makeMove(move, "human");
      return;
    }
    if (piece && E.colorOf(piece) === state.game.turn) {
      state.selected = square;
      state.legal = E.legalMoves(state.game, square);
    } else {
      state.selected = null;
      state.legal = [];
    }
    render();
  }

  function choosePromotion() {
    return new Promise((resolve) => {
      const dialog = $("#promotionDialog");
      dialog.returnValue = "";
      const onClose = () => { dialog.removeEventListener("close", onClose); resolve(['q', 'r', 'b', 'n'].includes(dialog.returnValue) ? dialog.returnValue : null); };
      dialog.addEventListener("close", onClose);
      dialog.showModal();
    });
  }

  function makeMove(move, actor) {
    clearMatchHint();
    if (isLessonMode()) {
      const result = T.submitLessonMove(state.lesson, move);
      state.selected = null; state.legal = [];
      if (!result.correct) {
        state.messageOverride = { kind: 'error', title: result.illegal ? 'Nicht legal' : 'Zug und Folge vergleichen', text: result.feedback || 'Jetzt ist kein Schülerzug vorgesehen.' };
        if (!result.blocked && !result.illegal) {
          const saved = getProgress(), key = lessonKey();
          const entry = saved.lessons[key] && typeof saved.lessons[key] === 'object' ? saved.lessons[key] : { revision: state.lesson.lesson.revision, completions: {}, openError: saved.puzzles[state.lesson.record.id]?.openError };
          entry.errors = (Number(entry.errors) || 0) + 1;
          T.setLessonReviewState(entry, state.lesson.scenario.id, true); saved.lessons[key] = entry;
          if (state.mode === 'tactics') {
            const item = saved.puzzles[state.lesson.record.id] ||= { attempts: 0, successes: 0, errors: 0 };
            item.errors++; item.openError = true;
          }
          saveProgress(saved);
        }
        render(); return;
      }
      state.messageOverride = null; state.lessonHint = false;
      syncLesson(); finishLesson(result); render(); scheduleLesson(); return;
    }
    const before = state.game;
    const san = E.notation(before, move);
    state.game = E.applyMove(before, move);
    state.moves.push({
      color: before.turn,
      san,
      whiteMaterialBefore: T.materialFor(E, before, "w"),
      whiteMaterialAfter: T.materialFor(E, state.game, "w"),
      playerMaterialBefore: T.materialFor(E, before, state.playerColor),
      playerMaterialAfter: T.materialFor(E, state.game, state.playerColor)
    });
    state.lastMove = move;
    if (state.mode === "match" && actor === "ai") state.opponentLastMove = move;
    state.selected = null;
    state.legal = [];
    state.messageOverride = null;

    if (state.mode === "endgame") {
      if (actor === "human") {
        const review = T.reviewEndgameMove(E, before, state.game, state.endgameId, move);
        state.messageOverride = { kind: review.ok ? "success" : "error", title: review.title, text: review.text };
        if (!review.ok) {
          state.game = before; state.moves.pop(); state.lastMove = null; state.endgameFailed = true;
          updateLearningRating("endgame", 0, state.endgameId === "pawn-opposition" ? 900 : 800);
          animateBoard("wrong-shake"); render(); return;
        }
        if (review.complete) { updateLearningRating("endgame", 1, state.endgameId === "pawn-opposition" ? 900 : 800); animateBoard("correct-flash"); render(); return; }
        render(); requestEndgameDefense(); return;
      }
      render();
      return;
    }

    render();
    if (state.mode === "match" && !E.gameStatus(state.game).over && state.game.turn !== state.playerColor) requestAiMove();
  }

  function animateBoard(className) {
    boardEl.classList.remove(className);
    void boardEl.offsetWidth;
    boardEl.classList.add(className);
    window.setTimeout(() => boardEl.classList.remove(className), 2100);
  }

  function requestEndgameDefense() {
    const sessionId = state.sessionId;
    const expectedFen = E.toFEN(state.game);
    state.thinking = true; render();
    window.setTimeout(() => {
      if (state.sessionId !== sessionId || state.mode !== "endgame" || E.toFEN(state.game) !== expectedFen) return;
      const move = T.chooseEndgameDefense(E, state.game, state.endgameId);
      state.thinking = false;
      if (move) makeMove(move, "defense"); else render();
    }, 420);
  }

  function requestAiMove() {
    const sessionId = state.sessionId;
    const expectedFen = E.toFEN(state.game);
    state.thinking = true;
    render();
    const config = E.difficultyConfig(state.level);
    const delay = 140 + Math.min(260, Math.round(config.timeMs / 4));
    window.setTimeout(() => {
      if (state.sessionId !== sessionId || state.mode !== "match" || E.toFEN(state.game) !== expectedFen) return;
      const move = E.chooseMove(state.game, state.level);
      state.thinking = false;
      if (move) makeMove(move, "ai"); else render();
    }, delay);
  }

  function renderMatchHintControls() {
    const button = $("#matchHintButton");
    if (!button) return;
    const status = E.gameStatus(state.game);
    const available = state.mode === "match" && state.game.turn === state.playerColor && !state.thinking && !status.over;
    button.disabled = !available || state.hintThinking;
    button.querySelector("strong").textContent = state.hintThinking ? "Stellung wird analysiert …" : state.matchHint ? "Neuen Hinweis berechnen" : "Zughilfe anfordern";
    button.querySelector("small").textContent = state.hintThinking ? "Der Coach prüft legale Kandidaten" : "Analysiert deine aktuelle Stellung";
  }

  function requestMatchHint() {
    if (state.mode !== "match" || state.thinking || state.hintThinking || state.game.turn !== state.playerColor || E.gameStatus(state.game).over) return;
    const expectedFen = E.toFEN(state.game);
    const sessionId = state.sessionId;
    const requestId = ++state.hintRequest;
    state.hintThinking = true;
    state.matchHint = null;
    $("#matchHint").hidden = false;
    $("#matchHintMove").textContent = "…";
    $("#matchHintText").textContent = "Ich vergleiche die legalen Züge und ihre besten Antworten.";
    $("#matchHintMeta").textContent = "Die Berechnung läuft vollständig lokal im Browser.";
    render();

    window.setTimeout(() => {
      if (requestId !== state.hintRequest || sessionId !== state.sessionId || state.mode !== "match" || E.toFEN(state.game) !== expectedFen) return;
      const analysis = E.analyzePosition(state.game, { depth: 6, timeMs: 1400, quiescence: 3, multiPv: 3 });
      if (requestId !== state.hintRequest || E.toFEN(state.game) !== expectedFen) return;
      state.hintThinking = false;
      if (!analysis.move) { clearMatchHint(); render(); return; }
      const notation = E.notation(state.game, analysis.move);
      state.matchHint = { move: analysis.move, notation };
      $("#matchHintMove").textContent = `${notation} · ${analysis.move.from} → ${analysis.move.to}`;
      $("#matchHintText").textContent = explainHintMove(state.game, analysis.move);
      const alternatives = analysis.alternatives.slice(1).map((item) => E.notation(state.game, item.move));
      const evaluation = describeEvaluation(analysis.score, state.game.turn);
      $("#matchHintMeta").textContent = `${evaluation} · Tiefe ${analysis.depth || 1}${alternatives.length ? ` · Ebenfalls geprüft: ${alternatives.join(", ")}` : ""}`;
      render();
    }, 30);
  }

  function explainHintMove(position, move) {
    const [fr, fc] = E.coords(move.from);
    const piece = position.board[fr][fc];
    const names = { k: "König", q: "Dame", r: "Turm", b: "Läufer", n: "Springer", p: "Bauer" };
    const capturedNames = { k: "den gegnerischen König", q: "die gegnerische Dame", r: "den gegnerischen Turm", b: "den gegnerischen Läufer", n: "den gegnerischen Springer", p: "einen gegnerischen Bauern" };
    const promotionNames = { q: "eine Dame", r: "einen Turm", b: "einen Läufer", n: "einen Springer" };
    const after = E.applyMove(position, move, false);
    const result = E.gameStatus(after);
    if (result.type === "checkmate") return "Dieser Zug setzt sofort schachmatt.";
    if (move.promotion) return `Der Bauer wird auf ${move.to} in ${promotionNames[move.promotion]} umgewandelt${move.capture ? " und gewinnt dabei Material" : ""}.`;
    if (move.castle) return "Die Rochade bringt deinen König in Sicherheit und aktiviert gleichzeitig den Turm.";
    if (move.capture) {
      const captured = capturedNames[E.typeOf(move.capture)];
      return `${names[E.typeOf(piece)]} schlägt auf ${move.to} ${captured}${E.inCheck(after, after.turn) ? " und gibt dabei Schach" : ""}.`;
    }
    if (E.inCheck(after, after.turn)) return `${names[E.typeOf(piece)]} zieht nach ${move.to} und zwingt den Gegner mit Schach zu einer Antwort.`;
    if (E.inCheck(position, position.turn)) return `Dieser Zug beantwortet das Schach und bringt deinen König aus der Gefahr.`;
    if (["d4", "d5", "e4", "e5"].includes(move.to)) return `Der ${names[E.typeOf(piece)]} besetzt auf ${move.to} ein wichtiges Zentrumfeld und erhöht die Aktivität.`;
    if (["n", "b"].includes(E.typeOf(piece)) && (move.from[1] === "1" || move.from[1] === "8")) return `Der ${names[E.typeOf(piece)]} wird entwickelt und greift von ${move.to} aktiver ins Spiel ein.`;
    return `Der ${names[E.typeOf(piece)]} verbessert auf ${move.to} seine Stellung. Die Engine bewertet diesen Zug gegen die stärksten gefundenen Antworten am besten.`;
  }

  function describeEvaluation(score, color) {
    if (!Number.isFinite(score)) return "Stellung bewertet";
    const ownScore = (color === "w" ? score : -score) / 100;
    if (Math.abs(score) > 90000) return ownScore > 0 ? "Entscheidender Vorteil" : "Nur-Zug gegen entscheidenden Nachteil";
    if (ownScore >= 1.5) return `Deutlicher Vorteil (+${ownScore.toFixed(1)})`;
    if (ownScore >= .45) return `Leichter Vorteil (+${ownScore.toFixed(1)})`;
    if (ownScore <= -1.5) return `Schwierige Stellung (${ownScore.toFixed(1)})`;
    if (ownScore <= -.45) return `Leichter Nachteil (${ownScore.toFixed(1)})`;
    return `Ausgeglichene Stellung (${ownScore >= 0 ? "+" : ""}${ownScore.toFixed(1)})`;
  }

  function renderStatus() {
    const status = E.gameStatus(state.game);
    statusCard.className = "status-card";
    let title, text, kind = "";
    if (state.messageOverride) ({ title, text, kind } = state.messageOverride);
    else if (isLessonMode()) {
      const view = T.getLessonView(state.lesson);
      title = view.status === 'complete' ? 'Ganze Lehrfolge abgeschlossen' : view.status === 'awaiting-user' ? 'Dein nächster Zug' : view.status === 'explaining' ? 'Motiv und Voraussetzungen' : 'Kuratierte Lehrantwort';
      text = view.status === 'complete' ? state.lesson.scenario.outcome : view.status === 'awaiting-user' ? `Du trainierst ${state.lesson.learnerSide === 'w' ? 'Weiß' : 'Schwarz'}. ${state.lesson.scenario.purpose}` : view.status === 'explaining' ? 'Wähle eine Lernphase. Das Brett zeigt die Ausgangsstellung dieses Szenarios.' : 'Eine hinterlegte Antwort, keine Behauptung einer universell besten Verteidigung.';
      kind = view.status === 'complete' ? 'success' : '';
    }
    else if (status.type === "checkmate") {
      const playerWon = status.winner === state.playerColor;
      title = state.mode === "match" ? (playerWon ? "Schachmatt – du gewinnst" : "Schachmatt – Computer gewinnt") : "Schachmatt";
      text = `${status.winner === "w" ? "Weiß" : "Schwarz"} gewinnt die Partie.`;
      kind = state.mode === "match" ? (playerWon ? "success" : "error") : "success";
    }
    else if (status.type === "stalemate") { title = "Patt – kein Schach"; text = "Die Materialüberzahl reicht nicht: Der Gegner hat keinen legalen Zug, sein König ist aber nicht angegriffen. Für Matt muss dein letzter Zug zugleich Schach geben."; }
    else if (status.type === "fiftyMove") { title = "Remis"; text = "50-Züge-Regel: 100 Halbzüge ohne Bauernzug oder Schlagzug."; }
    else if (status.type === "repetition") { title = "Remis"; text = "Dieselbe Stellung ist dreimal entstanden."; }
    else if (status.type === "insufficient") { title = "Remis"; text = "Mit diesem Material ist kein Matt mehr möglich."; }
    else if (state.thinking) { title = "Die KI rechnet"; text = "Sie prüft legale Antworten auf deinen letzten Zug."; }
    else if (status.check) { title = "Schach!"; text = state.mode === "match" ? `${state.game.turn === state.playerColor ? "Dein König" : "Der gegnerische König"} ist angegriffen.` : `${state.game.turn === "w" ? "Der weiße" : "Der schwarze"} König ist angegriffen.`; kind = "error"; }
    else if (state.mode === "tactics" && state.puzzleSolved) { title = "Aufgabe gelöst"; text = "Sehr gut erkannt. Nimm das Motiv mit in deine nächste Partie."; kind = "success"; }
    else if (state.mode === "match") { title = state.game.turn === state.playerColor ? "Du bist am Zug" : "KI ist am Zug"; text = state.game.turn === state.playerColor ? "Wähle eine Figur und danach eines der markierten Zielfelder." : "Dein Trainingspartner berechnet seinen Zug."; }
    else { title = state.game.turn === "w" ? "Weiß ist am Zug" : "Schwarz ist am Zug"; text = "Wähle eine Figur und danach eines der markierten Zielfelder."; }
    if (state.mode === "match" && status.over && state.matchResult) {
      const change = state.matchResult.change;
      text += ` Deine Spiel-Elo ${change > 0 ? "steigt" : change < 0 ? "fällt" : "bleibt unverändert"}${change ? ` um ${Math.abs(change)} Punkte` : ""} auf ${state.matchResult.rating}.`;
    }
    if (kind) statusCard.classList.add(kind);
    $("#statusTitle").textContent = title;
    $("#statusText").textContent = text;
    $("#statusIcon").textContent = kind === "success" ? "◆" : kind === "error" ? "!" : "●";
  }

  function renderMoves() {
    const list = $("#moveList");
    if (!state.moves.length) { list.innerHTML = '<p class="empty-state">Noch keine Züge gespielt.</p>'; return; }
    list.innerHTML = "";
    const firstFen = state.game.history[0]?.fen;
    const initialFullmove = firstFen ? E.fromFEN(firstFen).fullmove : 1;
    for (const row of T.moveRows(state.moves, initialFullmove)) {
      const number = document.createElement("span"); number.className = "move-number"; number.textContent = `${row.number}.`;
      const white = document.createElement("span"); white.className = "move-cell"; white.textContent = row.white;
      const black = document.createElement("span"); black.className = "move-cell"; black.textContent = row.black;
      list.append(number, white, black);
    }
    list.scrollTop = list.scrollHeight;
  }

  function switchMode(mode) {
    state.mode = mode;
    const learningModes = ["basics", "tactics", "endgame", "strategy", "openings"];
    const navigationMode = learningModes.includes(mode) ? "learn" : mode;
    all(".mode-tab").forEach((button) => button.classList.toggle("active", button.dataset.mode === navigationMode));
    $("#homeControls").hidden = mode !== "home";
    $("#learnControls").hidden = mode !== "learn";
    $("#basicsControls").hidden = mode !== "basics";
    $("#matchControls").hidden = mode !== "match";
    $("#tacticsControls").hidden = mode !== "tactics";
    $("#endgameControls").hidden = mode !== "endgame";
    $("#strategyControls").hidden = mode !== "strategy";
    $("#openingControls").hidden = mode !== "openings";
    $("#practiceControls").hidden = mode !== "practice";
    $("#trainingStats").hidden = mode !== "tactics";
    $("#learningBack").hidden = !learningModes.includes(mode);
    document.querySelector(".moves-section").hidden = ["home", "learn", "basics"].includes(mode);
    document.querySelector(".lesson-card").hidden = ["home", "learn"].includes(mode);
    $("#opponentAvatar").textContent = mode === "match" ? "KI" : mode === "practice" ? "AN" : ["home", "learn"].includes(mode) ? "LOS" : "LE";
    $("#opponentName").textContent = mode === "match" ? "Trainingspartner" : mode === "practice" ? "Analysebrett" : ["home", "learn"].includes(mode) ? "Dein Lernbrett" : "Lerneinheit";
    $("#opponentDetail").textContent = mode === "match" ? `${E.difficultyConfig(state.level).name} · Elo ${E.difficultyConfig(state.level).rating}` : mode === "tactics" ? "Muster erkennen · Zug berechnen" : mode === "endgame" ? "Technik gegen beste Verteidigung" : mode === "strategy" ? "Verstehen, bevor du ziehst" : mode === "openings" ? "Zugfolge und Pläne lernen" : mode === "home" ? "Hier beginnt dein Training" : mode === "learn" ? "Wähle dein nächstes Lernziel" : "Varianten ohne Zeitdruck";
    $("#playerDetail").textContent = ["home", "learn"].includes(mode) ? "Dein Tempo · ohne Zeitdruck" : mode === "basics" ? "Erst verstehen, dann ziehen" : mode === "strategy" ? "Wähle eine Antwort im Lernpanel" : mode === "openings" ? `Du spielst ${trainingData.openings[state.openingIndex].side === "w" ? "Weiß" : "Schwarz"}` : mode === "match" ? `Du spielst ${state.playerColor === "w" ? "Weiß" : "Schwarz"}` : "Weiß · konzentriert";
    const copy = {
      home: ["WILLKOMMEN", "Schach lernen – Schritt für Schritt.", "Du brauchst kein Vorwissen. Die Werkstatt zeigt dir immer, was als Nächstes sinnvoll ist."],
      learn: ["DEIN LERNWEG", "Was möchtest du heute lernen?", "Jeder Bereich erklärt zuerst die Idee und lässt dich danach selbst auf dem Brett üben."],
      basics: ["GRUNDLAGEN", "Schach ohne Vorwissen.", "Vier kurze Schritte erklären dir das Spielziel, die Figuren und deinen ersten einfachen Plan."],
      match: ["TRANSFER IN DIE PARTIE", "Spiel mit Plan.", "Wende deine Muster in einer ruhigen Trainingspartie an."],
      tactics: ["DEIN TAGESPLAN", "Muster sehen. Besser spielen.", "Verstehe das Motiv, berechne den Zug und wiederhole gezielt deine Fehler."],
      endgame: ["ENDSPIEL-FUNDAMENTE", "Gewinnen mit Technik.", "Übe elementare Gewinnstellungen gegen eine regelbasierte Verteidigung."],
      strategy: ["DIE WARUM-EBENE", "Plane wie ein Meister.", "Entscheide an kritischen Stellen und verstehe Aktivität, Initiative und offene Linien."],
      openings: ["ERÖFFNUNGS-REPERTOIRE", "Verstehe den Aufbau.", "Lerne nicht nur Züge: Verbinde jede Variante mit ihren Plänen und typischen Fehlern."],
      practice: ["ANALYSETRAINING", "Stellungen verstehen.", "Prüfe Material, Königssicherheit und Bauernstruktur, bevor du Varianten ziehst."]
    }[mode];
    $("#panelEyebrow").textContent = copy[0]; $("#panelTitle").textContent = copy[1]; $("#panelIntro").textContent = copy[2];
    if (mode === "tactics") loadPuzzle(state.puzzlePosition);
    else if (mode === "basics") loadBasics(state.basicsStep);
    else if (mode === "endgame") loadEndgame($("#endgameSelect").value);
    else if (mode === "strategy") loadStrategyStep(state.strategyStep);
    else if (mode === "openings") loadOpening($("#openingSelect").value || trainingData.openings[0].id);
    else if (["home", "learn"].includes(mode)) {
      beginPositionSession();
      state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.selected = null; state.legal = []; state.thinking = false;
      state.messageOverride = mode === "home" ? { kind: "", title: "Bereit für deine erste Einheit?", text: "Starte mit der Empfehlung. Es gibt keinen Zeitdruck und jeder Fehler wird erklärt." } : { kind: "", title: "Fünf Bausteine für gutes Schach", text: "Beginne ohne Vorwissen bei den Grundlagen. Danach folgen Taktik, Eröffnungen, Endspiel und Strategie." };
      updateHomeRecommendation(); render();
    }
    else resetGame();
  }

  function resetGame() {
    beginPositionSession();
    if (state.mode === "match") state.playerColor = state.colorChoice === "random" ? (Math.random() < .5 ? "w" : "b") : state.colorChoice;
    state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = null; state.puzzleSolved = false; state.thinking = false; state.matchRated = false; state.matchResult = null;
    $("#lessonText").textContent = state.mode === "practice" ? "Prüfe zuerst Material, Königssicherheit und Bauernstruktur – erst danach einzelne Varianten." : "Entwickle zuerst deine Figuren, bringe den König in Sicherheit und kämpfe dann um das Zentrum.";
    $("#fenInput").value = E.START_FEN;
    $("#coachReview").hidden = true;
    render();
    if (state.mode === "match") {
      $("#playerDetail").textContent = `Du spielst ${state.playerColor === "w" ? "Weiß" : "Schwarz"}`;
      $("#opponentDetail").textContent = `${E.difficultyConfig(state.level).name} · Elo ${E.difficultyConfig(state.level).rating} · spielt ${state.playerColor === "w" ? "Schwarz" : "Weiß"}`;
      if (state.game.turn !== state.playerColor) requestAiMove();
    }
  }

  function loadBasics(index) {
    beginPositionSession();
    state.basicsStep = Math.max(0, Math.min(basicsLessons.length - 1, index));
    const lesson = basicsLessons[state.basicsStep];
    state.game = E.fromFEN(lesson.fen); state.moves = []; state.lastMove = null; state.selected = null; state.legal = []; state.thinking = false;
    state.messageOverride = { kind: "", title: lesson.title, text: lesson.text };
    $("#basicsProgress").textContent = `${state.basicsStep + 1} / ${basicsLessons.length}`;
    $("#basicsTitle").textContent = lesson.title; $("#basicsText").textContent = lesson.text;
    $("#basicsPoints").innerHTML = lesson.points.map((point) => `<li>${point}</li>`).join("");
    $("#nextBasics").textContent = state.basicsStep === basicsLessons.length - 1 ? "Grundlagen abschließen" : "Weiter";
    $("#lessonText").textContent = lesson.points[0]; render();
  }

  function advanceBasics() {
    if (state.basicsStep < basicsLessons.length - 1) { loadBasics(state.basicsStep + 1); return; }
    const saved = getProgress(); saved.basicsCompleted = true;
    saveProgress(saved);
    state.basicsStep = 0; updateHomeRecommendation(); switchMode("learn");
  }

  function loadEndgame(id) {
    beginPositionSession();
    const lesson = trainingData.endgames.find((item) => item.id === id) || trainingData.endgames[0];
    state.endgameId = lesson.id; state.endgameFailed = false; state.thinking = false;
    state.game = E.fromFEN(lesson.fen); state.moves = []; state.lastMove = null; state.selected = null; state.legal = [];
    state.messageOverride = { kind: "", title: "Dein Ziel", text: lesson.goal };
    $("#endgameTitle").textContent = lesson.title; $("#endgameGoal").textContent = lesson.goal;
    $("#endgameTips").innerHTML = lesson.tips.map((tip) => `<li>${tip}</li>`).join("");
    $("#lessonText").textContent = lesson.tips[0];
    render();
  }

  function loadStrategyStep(index) {
    beginPositionSession();
    const steps = trainingData.masterclass.steps;
    state.strategyStep = (index + steps.length) % steps.length; state.strategySolved = false;
    const step = steps[state.strategyStep];
    state.game = E.fromFEN(step.fen); state.moves = []; state.lastMove = null; state.selected = null; state.legal = []; state.messageOverride = null;
    $("#strategyTitle").textContent = trainingData.masterclass.title;
    $("#strategyProgress").textContent = `${state.strategyStep + 1} / ${steps.length}`;
    $("#strategyQuestion").textContent = step.question;
    $("#strategyFeedback").textContent = trainingData.masterclass.intro;
    $("#nextStrategy").disabled = true;
    $("#nextStrategy").textContent = state.strategyStep === steps.length - 1 ? "Masterclass neu starten" : "Partie fortsetzen";
    const choices = $("#strategyChoices"); choices.innerHTML = "";
    step.choices.forEach((choice) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "strategy-choice"; button.textContent = choice.label;
      button.addEventListener("click", () => chooseStrategy(choice, button)); choices.appendChild(button);
    });
    $("#lessonText").textContent = "Aktive Züge verbessern deine schlechteste Figur, gewinnen Raum oder besetzen eine offene Linie.";
    render();
  }

  function chooseStrategy(choice, button) {
    if (state.strategySolved) return;
    if (choice.kind !== "correct") {
      button.classList.add("incorrect"); button.disabled = true; $("#strategyFeedback").textContent = choice.text;
      updateLearningRating("strategy", 0, 850 + state.strategyStep * 100); animateBoard("wrong-shake"); return;
    }
    state.strategySolved = true; button.classList.add("correct");
    all(".strategy-choice").forEach((item) => { item.disabled = true; });
    $("#strategyFeedback").textContent = choice.text;
    state.game = E.fromFEN(trainingData.masterclass.steps[state.strategyStep].nextFen);
    updateLearningRating("strategy", 1, 850 + state.strategyStep * 100);
    $("#nextStrategy").disabled = false; animateBoard("correct-flash"); render();
  }

  function populateOpeningSelect() {
    const select = $("#openingSelect"); select.innerHTML = "";
    for (const [side, label] of [["w", "Mit Weiß"], ["b", "Mit Schwarz"]]) {
      const group = document.createElement("optgroup"); group.label = label;
      trainingData.openings.forEach((opening) => {
        if (opening.side !== side) return;
        const option = document.createElement("option"); option.value = opening.id; option.textContent = `${opening.eco} · ${opening.name}`; group.appendChild(option);
      });
      select.appendChild(group);
    }
  }

  function loadOpening(id) {
    const index = trainingData.openings.findIndex((opening) => opening.id === id);
    state.openingIndex = index >= 0 ? index : 0; state.openingPly = 0; state.openingErrors = 0;
    state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.selected = null; state.legal = []; state.messageOverride = null; state.thinking = false;
    const opening = trainingData.openings[state.openingIndex];
    $("#openingSelect").value = opening.id; $("#openingTitle").textContent = opening.name; $("#openingEco").textContent = opening.eco;
    $("#openingSide").textContent = `Training mit ${opening.side === "w" ? "Weiß" : "Schwarz"}`;
    $("#openingIdeas").innerHTML = opening.ideas.map((idea) => `<li>${idea}</li>`).join("");
    $("#openingWarning").textContent = `Typischer Fehler: ${opening.warning}`;
    $("#openingProgress").textContent = `${state.openingIndex + 1} / ${trainingData.openings.length}`;
    $("#lessonText").textContent = opening.ideas[0];
    startLesson(opening);
  }

  function loadPuzzle(index) {
    const reviewEmpty = $("#themeFilter")?.value === "review" && !puzzles.some((puzzle) => getProgress().puzzles?.[puzzle.id]?.openError);
    const pool = currentPuzzlePool();
    state.puzzlePosition = (index + pool.length) % pool.length;
    const puzzle = pool[state.puzzlePosition];
    state.puzzleIndex = puzzles.indexOf(puzzle);
    state.game = E.fromFEN(puzzle.fen); state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = reviewEmpty ? { kind: "success", title: "Noch keine Fehler offen", text: "Stark! Bis hierhin gibt es keine Fehlversuche. Du trainierst deshalb weiter im gemischten Modus." } : null; state.puzzleSolved = false; state.attemptsOnPuzzle = 0; state.solutionFrom = null; state.solutionTo = null;
    $("#puzzleTheme").textContent = categoryMeta[puzzle.category].title; $("#puzzleProgress").textContent = `${state.puzzlePosition + 1} / ${pool.length}`;
    $("#conceptTitle").textContent = puzzle.title; $("#conceptText").textContent = categoryMeta[puzzle.category].concept;
    $("#puzzlePrompt").textContent = puzzle.prompt; $("#puzzleDescription").textContent = "Trainiere die gesamte Lehrfolge einschließlich gegnerischer Antworten. Wähle unten Phase und Szenario."; $("#lessonText").textContent = categoryMeta[puzzle.category].rule;
    $("#nextPuzzle").textContent = "Nächste Aufgabe";
    $("#revealSolution").disabled = false; $("#revealSolution").textContent = "Nächsten Zug zeigen · unterstützt";
    updateTrainingProgress();
    startLesson(puzzle);
  }

  function localDate() {
    return new Date().toLocaleDateString("sv-SE");
  }

  let memoryProgress = null;
  function getProgress() {
    if (memoryProgress) return T.normalizeProgress(JSON.parse(JSON.stringify(memoryProgress)));
    try { return T.normalizeProgress(JSON.parse(localStorage.getItem("schachwerkstatt-progress") || "{}")); }
    catch { $("#storageWarning").hidden = false; return T.normalizeProgress({}); }
  }
  function saveProgress(saved) {
    memoryProgress = T.normalizeProgress(saved);
    try { localStorage.setItem("schachwerkstatt-progress", JSON.stringify(memoryProgress)); }
    catch { $("#storageWarning").hidden = false; }
  }

  function getMatchStats(saved = getProgress()) {
    const fallback = { rating: 800, games: 0, wins: 0, draws: 0, losses: 0, best: 800, lastChange: 0, history: [] };
    const stats = saved.matchElo || fallback;
    for (const key of ["rating", "games", "wins", "draws", "losses", "best", "lastChange"]) {
      if (!Number.isFinite(stats[key])) stats[key] = fallback[key];
    }
    if (!Array.isArray(stats.history)) stats.history = [];
    return stats;
  }

  function recordMatchResult(status) {
    if (state.matchRated || !status.over) return;
    const score = status.winner === state.playerColor ? 1 : status.winner ? 0 : .5;
    const saved = getProgress();
    const stats = getMatchStats(saved);
    const opponent = E.difficultyConfig(state.level);
    const before = stats.rating;
    const result = T.calculateMatchElo(before, opponent.rating, score, stats.games);
    stats.rating = result.rating;
    stats.games += 1;
    stats.wins += score === 1 ? 1 : 0;
    stats.draws += score === .5 ? 1 : 0;
    stats.losses += score === 0 ? 1 : 0;
    stats.best = Math.max(stats.best, stats.rating);
    stats.lastChange = result.change;
    stats.history.push({ date: localDate(), rating: stats.rating, change: result.change, opponent: opponent.rating, result: score });
    stats.history = stats.history.slice(-30);
    saved.matchElo = stats;
    saveProgress(saved);
    state.matchRated = true;
    state.matchResult = { score, change: result.change, rating: result.rating, opponent: opponent.rating };
  }

  function recommendedDifficultyIndex(rating) {
    let bestIndex = 0;
    for (let index = 1; index < difficulties.length; index++) {
      if (Math.abs(difficulties[index].rating - rating) < Math.abs(difficulties[bestIndex].rating - rating)) bestIndex = index;
    }
    return bestIndex;
  }

  function renderMatchRating() {
    const stats = getMatchStats();
    $("#matchElo").textContent = stats.rating;
    $("#matchGames").textContent = stats.games;
    $("#matchWins").textContent = stats.wins;
    $("#matchDraws").textContent = stats.draws;
    $("#matchLosses").textContent = stats.losses;
    const trend = state.matchResult?.change ?? stats.lastChange;
    $("#matchEloTrend").textContent = stats.games ? `${trend > 0 ? "+" : ""}${trend} zuletzt · Bestwert ${stats.best}` : "Noch keine gewertete Partie";

    const recommendation = recommendedDifficultyIndex(stats.rating);
    const recommended = difficulties[recommendation];
    const button = $("#recommendedDifficulty");
    const selected = E.difficultyConfig(state.level);
    button.dataset.index = recommendation + 1;
    button.disabled = selected.id === recommended.id;
    button.textContent = button.disabled ? `✓ Passend zu deiner Elo: ${recommended.name} (${recommended.rating})` : `Empfohlen: ${recommended.name} · Elo ${recommended.rating}`;
  }

  function currentPuzzlePool() {
    const filter = $("#themeFilter")?.value || "all";
    if (filter === "all") return puzzles;
    if (filter === "review") {
      const progress = getProgress();
      const review = puzzles.filter((puzzle) => progress.puzzles?.[puzzle.id]?.openError);
      return review.length ? review : puzzles;
    }
    return puzzles.filter((puzzle) => puzzle.category === filter);
  }

  function recordPuzzleAttempt(success) {
    const saved = getProgress();
    const today = localDate();
    if (saved.date !== today) { saved.date = today; saved.count = 0; }
    saved.totalAttempts = (saved.totalAttempts || 0) + 1;
    saved.totalSolved = (saved.totalSolved || 0) + (success ? 1 : 0);
    if (success) saved.count = (saved.count || 0) + 1;
    saved.puzzles ||= {};
    saved.themes ||= {};
    const puzzle = puzzles[state.puzzleIndex];
    const item = saved.puzzles[puzzle.id] ||= { attempts: 0, successes: 0, errors: 0 };
    item.attempts += 1; item.successes += success ? 1 : 0; item.lastSeen = today;
    item.openError = saved.lessons[`tactics:${puzzle.id}`]?.openError ?? !success;
    const theme = saved.themes[puzzle.category] ||= { attempts: 0, successes: 0 };
    theme.attempts += 1; theme.successes += success ? 1 : 0;
    saveProgress(saved);
    const challenge = { fork: 650, pin: 750, skewer: 850, discovered: 900 }[puzzle.category];
    updateLearningRating("tactics", success ? 1 : 0, challenge);
    updateTrainingProgress();
  }

  function updateTrainingProgress() {
    const saved = getProgress();
    const todayCount = saved.date === localDate() ? (saved.count || 0) : 0;
    const attempts = saved.totalAttempts || 0;
    const solved = saved.totalSolved || 0;
    const accuracy = attempts ? Math.round(solved / attempts * 100) : 0;
    const weakKey = Object.entries(saved.themes || {}).sort((a, b) => (a[1].successes / a[1].attempts) - (b[1].successes / b[1].attempts))[0]?.[0];
    const weak = categoryMeta[weakKey]?.title || "–";
    $("#dailyProgressText").textContent = `${todayCount} / 5 Aufgaben`;
    $("#dailyProgressBar").style.width = `${Math.min(100, todayCount / 5 * 100)}%`;
    $("#masteryScore").textContent = `${accuracy}%`;
    $("#solvedTotal").textContent = solved;
    $("#weakTheme").textContent = weak;
    updateRatingDisplay();
  }

  function getRatings(saved = getProgress()) {
    saved.ratings ||= { tactics: 800, endgame: 800, strategy: 800, openings: 800 };
    for (const area of ["tactics", "endgame", "strategy", "openings"]) if (!Number.isFinite(saved.ratings[area])) saved.ratings[area] = 800;
    return saved.ratings;
  }

  function updateLearningRating(area, score, challengeRating) {
    const saved = getProgress(); const ratings = getRatings(saved);
    ratings[area] = T.updateRating(ratings[area], score, challengeRating);
    saveProgress(saved);
    updateRatingDisplay();
  }

  function updateRatingDisplay() {
    const ratings = getRatings();
    const overall = Math.round((ratings.tactics + ratings.endgame + ratings.strategy + ratings.openings) / 4);
    const stage = T.ratingStage(overall);
    $("#learningRating").textContent = overall; $("#learningLevel").textContent = stage.name;
    $("#ratingOverall").textContent = overall; $("#ratingStage").textContent = `Aufbaustufe ${stage.name}`;
    $("#ratingBar").style.width = `${Math.round(stage.progress * 100)}%`;
    $("#ratingTactics").textContent = ratings.tactics; $("#ratingEndgame").textContent = ratings.endgame;
    $("#ratingStrategy").textContent = ratings.strategy; $("#ratingOpenings").textContent = ratings.openings;
    $("#menuRatingTactics").textContent = ratings.tactics; $("#menuRatingEndgame").textContent = ratings.endgame;
    $("#menuRatingStrategy").textContent = ratings.strategy; $("#menuRatingOpenings").textContent = ratings.openings;
    $("#ratingNext").textContent = stage.next ? `Noch ${stage.next.min - overall} Punkte bis zur Stufe ${stage.next.name}.` : "Höchste Aufbaustufe erreicht.";
    updateHomeRecommendation();
  }

  function updateHomeRecommendation() {
    const saved = getProgress(); const ratings = getRatings(saved);
    const order = ["tactics", "openings", "endgame", "strategy"];
    const target = saved.basicsCompleted ? order.reduce((weakest, area) => ratings[area] < ratings[weakest] ? area : weakest, order[0]) : "basics";
    const recommendations = {
      basics: ["Schach von Anfang an", "Beginne mit Spielziel, Figuren, Schach und Matt. Dafür brauchst du keinerlei Vorwissen."],
      tactics: ["Taktische Grundlagen", "Lerne zuerst, wie du Figuren mit Gabeln, Fesselungen und Spießen gewinnst."],
      openings: ["Gut in die Partie starten", "Übe eine kurze Eröffnungsfolge und verstehe den Plan hinter den Zügen."],
      endgame: ["Partien sicher beenden", "Trainiere Mattsetzen und die Opposition im Bauernendspiel."],
      strategy: ["Einen guten Plan finden", "Vergleiche typische Entscheidungen aus einer berühmten Meisterpartie."]
    };
    $("#homeRecommendation").textContent = recommendations[target][0];
    $("#homeRecommendationText").textContent = recommendations[target][1];
    $("#continueLearning").dataset.target = target;
    $("#menuBasics").textContent = saved.basicsCompleted ? "Erledigt" : "Start";
  }

  function setDifficulty(index, restart = false) {
    const levelIndex = Math.max(0, Math.min(difficulties.length - 1, Number(index) - 1));
    const config = difficulties[levelIndex]; state.level = config.id;
    const stats = getMatchStats();
    const win = T.calculateMatchElo(stats.rating, config.rating, 1, stats.games);
    const loss = T.calculateMatchElo(stats.rating, config.rating, 0, stats.games);
    $("#difficulty").value = levelIndex + 1;
    $("#difficultyName").textContent = `Stufe ${levelIndex + 1} · ${config.name}`;
    $("#difficultyDepth").textContent = `Computer-Elo ${config.rating}`;
    $("#difficultyDescription").textContent = `${config.description} Gegen diese Stufe: Sieg ${win.change >= 0 ? "+" : ""}${win.change}, Niederlage ${loss.change}.`;
    if (state.mode === "match") $("#opponentDetail").textContent = `${config.name} · Elo ${config.rating}`;
    renderMatchRating();
    if (restart) resetGame();
  }

  function setColorChoice(choice) {
    if (!["w", "b", "random"].includes(choice)) return;
    state.colorChoice = choice;
    all("[data-color]").forEach((button) => {
      const active = button.dataset.color === choice;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
    });
    resetGame();
  }

  all(".mode-tab").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
  all("[data-learning-mode]").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.learningMode)));
  $("#learningBack").addEventListener("click", () => switchMode("learn"));
  $("#continueLearning").addEventListener("click", (event) => switchMode(event.currentTarget.dataset.target || "tactics"));
  $("#nextBasics").addEventListener("click", advanceBasics);
  $("#difficulty").addEventListener("input", (event) => setDifficulty(event.target.value));
  $("#difficulty").addEventListener("change", (event) => setDifficulty(event.target.value, true));
  all("[data-color]").forEach((button) => button.addEventListener("click", () => setColorChoice(button.dataset.color)));
  $("#recommendedDifficulty").addEventListener("click", (event) => setDifficulty(event.currentTarget.dataset.index, true));
  $("#newGame").addEventListener("click", resetGame);
  $("#matchHintButton").addEventListener("click", requestMatchHint);
  $("#nextPuzzle").addEventListener("click", () => loadPuzzle(state.puzzlePosition + 1));
  $("#hintButton").addEventListener("click", lessonHelp);
  $("#revealSolution").addEventListener("click", lessonHelp);
  $("#lessonHelp").addEventListener("click", lessonHelp);
  $("#lessonPhase").addEventListener("change", (event) => { if (isLessonMode()) startLesson(state.lesson.record, { phase: event.target.value, scenario: state.lesson.scenario.id }); });
  $("#lessonScenario").addEventListener("change", (event) => { if (isLessonMode()) startLesson(state.lesson.record, { scenario: event.target.value }); });
  $("#lessonPrevious").addEventListener("click", () => {
    if (!isLessonMode()) return;
    cancelLessonTimer(); state.sessionId++;
    T.seekLesson(state.lesson, state.lesson.ply - 1);
    state.lessonHint = false; state.messageOverride = null; syncLesson(); render();
    scheduleLesson();
  });
  $("#lessonNext").addEventListener("click", () => { cancelLessonTimer(); lessonAdvance(); });
  $("#lessonRestart").addEventListener("click", () => {
    if (!isLessonMode()) return;
    startLesson(state.lesson.record, { scenario: state.lesson.scenario.id });
  });
  $("#lessonPlay").addEventListener("click", () => {
    if (!isLessonMode() || state.lesson.phase !== 'demo') return;
    if (state.lessonPlaying) cancelLessonTimer(); else { state.lessonPlaying = true; scheduleLesson(); }
    render();
  });
  $("#themeFilter").addEventListener("change", () => loadPuzzle(0));
  $("#endgameSelect").addEventListener("change", (event) => loadEndgame(event.target.value));
  $("#restartEndgame").addEventListener("click", () => loadEndgame(state.endgameId));
  $("#nextStrategy").addEventListener("click", () => loadStrategyStep(state.strategyStep + 1));
  $("#openingSelect").addEventListener("change", (event) => loadOpening(event.target.value));
  $("#restartOpening").addEventListener("click", () => loadOpening(trainingData.openings[state.openingIndex].id));
  function renderCoachReview() {
    const review = T.coachReview(state.moves, T.toPgn(state.moves), state.playerColor); const box = $("#coachReview"); box.hidden = false; box.innerHTML = "";
    const title = document.createElement("strong"); title.textContent = review.title;
    const summary = document.createElement("p"); summary.textContent = review.summary;
    box.append(title, summary);
  }
  $("#reviewGame").addEventListener("click", renderCoachReview);
  $("#loadStart").addEventListener("click", () => { $("#fenInput").value = E.START_FEN; loadFen(); });
  $("#loadFen").addEventListener("click", loadFen);
  $("#undoButton").addEventListener("click", () => {
    clearMatchHint();
    if (state.mode === "match") {
      let removedOwnMove = false;
      while (state.game.history.length && !removedOwnMove) {
        const removed = state.moves.pop();
        state.game = E.undo(state.game);
        removedOwnMove = removed?.color === state.playerColor;
      }
    } else {
      state.game = E.undo(state.game); state.moves.pop();
    }
    state.lastMove = state.game.history.at(-1)?.move || null;
    state.opponentLastMove = null;
    for (let i = state.game.history.length - 1; i >= 0; i--) {
      const entry = state.game.history[i];
      if (entry.piece && E.colorOf(entry.piece) !== state.playerColor) { state.opponentLastMove = entry.move; break; }
    }
    state.selected = null; state.legal = []; state.messageOverride = null; render();
  });

  function loadFen() {
    try {
      const parsed = E.fromFEN($("#fenInput").value.trim());
      if (!(E.inCheck(parsed, "w") && E.inCheck(parsed, "b")) && parsed.board.flat().filter((p) => p === "K").length === 1 && parsed.board.flat().filter((p) => p === "k").length === 1) {
        beginPositionSession();
        state.game = parsed; state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = { kind: "success", title: "Stellung geladen", text: `${parsed.turn === "w" ? "Weiß" : "Schwarz"} ist am Zug.` }; render();
      } else throw new Error();
    } catch { state.messageOverride = { kind: "error", title: "FEN nicht lesbar", text: "Prüfe die Stellung. Beide Könige müssen vorhanden sein und dürfen nicht gleichzeitig bedroht sein." }; render(); }
  }

  populateOpeningSelect(); setDifficulty(recommendedDifficultyIndex(getMatchStats().rating) + 1); updateTrainingProgress(); switchMode("home");
})();
