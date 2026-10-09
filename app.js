(function () {
  "use strict";

  const E = window.ChessEngine;
  const T = window.ChessTraining;
  const difficulties = E.DIFFICULTY_LEVELS;
  const glyph = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const boardEl = document.querySelector("#board");
  const board3dEl = document.querySelector("#board3d");
  const statusCard = document.querySelector(".status-card");
  const state = {
    game: E.fromFEN(), mode: "home", level: "learner", colorChoice: "w", playerColor: "w", selected: null,
    legal: [], lastMove: null, opponentLastMove: null, moves: [], thinking: false, puzzleIndex: 0, puzzlePosition: 0,
    puzzleSolved: false, attemptsOnPuzzle: 0, solutionFrom: null, solutionTo: null,
    endgameId: "ladder-mate", endgameFailed: false, strategyStep: 0, strategySolved: false,
    openingIndex: 0, openingPly: 0, openingErrors: 0, basicsStep: 0, sessionId: 0, messageOverride: null,
    matchHint: null, hintThinking: false, hintRequest: 0, matchRated: false, matchResult: null,
    personalMatchMistake: null, personalMatchPending: false, personalMatchCursor: 0, matchLearningId: "", liveAnalysisRequest: 0, liveAnalysisPending: 0,
    lesson: null, lessonTimer: null, lessonPlaying: false, lessonHint: false, seenLessons: new Set(),
    analysisRequest: 0, analysisRunning: false, gameAnalysis: [], reviewPosition: null, reviewMove: null,
    activeMistake: null, mistakeSolved: false, mistakeIndex: 0, mistakeHintStage: 0, mistakeHadError: false,
    mixed: { active: false, queue: [], index: 0, retryKeys: new Set() }, redoFrames: [], focusedSquare: "e2", markedSquares: new Set()
  };
  let analysisWorker = null, analysisJobId = 0;
  const analysisJobs = new Map();

  const trainingData = window.CHESS_TRAINING_DATA;
  const puzzles = trainingData.tactics;
  let boardView = "2d";
  try { boardView = new URLSearchParams(location.search).get("view") === "3d" || localStorage.getItem("schachwerkstatt-board-view") === "3d" ? "3d" : "2d"; } catch { boardView = "2d"; }
  const board3d = window.Chess3DView?.create(board3dEl, {
    onSquare: (square) => selectSquare(square),
    onDragStart: (from) => {
      if (!boardInputAllowed()) return;
      state.selected = from; state.legal = E.legalMoves(state.game, from); render();
    },
    onDrop: (from, to) => {
      if (!boardInputAllowed()) return;
      state.selected = from; state.legal = E.legalMoves(state.game, from); selectSquare(to);
    }
  }) || null;
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
  function analyzeInBackground(position, options) {
    const fen = E.toFEN(position);
    if (typeof Worker !== "undefined" && !analysisWorker) {
      try {
        analysisWorker = new Worker("analysis-worker.js");
        analysisWorker.addEventListener("message", (event) => {
          const job = analysisJobs.get(event.data.id);
          if (!job) return;
          analysisJobs.delete(event.data.id);
          if (event.data.error) job.reject(new Error(event.data.error)); else job.resolve(event.data.analysis);
        });
        analysisWorker.addEventListener("error", () => {
          analysisWorker?.terminate(); analysisWorker = null;
          for (const [id, job] of analysisJobs) {
            analysisJobs.delete(id);
            window.setTimeout(() => job.resolve(E.analyzePosition(E.fromFEN(job.fen), job.options)), 0);
          }
        });
      } catch { analysisWorker = null; }
    }
    if (!analysisWorker) return new Promise((resolve) => window.setTimeout(() => resolve(E.analyzePosition(E.fromFEN(fen), options)), 20));
    return new Promise((resolve, reject) => {
      const id = ++analysisJobId;
      analysisJobs.set(id, { resolve, reject, fen, options });
      analysisWorker.postMessage({ id, fen, options });
    });
  }
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
  function cancelGameAnalysis() {
    state.analysisRequest += 1;
    state.analysisRunning = false;
    state.gameAnalysis = [];
    state.reviewPosition = null;
    state.reviewMove = null;
    const button = $("#reviewGame");
    if (button) { button.disabled = false; button.textContent = "Partie analysieren"; }
  }
  function beginPositionSession() {
    if (state.lesson && (state.lesson.ply > 0 || state.lesson.assisted)) state.seenLessons.add(exposureKey(state.lesson));
    cancelLessonTimer(); clearMatchHint(); cancelGameAnalysis(); state.sessionId += 1; state.liveAnalysisRequest += 1; state.liveAnalysisPending = 0; state.thinking = false; state.lesson = null;
    state.personalMatchMistake = null; state.personalMatchPending = false;
    state.markedSquares.clear(); state.activeMistake = null; state.mistakeSolved = false;
    state.redoFrames = [];
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
    else if (state.mode === "tactics" && event.phase === "practice") {
      const progress = getProgress();
      const review = progress.puzzles[state.lesson.record.id] ||= { attempts: 0, successes: 0, errors: 0 };
      T.scheduleReview(review, event.mistakes > 0 ? "failure" : "assisted", localDate());
      saveProgress(progress);
    }
    if (state.mixed.active && state.mixed.queue[state.mixed.index]?.type === "tactic" && event.phase === "practice") {
      if (event.mistakes > 0 || event.assisted) queueMixedRetry("tactic", state.lesson.record.id);
      $("#nextPuzzle").textContent = state.mixed.index + 1 < state.mixed.queue.length ? "Weiter in der Einheit" : "Einheit abschließen";
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
    if (!visible || boardView === "3d") return;
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
    $("#undoButton").disabled = !state.game.history.length || state.thinking || !["match", "practice"].includes(state.mode) || (state.mode === "match" && (!hasOwnMatchMove || currentStatus.over));
    $("#redoButton").disabled = !state.redoFrames.length || state.thinking || !["match", "practice"].includes(state.mode);
    renderMatchHintControls();
    renderMatchRating();
    if (state.mode === "match" && currentStatus.over) showCoachReviewSummary();
  }

  function setBoardView(view, persist = true) {
    boardView = view === "3d" && board3d ? "3d" : "2d";
    boardEl.hidden = boardView === "3d";
    board3dEl.hidden = boardView !== "3d";
    $("#view2d").classList.toggle("active", boardView === "2d"); $("#view2d").setAttribute("aria-pressed", String(boardView === "2d"));
    $("#view3d").classList.toggle("active", boardView === "3d"); $("#view3d").setAttribute("aria-pressed", String(boardView === "3d"));
    $("#view3d").disabled = !board3d;
    $("#board3dControls").hidden = boardView !== "3d";
    if (boardView !== "3d" && document.fullscreenElement === document.querySelector(".board-wrap")) document.exitFullscreen().catch(() => {});
    $("#boardHelp").textContent = boardView === "3d" ? "3D: Figuren ziehen · Drehen wechselt den Blickwinkel · Vollbild schafft mehr Platz · Esc beendet Vollbild" : "Ziehen: klicken oder Drag-and-drop · Markieren: Rechtsklick · Tastatur: Pfeile und Enter · Esc löscht Markierungen";
    if (persist) try { localStorage.setItem("schachwerkstatt-board-view", boardView); } catch { /* Ansicht funktioniert auch ohne Speicher. */ }
    renderBoard(); renderLesson();
  }

  function sync3DBoard(boardState, flipped) {
    if (!board3d) return;
    const highlights = {};
    for (const square of boardEl.querySelectorAll(".square")) highlights[square.dataset.square] = square.className;
    if (isLessonMode()) {
      const view = T.getLessonView(state.lesson), reveal = state.lesson.phase !== "practice" || state.lessonHint || view.status === "complete";
      if (reveal && view.expected) {
        const from = view.expected.slice(0, 2), to = view.expected.slice(2, 4);
        highlights[from] = `${highlights[from] || ""} hint-from`; highlights[to] = `${highlights[to] || ""} hint-to`;
      }
    }
    const movable = new Set();
    if (!state.reviewPosition && boardInputAllowed()) {
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const piece = boardState.board[r][c];
        if (piece && E.colorOf(piece) === boardState.turn) movable.add(E.sq(r, c));
      }
    }
    board3d.update({ board: boardState.board, flipped, highlights, movable });
  }

  function renderBoard() {
    const restoreBoardFocus = boardEl.contains(document.activeElement);
    boardEl.innerHTML = "";
    const boardState = state.reviewPosition || state.game;
    const checkColor = E.inCheck(boardState, boardState.turn) ? boardState.turn : null;
    const flipped = isLessonMode() ? state.lesson.learnerSide === 'b' : state.mode === "match" && state.playerColor === "b";
    boardEl.setAttribute('aria-label', `Schachbrett, ${flipped ? 'Schwarz' : 'Weiß'} unten`);
    for (let viewRow = 0; viewRow < 8; viewRow++) for (let viewCol = 0; viewCol < 8; viewCol++) {
      const r = flipped ? 7 - viewRow : viewRow;
      const c = flipped ? 7 - viewCol : viewCol;
      const squareName = E.sq(r, c);
      const piece = boardState.board[r][c];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "square" + ((r + c) % 2 ? " dark-square" : "");
      button.dataset.square = squareName;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${squareName}${piece ? ", " + pieceName(piece) : ", leer"}`);
      button.tabIndex = squareName === state.focusedSquare ? 0 : -1;
      if (!state.reviewPosition && state.selected === squareName) button.classList.add("selected");
      const candidate = state.reviewPosition ? null : state.legal.find((move) => move.to === squareName);
      if (candidate) button.classList.add("legal", candidate.capture ? "capture" : "quiet");
      if (!state.reviewPosition && state.mode !== "match" && state.lastMove && (state.lastMove.from === squareName || state.lastMove.to === squareName)) button.classList.add("last-move");
      if (!state.reviewPosition && state.mode === "match" && state.opponentLastMove) {
        if (state.opponentLastMove.from === squareName) button.classList.add("opponent-last-from");
        if (state.opponentLastMove.to === squareName) button.classList.add("opponent-last-to");
      }
      if (state.mode === "match" && state.matchHint?.move) {
        if (state.matchHint.stage >= 2 && state.matchHint.move.from === squareName) button.classList.add("hint-from");
        if (state.matchHint.stage >= 3 && state.matchHint.move.to === squareName) button.classList.add("hint-to");
      }
      if (state.reviewMove) {
        if (state.reviewMove.played.to === squareName) button.classList.add("review-played");
        if (state.reviewMove.best.from === squareName) button.classList.add("review-best-from");
        if (state.reviewMove.best.to === squareName) button.classList.add("review-best-to");
      }
      if (state.markedSquares.has(squareName)) button.classList.add("user-marked");
      if (state.mode === "tactics" && (!isLessonMode() || state.lesson.phase !== 'practice' || state.lessonHint)) {
        const anchors = puzzles[state.puzzleIndex]?.anchors;
        if (anchors?.pieces.includes(squareName)) button.classList.add("training-piece");
        if (state.solutionFrom === squareName) button.classList.add("solution-from");
        if (state.solutionTo === squareName) button.classList.add("solution-to", "training-target");
      }
      if (state.mode === "mistakes" && state.activeMistake && state.mistakeHintStage >= 2 && state.activeMistake.best.slice(0, 2) === squareName) button.classList.add("hint-from");
      if (state.mode === "mistakes" && state.activeMistake && state.mistakeHintStage >= 3 && state.activeMistake.best.slice(2, 4) === squareName) button.classList.add("hint-to");
      if (piece && E.typeOf(piece) === "k" && E.colorOf(piece) === checkColor) button.classList.add("in-check");
      if (piece) button.innerHTML = `<span class="piece" aria-hidden="true">${glyph[piece]}</span>`;
      if (viewCol === 0) button.insertAdjacentHTML("beforeend", `<span class="coord rank" aria-hidden="true">${8 - r}</span>`);
      if (viewRow === 7) button.insertAdjacentHTML("beforeend", `<span class="coord file" aria-hidden="true">${"abcdefgh"[c]}</span>`);
      button.addEventListener("click", () => selectSquare(squareName));
      button.addEventListener("keydown", (event) => handleBoardKey(event, squareName, flipped));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (state.markedSquares.has(squareName)) state.markedSquares.delete(squareName); else state.markedSquares.add(squareName);
        button.classList.toggle("user-marked", state.markedSquares.has(squareName));
      });
      if (piece && E.colorOf(piece) === boardState.turn && boardInputAllowed()) {
        button.draggable = true;
        button.addEventListener("dragstart", (event) => {
          if (state.thinking || E.gameStatus(state.game).over) { event.preventDefault(); return; }
          state.selected = squareName; state.legal = E.legalMoves(state.game, squareName);
          event.dataTransfer.setData("text/plain", squareName); event.dataTransfer.effectAllowed = "move";
          button.classList.add("dragging");
          for (const move of state.legal) boardEl.querySelector(`[data-square="${move.to}"]`)?.classList.add("drag-target");
        });
        button.addEventListener("dragend", () => renderBoard());
      }
      button.addEventListener("dragover", (event) => { if (state.legal.some((move) => move.to === squareName)) event.preventDefault(); });
      button.addEventListener("drop", async (event) => {
        event.preventDefault();
        const from = event.dataTransfer.getData("text/plain");
        if (!from) return;
        state.selected = from; state.legal = E.legalMoves(state.game, from);
        await selectSquare(squareName);
      });
      boardEl.appendChild(button);
    }
    sync3DBoard(boardState, flipped);
    if (restoreBoardFocus) boardEl.querySelector(`[data-square="${state.focusedSquare}"]`)?.focus();
  }

  function handleBoardKey(event, square, flipped) {
    if (event.key === "Escape") { state.markedSquares.clear(); state.selected = null; state.legal = []; renderBoard(); return; }
    if (["Enter", " "].includes(event.key)) { event.preventDefault(); selectSquare(square); return; }
    const directions = { ArrowUp: [flipped ? 1 : -1, 0], ArrowDown: [flipped ? -1 : 1, 0], ArrowLeft: [0, flipped ? 1 : -1], ArrowRight: [0, flipped ? -1 : 1] };
    if (!directions[event.key]) return;
    event.preventDefault();
    const [r, c] = E.coords(square), [dr, dc] = directions[event.key];
    const nr = Math.max(0, Math.min(7, r + dr)), nc = Math.max(0, Math.min(7, c + dc));
    state.focusedSquare = E.sq(nr, nc);
    boardEl.querySelector(`[data-square="${state.focusedSquare}"]`)?.focus();
  }

  function pieceName(piece) {
    const names = { K: "weißer König", Q: "weiße Dame", R: "weißer Turm", B: "weißer Läufer", N: "weißer Springer", P: "weißer Bauer", k: "schwarzer König", q: "schwarze Dame", r: "schwarzer Turm", b: "schwarzer Läufer", n: "schwarzer Springer", p: "schwarzer Bauer" };
    return names[piece];
  }

  async function selectSquare(square) {
    if (!boardInputAllowed()) return;
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

  function boardInputAllowed() {
    if (state.reviewPosition || state.thinking || E.gameStatus(state.game).over) return false;
    if (["home", "learn", "basics", "strategy"].includes(state.mode)) return false;
    if (state.mode === "tactics" && state.puzzleSolved) return false;
    if (state.mode === "mistakes" && (state.mistakeSolved || !state.activeMistake)) return false;
    if (state.mode === "endgame" && (state.endgameFailed || state.game.turn === "b")) return false;
    if (isLessonMode() && T.getLessonView(state.lesson).status !== "awaiting-user") return false;
    return state.mode !== "match" || state.game.turn === state.playerColor;
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
    state.redoFrames = [];
    const usedMatchHint = Boolean(state.matchHint?.stage >= 2);
    let personalFeedback = null;
    clearMatchHint(); state.markedSquares.clear();
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
          if (state.lesson.phase === "practice") {
            const correction = T.getLessonView(state.lesson).step;
            state.lesson.assisted = true; state.lessonHint = true; state.seenLessons.add(exposureKey());
            if (state.mixed.active && state.mode === "tactics") queueMixedRetry("tactic", state.lesson.record.id);
            state.messageOverride = { kind: "error", title: "Sofort korrigieren", text: `${result.feedback || "Der Zug gehört nicht zur trainierten Folge."} ${correction ? `Korrektur: ${correction.before} ${correction.after} Spiele jetzt den markierten Zug.` : "Führe jetzt die richtige Fortsetzung aus."}` };
          }
        }
        render(); return;
      }
      state.messageOverride = null; state.lessonHint = false;
      syncLesson(); finishLesson(result); render(); scheduleLesson(); return;
    }
    if (state.mode === "mistakes" && actor === "human" && state.activeMistake) {
      const played = move.from + move.to + (move.promotion || "");
      state.selected = null; state.legal = [];
      if (played !== state.activeMistake.best) {
        recordGameMistakeAttempt(false);
        state.mistakeHadError = true; state.mistakeHintStage = 3;
        queueMixedRetry("mistake", state.activeMistake.id);
        const correction = E.legalMoves(state.game).find((candidate) => candidate.from + candidate.to + (candidate.promotion || "") === state.activeMistake.best);
        state.messageOverride = { kind: "error", title: "Sofort korrigieren", text: `Der Zug löst den kritischen Punkt nicht. Spiele jetzt ${state.activeMistake.bestSan} (${correction?.from || state.activeMistake.best.slice(0, 2)} → ${correction?.to || state.activeMistake.best.slice(2, 4)}), damit sich das richtige Muster einprägt.${state.mixed.active ? " Die Stellung kommt am Ende der Einheit erneut." : " Sie bleibt heute zur Wiederholung fällig."}` };
        $("#mistakeHint").textContent = "Korrekturzug ist markiert";
        animateBoard("wrong-shake"); render(); return;
      }
      const before = state.game;
      state.game = E.applyMove(before, move); state.lastMove = move; state.moves = [{ color: before.turn, san: E.notation(before, move) }];
      const assisted = state.mistakeHintStage > 0 || state.mistakeHadError;
      state.mistakeSolved = true; recordGameMistakeAttempt(true, assisted);
      state.messageOverride = { kind: "success", title: assisted ? "Mit Hinweis gelöst" : "Fehler selbstständig korrigiert", text: `Richtig: ${E.notation(before, move)}. ${state.activeMistake.explanation}${assisted ? " Löse die Stellung später ohne Hinweis, damit sie als beherrscht gilt." : ""}` };
      $("#mistakeSchedule").textContent = assisted ? "Heute erneut fällig · erst ein selbstständiger Abruf vergrößert den Abstand." : `Nächste Wiederholung: ${T.reviewDueLabel(state.activeMistake, localDate())} · Stufe ${state.activeMistake.reviewStage}`;
      $("#mistakeExplanation").hidden = false; $("#mistakeExplanation").textContent = state.activeMistake.explanation;
      $("#nextMistake").disabled = false; $("#nextMistake").textContent = state.mixed.active ? "Weiter in der Einheit" : "Nächster Fehler"; animateBoard("correct-flash"); render(); return;
    }
    if (state.mode === "match" && actor === "human" && state.personalMatchPending && state.personalMatchMistake) {
      const expected = state.personalMatchMistake.best;
      const played = move.from + move.to + (move.promotion || "");
      if (played !== expected) {
        updateStoredMistakeReview(state.personalMatchMistake.id, "failure");
        const bestMove = E.legalMoves(state.game).find((candidate) => candidate.from + candidate.to + (candidate.promotion || "") === expected);
        if (bestMove) {
          state.matchHint = { move: bestMove, notation: state.personalMatchMistake.bestSan, analysis: { alternatives: [], score: E.evaluate(E.applyMove(state.game, bestMove, false)), depth: 0 }, fen: E.toFEN(state.game), stage: 3, sourceMistake: true };
          showMatchHint();
        }
        state.selected = null; state.legal = [];
        state.messageOverride = { kind: "error", title: "Dein alter Fehler ist wieder aufgetaucht", text: `Dieser Zug wiederholt das gespeicherte Problem. Führe jetzt ${state.personalMatchMistake.bestSan} aus; danach spielt der Trainingspartner die Partie weiter.` };
        animateBoard("wrong-shake"); render(); return;
      }
      updateStoredMistakeReview(state.personalMatchMistake.id, usedMatchHint ? "assisted" : "success");
      state.personalMatchPending = false;
      personalFeedback = { kind: "success", title: usedMatchHint ? "Mit Coach korrigiert" : "Alten Fehler selbstständig vermieden", text: `${state.personalMatchMistake.bestSan} ist richtig. Jetzt geht die Stellung als Übungspartie gegen den Computer weiter.` };
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
    state.messageOverride = personalFeedback;

    if (state.mode === "match" && actor === "human" && !personalFeedback) learnFromMatchMove(before, move, san);

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

  async function learnFromMatchMove(position, played, playedSan) {
    const request = state.liveAnalysisRequest, fen = E.toFEN(position);
    state.liveAnalysisPending += 1; updatePersonalCoachStatus();
    try {
      const analysis = await analyzeInBackground(position, { depth: 5, timeMs: 650, quiescence: 3, multiPv: 5 });
      if (request !== state.liveAnalysisRequest || !analysis.move) return;
      const playedResult = analysis.scoredMoves?.find((item) => sameMove(item.move, played));
      const bestResult = analysis.scoredMoves?.[0];
      if (!playedResult || !bestResult) return;
      const loss = position.turn === "w" ? bestResult.score - playedResult.score : playedResult.score - bestResult.score;
      const classification = T.classifyMoveLoss(Math.max(0, loss));
      if (!["mistake", "blunder"].includes(classification.id)) return;
      saveGameMistakes([{
        ply: position.history.length, fen, played, best: bestResult.move, playedSan,
        bestSan: E.notation(position, bestResult.move), loss: Math.max(0, loss), classification,
        depth: analysis.depth, evaluation: (state.playerColor === "w" ? playedResult.score : -playedResult.score) / 100
      }]);
    } catch {
      // Die Partie läuft weiter; die vollständige Abschlussanalyse bleibt als Rückfall erhalten.
    } finally {
      if (request === state.liveAnalysisRequest) state.liveAnalysisPending = Math.max(0, state.liveAnalysisPending - 1);
      updatePersonalCoachStatus();
    }
  }

  function renderMatchHintControls() {
    const button = $("#matchHintButton");
    if (!button) return;
    const status = E.gameStatus(state.game);
    const available = state.mode === "match" && state.game.turn === state.playerColor && !state.thinking && !status.over;
    button.disabled = !available || state.hintThinking;
    button.querySelector("strong").textContent = state.hintThinking ? "Stellung wird analysiert …" : state.matchHint?.stage < 3 ? "Konkreteren Hinweis zeigen" : state.matchHint ? "Analyse erneut anzeigen" : "Zughilfe anfordern";
    button.querySelector("small").textContent = state.hintThinking ? "Die Berechnung läuft im Hintergrund" : state.matchHint ? `Hilfestufe ${state.matchHint.stage} von 3` : "Erst Idee, dann Figur, zuletzt genauer Zug";
  }

  function preparePersonalMatchHint(stage = 1) {
    if (!state.personalMatchPending || !state.personalMatchMistake) return false;
    const move = E.legalMoves(state.game).find((candidate) => candidate.from + candidate.to + (candidate.promotion || "") === state.personalMatchMistake.best);
    if (!move) return false;
    state.matchHint = {
      move, notation: state.personalMatchMistake.bestSan || E.notation(state.game, move),
      analysis: { alternatives: [], score: E.evaluate(E.applyMove(state.game, move, false)), depth: 0 },
      fen: E.toFEN(state.game), stage, sourceMistake: true, automatic: stage === 1
    };
    $("#matchHint").hidden = false; showMatchHint(); renderMatchHintControls(); renderBoard();
    return true;
  }

  async function requestMatchHint() {
    if (state.mode !== "match" || state.thinking || state.hintThinking || state.game.turn !== state.playerColor || E.gameStatus(state.game).over) return;
    const expectedFen = E.toFEN(state.game);
    if (state.personalMatchPending && !state.matchHint && preparePersonalMatchHint(1)) { render(); return; }
    if (state.matchHint?.fen === expectedFen) {
      state.matchHint.stage = Math.min(3, state.matchHint.stage + 1);
      showMatchHint(); render(); return;
    }
    const sessionId = state.sessionId;
    const requestId = ++state.hintRequest;
    state.hintThinking = true;
    state.matchHint = null;
    $("#matchHint").hidden = false;
    $("#matchHintMove").textContent = "…";
    $("#matchHintText").textContent = "Ich vergleiche die legalen Züge und ihre besten Antworten.";
    $("#matchHintMeta").textContent = "Stärkere Suche im Hintergrund · vollständig lokal.";
    render();

    try {
      const analysis = await analyzeInBackground(state.game, { depth: 7, timeMs: 1800, quiescence: 3, multiPv: 3 });
      if (requestId !== state.hintRequest || sessionId !== state.sessionId || state.mode !== "match" || E.toFEN(state.game) !== expectedFen) return;
      state.hintThinking = false;
      if (!analysis.move) { clearMatchHint(); render(); return; }
      const notation = E.notation(state.game, analysis.move);
      state.matchHint = { move: analysis.move, notation, analysis, fen: expectedFen, stage: 1 };
      showMatchHint(); render();
    } catch {
      if (requestId !== state.hintRequest) return;
      state.hintThinking = false;
      $("#matchHintMove").textContent = "Analyse nicht verfügbar";
      $("#matchHintText").textContent = "Die Hintergrundanalyse konnte nicht abgeschlossen werden. Versuche es erneut.";
      render();
    }
  }

  function showMatchHint() {
    const hint = state.matchHint;
    if (!hint) return;
    const position = E.fromFEN(hint.fen);
    const [r, c] = E.coords(hint.move.from), piece = position.board[r][c];
    if (hint.stage === 1) {
      $("#matchHintMove").textContent = "1 · Idee";
      $("#matchHintText").textContent = explainHintPlan(position, hint.move);
      $("#matchHintMeta").textContent = "Denke selbst weiter. Der nächste Hinweis zeigt die Figur.";
    } else if (hint.stage === 2) {
      $("#matchHintMove").textContent = `2 · ${pieceName(piece)} auf ${hint.move.from}`;
      $("#matchHintText").textContent = `${explainHintPlan(position, hint.move)} Prüfe alle legalen Zielfelder dieser Figur und die stärkste gegnerische Antwort.`;
      $("#matchHintMeta").textContent = "Das Startfeld ist blau markiert. Der nächste Hinweis zeigt den ganzen Zug.";
    } else {
      const alternatives = hint.analysis.alternatives.slice(1).map((item) => E.notation(position, item.move));
      $("#matchHintMove").textContent = `3 · ${hint.notation} · ${hint.move.from} → ${hint.move.to}`;
      $("#matchHintText").textContent = explainHintMove(position, hint.move);
      $("#matchHintMeta").textContent = `${describeEvaluation(hint.analysis.score, position.turn)} · Tiefe ${hint.analysis.depth || 1}${alternatives.length ? ` · Alternativen: ${alternatives.join(", ")}` : ""}`;
    }
    if (hint.sourceMistake) {
      if (hint.stage === 1) $("#matchHintText").textContent = `Du hast diese Stellung früher falsch behandelt. ${$("#matchHintText").textContent}`;
      $("#matchHintMeta").textContent += hint.stage === 1 ? " · Dieser erste Denkanstoß zählt noch als selbstständiger Versuch." : " · Persönlicher Hinweis aus deinem Fehlerspeicher.";
    }
  }

  function explainHintPlan(position, move) {
    const after = E.applyMove(position, move, false);
    if (E.gameStatus(after).type === "checkmate") return "Suche zuerst nach einem unmittelbaren Matt: Schachgebot, Fluchtfelder und mögliche Abwehrzüge.";
    if (E.inCheck(position, position.turn)) return "Dein König steht im Schach. Vergleiche Königszug, Schlagen des Angreifers und Blockieren der Angriffslinie.";
    if (move.capture && E.inCheck(after, after.turn)) return "Ein zwingender Schlagzug mit Schach verbindet Materialgewinn und Initiative.";
    if (move.capture) return "Prüfe die Schlagzüge: Einer verbessert die Materialbilanz, ohne eine stärkere gegnerische Antwort zuzulassen.";
    if (move.castle) return "Königssicherheit und Figurenaktivität lassen sich hier mit einem einzigen Zug verbessern.";
    if (["d4", "d5", "e4", "e5"].includes(move.to)) return "Ein aktiver Zug ins Zentrum verbessert Raum, Kontrolle und die Zusammenarbeit deiner Figuren.";
    return "Verbessere zuerst die Aktivität deiner am wenigsten wirksamen Figur und prüfe danach gegnerische Schachs, Schläge und Drohungen.";
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
    else if (state.mode === "mistakes") { title = state.mistakeSolved ? "Stellung gelöst" : "Du bist am Zug"; text = state.mistakeSolved ? "Der bessere Zug ist jetzt in deinem persönlichen Fehlerspeicher verankert." : "Finde den stärksten Zug aus deiner früheren Partie."; kind = state.mistakeSolved ? "success" : ""; }
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
    const learningModes = ["basics", "tactics", "endgame", "strategy", "openings", "mistakes"];
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
    $("#mistakeControls").hidden = mode !== "mistakes";
    $("#practiceControls").hidden = mode !== "practice";
    $("#trainingStats").hidden = mode !== "tactics";
    $("#learningBack").hidden = !learningModes.includes(mode);
    document.querySelector(".moves-section").hidden = ["home", "learn", "basics"].includes(mode);
    document.querySelector(".lesson-card").hidden = ["home", "learn"].includes(mode);
    $("#opponentAvatar").textContent = mode === "match" ? "KI" : mode === "practice" ? "AN" : mode === "mistakes" ? "FE" : ["home", "learn"].includes(mode) ? "LOS" : "LE";
    $("#opponentName").textContent = mode === "match" ? "Trainingspartner" : mode === "practice" ? "Analysebrett" : mode === "mistakes" ? "Fehlertrainer" : ["home", "learn"].includes(mode) ? "Dein Lernbrett" : "Lerneinheit";
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
      mistakes: ["AUS DEINEN PARTIEN", "Fehler werden zu Training.", "Löse die kritischen Stellungen erneut, bis du den besseren Zug selbstständig findest."],
      practice: ["ANALYSETRAINING", "Stellungen verstehen.", "Prüfe Material, Königssicherheit und Bauernstruktur, bevor du Varianten ziehst."]
    }[mode];
    $("#panelEyebrow").textContent = copy[0]; $("#panelTitle").textContent = copy[1]; $("#panelIntro").textContent = copy[2];
    if (mode === "tactics") loadPuzzle(state.puzzlePosition);
    else if (mode === "basics") loadBasics(state.basicsStep);
    else if (mode === "endgame") loadEndgame($("#endgameSelect").value);
    else if (mode === "strategy") loadStrategyStep(state.strategyStep);
    else if (mode === "openings") loadOpening($("#openingSelect").value || trainingData.openings[0].id);
    else if (mode === "mistakes") loadGameMistake(0);
    else if (["home", "learn"].includes(mode)) {
      beginPositionSession();
      state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.selected = null; state.legal = []; state.thinking = false;
      state.messageOverride = mode === "home" ? { kind: "", title: "Bereit für deine erste Einheit?", text: "Starte mit der Empfehlung. Es gibt keinen Zeitdruck und jeder Fehler wird erklärt." } : { kind: "", title: "Fünf Bausteine für gutes Schach", text: "Beginne ohne Vorwissen bei den Grundlagen. Danach folgen Taktik, Eröffnungen, Endspiel und Strategie." };
      updateHomeRecommendation(); render();
    }
    else resetGame();
    renderMixedSession();
  }

  function resetGame() {
    beginPositionSession();
    if (state.mode === "match") state.matchLearningId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (state.mode === "match") state.playerColor = state.colorChoice === "random" ? (Math.random() < .5 ? "w" : "b") : state.colorChoice;
    state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = null; state.puzzleSolved = false; state.thinking = false; state.matchRated = false; state.matchResult = null;
    if (state.mode === "match" && $("#personalizedMatch").checked) {
      const due = dueGameMistakes();
      for (let offset = 0; offset < due.length; offset++) {
        const candidate = due[(state.personalMatchCursor + offset) % due.length];
        let position;
        try { position = E.fromFEN(candidate.fen); } catch { continue; }
        if (!E.legalMoves(position).some((move) => move.from + move.to + (move.promotion || "") === candidate.best)) continue;
        state.personalMatchCursor += offset + 1; state.personalMatchMistake = candidate;
        state.personalMatchPending = true; state.game = position; state.playerColor = state.game.turn;
        state.messageOverride = { kind: "", title: "Persönliche Fehlerstellung", text: `Du hattest hier ${state.personalMatchMistake.played} gespielt. Finde den besseren Zug; anschließend setzt der Computer die Partie gegen dich fort.` };
        break;
      }
    }
    $("#lessonText").textContent = state.mode === "practice" ? "Prüfe zuerst Material, Königssicherheit und Bauernstruktur – erst danach einzelne Varianten." : "Entwickle zuerst deine Figuren, bringe den König in Sicherheit und kämpfe dann um das Zentrum.";
    $("#fenInput").value = E.START_FEN;
    $("#coachReview").hidden = true;
    render();
    if (state.mode === "match") {
      $("#playerDetail").textContent = `Du spielst ${state.playerColor === "w" ? "Weiß" : "Schwarz"}`;
      $("#opponentDetail").textContent = state.personalMatchMistake ? "Persönlicher Lerngegner · startet aus deinem gespeicherten Fehler" : `${E.difficultyConfig(state.level).name} · Elo ${E.difficultyConfig(state.level).rating} · spielt ${state.playerColor === "w" ? "Schwarz" : "Weiß"}`;
      if (state.personalMatchPending && $("#automaticCoach").checked) preparePersonalMatchHint(1);
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
    const fallback = { rating: 0, games: 0, wins: 0, draws: 0, losses: 0, best: 0, lastChange: 0, history: [] };
    const stats = saved.matchElo || fallback;
    for (const key of ["rating", "games", "wins", "draws", "losses", "best", "lastChange"]) {
      if (!Number.isFinite(stats[key])) stats[key] = fallback[key];
    }
    if (!Array.isArray(stats.history)) stats.history = [];
    if (stats.games === 0 && stats.rating === 800 && stats.best === 800) { stats.rating = 0; stats.best = 0; stats.lastChange = 0; }
    return stats;
  }

  function getGameMistakes(saved = getProgress()) {
    if (!Array.isArray(saved.gameMistakes)) saved.gameMistakes = [];
    return saved.gameMistakes.filter((item) => item && typeof item.fen === "string" && typeof item.best === "string");
  }

  function saveGameMistakes(results) {
    const critical = results.filter((item) => ["mistake", "blunder"].includes(item.classification.id));
    if (!critical.length) return;
    const saved = getProgress(), mistakes = getGameMistakes(saved);
    for (const item of critical) {
      const key = `${item.fen.split(" ").slice(0, 4).join(" ")}|${item.best.from}${item.best.to}${item.best.promotion || ""}`;
      const existing = mistakes.find((entry) => entry.key === key);
      const data = {
        key, fen: item.fen, best: item.best.from + item.best.to + (item.best.promotion || ""), played: item.playedSan,
        bestSan: item.bestSan, loss: item.loss, classification: item.classification.id,
        explanation: explainAnalysisMove(item), lastSeen: localDate(), lastSeenAt: Date.now()
      };
      if (existing) {
        const newOccurrence = existing.lastSession !== state.matchLearningId;
        Object.assign(existing, data, { loss: Math.max(existing.loss || 0, item.loss), lastSession: state.matchLearningId });
        if (newOccurrence) Object.assign(existing, { seenCount: (existing.seenCount || 1) + 1, reviewStage: 0, nextReview: localDate(), mastered: false });
      }
      else mistakes.push({ id: `game-${Date.now()}-${item.ply}`, attempts: 0, successes: 0, seenCount: 1, lastSession: state.matchLearningId, reviewStage: 0, nextReview: localDate(), mastered: false, ...data });
    }
    saved.gameMistakes = mistakes.sort((a, b) => (a.lastSeenAt || 0) - (b.lastSeenAt || 0)).slice(-50); saveProgress(saved); renderMatchRating(); updateMixedDueCount();
  }

  function dueGameMistakes(saved = getProgress()) {
    return getGameMistakes(saved).filter((item) => T.isReviewDue(item, localDate())).sort((a, b) => (b.lapses || 0) - (a.lapses || 0) || (b.seenCount || 1) - (a.seenCount || 1) || (b.loss || 0) - (a.loss || 0));
  }

  function loadGameMistake(index, requestedId = null) {
    beginPositionSession();
    const allMistakes = getGameMistakes();
    const pool = dueGameMistakes();
    if (requestedId && !pool.some((item) => item.id === requestedId)) {
      const requested = allMistakes.find((item) => item.id === requestedId);
      if (requested) pool.unshift(requested);
    }
    if (requestedId) index = Math.max(0, pool.findIndex((item) => item.id === requestedId));
    state.mistakeIndex = pool.length ? (index + pool.length) % pool.length : 0;
    state.activeMistake = pool[state.mistakeIndex] || null; state.mistakeSolved = false; state.mistakeHintStage = 0; state.mistakeHadError = false;
    state.moves = []; state.lastMove = null; state.selected = null; state.legal = []; state.messageOverride = null;
    $("#mistakeExplanation").hidden = true; $("#nextMistake").disabled = true; $("#nextMistake").textContent = "Nächster Fehler";
    if (!state.activeMistake) {
      state.game = E.fromFEN();
      $("#mistakeProgress").textContent = "0 / 0";
      $("#mistakeTitle").textContent = allMistakes.length ? "Heute ist nichts fällig" : "Noch keine Partiefehler gespeichert";
      $("#mistakePrompt").textContent = allMistakes.length ? "Deine nächsten Wiederholungen sind bereits geplant. So bleibt der Abstand groß genug, damit du wirklich aus dem Gedächtnis abrufst." : "Spiele Computerpartien. Kritische Stellungen werden nach der automatischen Analyse hier gesammelt.";
      $("#mistakeSchedule").textContent = allMistakes.length ? T.reviewDueLabel([...allMistakes].sort((a, b) => (a.nextReview || "").localeCompare(b.nextReview || ""))[0], localDate()) : "Neue Partiefehler sind sofort fällig.";
      $("#mistakeHint").disabled = true; $("#removeMistake").disabled = true; render(); return;
    }
    state.game = E.fromFEN(state.activeMistake.fen); state.playerColor = state.game.turn;
    $("#mistakeProgress").textContent = `${state.mistakeIndex + 1} / ${pool.length}`;
    $("#mistakeTitle").textContent = `${state.activeMistake.classification === "blunder" ? "Groben Fehler" : "Fehler"} korrigieren`;
    $("#mistakePrompt").textContent = `In der Partie spieltest du ${state.activeMistake.played}. Finde jetzt den besseren Zug.`;
    $("#mistakeSchedule").textContent = `Wiederholungsstufe ${state.activeMistake.reviewStage || 0} von ${T.REVIEW_INTERVALS.length - 1} · ${T.reviewDueLabel(state.activeMistake, localDate())}`;
    $("#mistakeHint").disabled = false; $("#mistakeHint").textContent = "Gestufter Hinweis"; $("#removeMistake").disabled = state.mixed.active;
    $("#playerDetail").textContent = `Du trainierst ${state.playerColor === "w" ? "Weiß" : "Schwarz"}`;
    $("#opponentDetail").textContent = "Gespeicherte Stellung aus deiner Partie"; render();
  }

  function recordGameMistakeAttempt(success, assisted = false) {
    if (!state.activeMistake) return;
    const item = updateStoredMistakeReview(state.activeMistake.id, success ? (assisted ? "assisted" : "success") : "failure");
    if (item) Object.assign(state.activeMistake, item);
  }

  function updateStoredMistakeReview(id, outcome) {
    const saved = getProgress(), mistakes = getGameMistakes(saved), item = mistakes.find((entry) => entry.id === id);
    if (!item) return null;
    item.attempts = (item.attempts || 0) + 1;
    if (outcome === "success") item.successes = (item.successes || 0) + 1;
    T.scheduleReview(item, outcome, localDate()); item.lastTrained = localDate();
    saved.gameMistakes = mistakes; saveProgress(saved); renderMatchRating(); updateMixedDueCount(); updatePersonalCoachStatus();
    return item;
  }

  function showMistakeHint() {
    if (!state.activeMistake || state.mistakeSolved) return;
    const move = E.legalMoves(state.game).find((candidate) => candidate.from + candidate.to + (candidate.promotion || "") === state.activeMistake.best);
    if (!move) return;
    state.mistakeHintStage = Math.min(3, state.mistakeHintStage + 1);
    queueMixedRetry("mistake", state.activeMistake.id);
    const text = state.mistakeHintStage === 1 ? explainHintPlan(state.game, move) : state.mistakeHintStage === 2 ? `Nutze die Figur auf ${move.from}. ${explainHintPlan(state.game, move)}` : `Spiele ${state.activeMistake.bestSan}: ${move.from} → ${move.to}. ${explainHintMove(state.game, move)}`;
    state.messageOverride = { kind: "", title: `Hinweis ${state.mistakeHintStage} von 3`, text };
    $("#mistakeHint").textContent = state.mistakeHintStage < 3 ? "Konkreteren Hinweis" : "Ganzer Zug angezeigt"; render();
  }

  function removeActiveMistake() {
    if (!state.activeMistake) return;
    const saved = getProgress(); saved.gameMistakes = getGameMistakes(saved).filter((item) => item.id !== state.activeMistake.id); saveProgress(saved);
    loadGameMistake(state.mistakeIndex);
  }

  function queueMixedRetry(type, id) {
    if (!state.mixed.active) return;
    const key = `${type}:${id}`;
    if (state.mixed.retryKeys.has(key)) return;
    state.mixed.retryKeys.add(key);
    state.mixed.queue.push({ type, id, retry: true });
    renderMixedSession();
  }

  function buildMixedQueue() {
    const saved = getProgress();
    const mistakes = dueGameMistakes(saved).slice(0, 5).map((item) => ({ type: "mistake", id: item.id }));
    const rotation = Number(localDate().replaceAll("-", "")) % puzzles.length;
    const orderedPuzzles = [...puzzles.slice(rotation), ...puzzles.slice(0, rotation)]
      .filter((item) => T.isReviewDue(saved.puzzles[item.id], localDate()))
      .sort((a, b) => {
        const left = saved.puzzles[a.id], right = saved.puzzles[b.id];
        const leftDue = T.isReviewDue(left, localDate()) ? 0 : 1, rightDue = T.isReviewDue(right, localDate()) ? 0 : 1;
        return leftDue - rightDue || (left?.successes || 0) - (right?.successes || 0);
      })
      .slice(0, mistakes.length ? 5 : 10).map((item) => ({ type: "tactic", id: item.id }));
    const queue = [];
    while (mistakes.length || orderedPuzzles.length) {
      if (mistakes.length) queue.push(mistakes.shift());
      if (orderedPuzzles.length) queue.push(orderedPuzzles.shift());
    }
    return queue;
  }

  function startMixedTraining() {
    state.mixed = { active: true, queue: buildMixedQueue(), index: 0, retryKeys: new Set() };
    loadMixedItem();
  }

  function renderMixedSession() {
    const box = $("#mixedSessionBar");
    box.hidden = !state.mixed.active;
    if (!state.mixed.active) return;
    const total = state.mixed.queue.length, current = state.mixed.queue[state.mixed.index];
    $("#mixedSessionProgress").textContent = `${Math.min(state.mixed.index + 1, total)} / ${total}`;
    $("#mixedSessionType").textContent = current?.type === "mistake" ? `${current.retry ? "Sofort-Wiederholung" : "Partiefehler"}: aus dem Gedächtnis den besseren Zug finden.` : `${current?.retry ? "Sofort-Wiederholung" : "Taktik"}: eine vollständige Folge selbst lösen.`;
    $("#mixedSessionProgressBar").style.width = `${total ? state.mixed.index / total * 100 : 100}%`;
  }

  function loadMixedItem() {
    const item = state.mixed.queue[state.mixed.index];
    if (!item) { finishMixedTraining(); return; }
    if (item.retry) state.mixed.retryKeys.delete(`${item.type}:${item.id}`);
    if (item.type === "mistake") {
      switchMode("mistakes");
      loadGameMistake(0, item.id);
    } else {
      $("#themeFilter").value = "all"; $("#lessonPhase").value = "practice";
      switchMode("tactics");
      const puzzle = puzzles.find((candidate) => candidate.id === item.id) || puzzles[0];
      loadPuzzle(puzzles.indexOf(puzzle));
      startLesson(puzzle, { phase: "practice", scenario: "main" });
    }
    renderMixedSession();
  }

  function advanceMixedTraining() {
    state.mixed.index += 1;
    loadMixedItem();
  }

  function finishMixedTraining(cancelled = false) {
    const completed = state.mixed.index, total = state.mixed.queue.length;
    state.mixed = { active: false, queue: [], index: 0, retryKeys: new Set() };
    switchMode("learn");
    state.messageOverride = { kind: cancelled ? "" : "success", title: cancelled ? "Einheit beendet" : "Gemischte Einheit abgeschlossen", text: cancelled ? `${completed} Aufgaben bearbeitet. Deine Wiederholungsstände wurden gespeichert.` : `${total} Abrufe geschafft. Fehlerhafte Aufgaben kamen innerhalb der Einheit erneut; weitere Wiederholungen sind automatisch terminiert.` };
    renderMixedSession(); updateMixedDueCount(); render();
  }

  function updateMixedDueCount() {
    const dueMistakes = dueGameMistakes().length;
    const saved = getProgress();
    const dueTactics = puzzles.filter((item) => T.isReviewDue(saved.puzzles[item.id], localDate())).length;
    const due = Math.min(10, dueMistakes + dueTactics);
    $("#mixedDueCount").textContent = due ? `${due} fällig` : "nichts fällig";
    $("#startMixedTraining").disabled = due === 0;
  }

  function recordMatchResult(status) {
    if (state.matchRated || !status.over) return;
    if (state.personalMatchMistake) {
      state.matchRated = true;
      const completedSession = state.sessionId;
      window.setTimeout(() => {
        if (state.mode === "match" && state.sessionId === completedSession && E.gameStatus(state.game).over && !state.analysisRunning && !state.gameAnalysis.length) startGameAnalysis();
      }, 700);
      return;
    }
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
    const completedSession = state.sessionId;
    window.setTimeout(() => {
      if (state.mode === "match" && state.sessionId === completedSession && E.gameStatus(state.game).over && !state.analysisRunning && !state.gameAnalysis.length) startGameAnalysis();
    }, 700);
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
    $("#gameMistakeCount").textContent = dueGameMistakes().length;
    const trend = state.matchResult?.change ?? stats.lastChange;
    $("#matchEloTrend").textContent = stats.games ? `${trend > 0 ? "+" : ""}${trend} zuletzt · Bestwert ${stats.best}` : "Noch keine gewertete Partie";

    const recommendation = recommendedDifficultyIndex(stats.rating);
    const recommended = difficulties[recommendation];
    const button = $("#recommendedDifficulty");
    const selected = E.difficultyConfig(state.level);
    button.dataset.index = recommendation + 1;
    button.disabled = selected.id === recommended.id;
    button.textContent = button.disabled ? `✓ Passend zu deiner Elo: ${recommended.name} (${recommended.rating})` : `Empfohlen: ${recommended.name} · Elo ${recommended.rating}`;
    updatePersonalCoachStatus();
  }

  function updatePersonalCoachStatus() {
    const target = $("#personalCoachStatus");
    if (!target) return;
    const allMistakes = getGameMistakes(), due = dueGameMistakes().length;
    target.textContent = state.liveAnalysisPending ? `${state.liveAnalysisPending} Zug${state.liveAnalysisPending === 1 ? " wird" : "e werden"} geprüft` : allMistakes.length ? `${due} fällig · ${allMistakes.length} gespeichert` : "Noch keine gespeicherten Fehler";
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
    T.scheduleReview(item, success ? "success" : "failure", today);
    const theme = saved.themes[puzzle.category] ||= { attempts: 0, successes: 0 };
    theme.attempts += 1; theme.successes += success ? 1 : 0;
    saveProgress(saved);
    const challenge = { fork: 650, pin: 750, skewer: 850, discovered: 900 }[puzzle.category];
    updateLearningRating("tactics", success ? 1 : 0, challenge);
    updateTrainingProgress();
    updateMixedDueCount();
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
    saved.ratings ||= { tactics: 0, endgame: 0, strategy: 0, openings: 0 };
    for (const area of ["tactics", "endgame", "strategy", "openings"]) if (!Number.isFinite(saved.ratings[area])) saved.ratings[area] = 0;
    return saved.ratings;
  }

  function updateLearningRating(area, score, challengeRating) {
    const saved = getProgress(); const ratings = getRatings(saved);
    ratings[area] = T.updateRating(ratings[area], score, challengeRating);
    saveProgress(saved);
    updateRatingDisplay();
  }

  function resetProfileElo() {
    if (!window.confirm("Lern-Elo und Spiel-Elo wirklich auf 0 setzen? Gespeicherte Fehler, Wiederholungen und abgeschlossene Übungen bleiben erhalten.")) return;
    const saved = getProgress();
    saved.ratings = { tactics: 0, endgame: 0, strategy: 0, openings: 0 };
    saved.ratingBaseline = 0;
    saved.matchElo = { rating: 0, games: 0, wins: 0, draws: 0, losses: 0, best: 0, lastChange: 0, history: [] };
    saveProgress(saved); state.matchResult = null;
    updateRatingDisplay(); renderMatchRating();
    state.messageOverride = { kind: "success", title: "Profil-Elo zurückgesetzt", text: "Lern- und Spiel-Elo starten wieder bei 0. Deine Aufgaben, Fehlerstellungen und Wiederholungstermine wurden nicht gelöscht." };
    render();
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

  all(".mode-tab").forEach((button) => button.addEventListener("click", () => {
    if (state.mixed.active) state.mixed = { active: false, queue: [], index: 0, retryKeys: new Set() };
    switchMode(button.dataset.mode);
  }));
  $("#view2d").addEventListener("click", () => setBoardView("2d"));
  $("#view3d").addEventListener("click", () => setBoardView("3d"));
  $("#rotate3d").addEventListener("click", () => board3d?.rotate());
  $("#fullscreen3d").addEventListener("click", async () => {
    const wrap = document.querySelector(".board-wrap");
    try {
      if (document.fullscreenElement === wrap) await document.exitFullscreen();
      else await wrap.requestFullscreen();
    } catch { /* Der Browser kann Vollbild ablehnen; die normale Ansicht bleibt nutzbar. */ }
  });
  document.addEventListener("fullscreenchange", () => {
    const fullscreen = document.fullscreenElement === document.querySelector(".board-wrap");
    $("#fullscreen3d").textContent = fullscreen ? "\u26F6 Verkleinern" : "\u26F6 Vollbild";
    $("#fullscreen3d").setAttribute("aria-label", fullscreen ? "Vollbild beenden" : "3D-Brett im Vollbild anzeigen");
    board3d?.render();
  });
  all("[data-learning-mode]").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.learningMode)));
  $("#learningBack").addEventListener("click", () => state.mixed.active ? finishMixedTraining(true) : switchMode("learn"));
  $("#continueLearning").addEventListener("click", (event) => switchMode(event.currentTarget.dataset.target || "tactics"));
  $("#startMixedTraining").addEventListener("click", startMixedTraining);
  $("#stopMixedTraining").addEventListener("click", () => finishMixedTraining(true));
  $("#nextBasics").addEventListener("click", advanceBasics);
  $("#difficulty").addEventListener("input", (event) => setDifficulty(event.target.value));
  $("#difficulty").addEventListener("change", (event) => setDifficulty(event.target.value, true));
  all("[data-color]").forEach((button) => button.addEventListener("click", () => setColorChoice(button.dataset.color)));
  $("#recommendedDifficulty").addEventListener("click", (event) => setDifficulty(event.currentTarget.dataset.index, true));
  $("#newGame").addEventListener("click", resetGame);
  $("#resetProfileElo").addEventListener("click", resetProfileElo);
  $("#personalizedMatch").addEventListener("change", updatePersonalCoachStatus);
  $("#automaticCoach").addEventListener("change", (event) => { if (event.target.checked && state.mode === "match" && state.personalMatchPending) preparePersonalMatchHint(1); });
  $("#matchHintButton").addEventListener("click", requestMatchHint);
  $("#nextPuzzle").addEventListener("click", () => {
    if (!state.mixed.active) { loadPuzzle(state.puzzlePosition + 1); return; }
    if (!state.puzzleSolved) {
      state.messageOverride = { kind: "", title: "Erst vollständig lösen", text: "Spiele die trainierte Folge zu Ende. Danach geht die gemischte Einheit weiter." }; render(); return;
    }
    advanceMixedTraining();
  });
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
  function showCoachReviewSummary() {
    const box = $("#coachReview");
    if (state.analysisRunning || state.gameAnalysis.length || !box.hidden) return;
    const review = T.coachReview(state.moves, T.toPgn(state.moves), state.playerColor);
    box.hidden = false; box.innerHTML = "";
    const title = document.createElement("strong"); title.textContent = review.title;
    const summary = document.createElement("p"); summary.textContent = `${review.summary} Starte die Zug-für-Zug-Analyse für konkrete Alternativen.`;
    box.append(title, summary);
  }

  function startGameAnalysis() {
    if (state.analysisRunning) return;
    const positions = state.game.history.map((entry, ply) => ({ entry, ply })).filter(({ entry }) => E.fromFEN(entry.fen).turn === state.playerColor);
    const box = $("#coachReview");
    if (!positions.length) {
      box.hidden = false; box.innerHTML = '<strong>Noch keine eigenen Züge</strong><p>Spiele mindestens einen Zug, damit die Partieanalyse beginnen kann.</p>';
      return;
    }
    const requestId = ++state.analysisRequest;
    state.analysisRunning = true; state.gameAnalysis = []; state.reviewPosition = null; state.reviewMove = null;
    $("#reviewGame").disabled = true;
    renderAnalysisProgress(0, positions.length);

    const analyzeNext = (index) => {
      if (requestId !== state.analysisRequest || !state.analysisRunning) return;
      if (index >= positions.length) {
        state.analysisRunning = false;
        $("#reviewGame").disabled = false;
        $("#reviewGame").textContent = "Analyse neu berechnen";
        saveGameMistakes(state.gameAnalysis);
        renderGameAnalysis();
        return;
      }
      window.setTimeout(async () => {
        if (requestId !== state.analysisRequest || !state.analysisRunning) return;
        const { entry, ply } = positions[index];
        const position = E.fromFEN(entry.fen);
        const played = E.legalMoves(position).find((move) => sameMove(move, entry.move));
        if (played) {
          let analysis;
          try { analysis = await analyzeInBackground(position, { depth: 6, timeMs: 900, quiescence: 3, multiPv: 5 }); }
          catch {
            state.analysisRunning = false; $("#reviewGame").disabled = false;
            $("#coachReview").innerHTML = '<strong>Analyse unterbrochen</strong><p>Die Hintergrundanalyse konnte diese Stellung nicht verarbeiten. Du kannst die Analyse erneut starten.</p>';
            return;
          }
          if (requestId !== state.analysisRequest || !state.analysisRunning) return;
          const playedResult = analysis.scoredMoves.find((item) => sameMove(item.move, played));
          const bestResult = analysis.scoredMoves[0];
          const loss = position.turn === "w" ? bestResult.score - playedResult.score : playedResult.score - bestResult.score;
          const classification = T.classifyMoveLoss(Math.max(0, loss));
          state.gameAnalysis.push({
            ply, fen: entry.fen, played, best: bestResult.move,
            playedSan: E.notation(position, played), bestSan: E.notation(position, bestResult.move),
            loss: Math.max(0, loss), classification, depth: analysis.depth,
            evaluation: (state.playerColor === "w" ? playedResult.score : -playedResult.score) / 100
          });
        }
        renderAnalysisProgress(index + 1, positions.length);
        analyzeNext(index + 1);
      }, 25);
    };
    analyzeNext(0);
  }

  function sameMove(a, b) {
    return a.from === b.from && a.to === b.to && (a.promotion || "") === (b.promotion || "");
  }

  function renderAnalysisProgress(done, total) {
    const box = $("#coachReview"); box.hidden = false;
    const percent = Math.round(done / total * 100);
    box.innerHTML = `<strong>Partie wird Zug für Zug analysiert</strong><p>${done} von ${total} eigenen Zügen geprüft. Die lokale Engine vergleicht jeden Zug mit allen legalen Kandidaten.</p><div class="analysis-progress" aria-label="${percent} Prozent"><span style="width:${percent}%"></span></div>`;
  }

  function renderGameAnalysis() {
    const box = $("#coachReview"); box.hidden = false; box.innerHTML = "";
    const results = state.gameAnalysis;
    if (!results.length) { box.innerHTML = '<strong>Keine auswertbaren Züge</strong><p>Für diese Partie konnten keine eigenen legalen Züge rekonstruiert werden.</p>'; return; }
    const averageQuality = Math.round(results.reduce((sum, item) => sum + item.classification.quality, 0) / results.length);
    const problems = results.filter((item) => ["inaccuracy", "mistake", "blunder"].includes(item.classification.id)).length;
    const heading = document.createElement("div"); heading.className = "analysis-summary";
    heading.innerHTML = `<span>ZUGQUALITÄT</span><strong>${averageQuality}%</strong><small>${problems ? (problems === 1 ? "1 kritischer Moment" : `${problems} kritische Momente`) : "Keine deutlichen Fehler gefunden"}</small>`;
    const note = document.createElement("p"); note.textContent = "Bewertet wird der Verlust gegenüber dem stärksten lokal gefundenen Zug. Wähle einen Zug, um Stellung und Alternative zu sehen.";
    const list = document.createElement("div"); list.className = "analysis-list";
    results.forEach((item, index) => {
      const button = document.createElement("button"); button.type = "button"; button.className = `analysis-row ${item.classification.id}`;
      const moveNumber = `${Math.floor(item.ply / 2) + 1}.${item.ply % 2 ? "…" : ""}`;
      button.innerHTML = `<span>${moveNumber} ${item.playedSan}</span><strong>${item.classification.label}</strong><small>${item.loss <= 15 ? "stärkster Kandidat" : `${formatAnalysisLoss(item.loss)} · besser ${item.bestSan}`}</small>`;
      button.addEventListener("click", () => showAnalysisPosition(index)); list.appendChild(button);
    });
    const detail = document.createElement("div"); detail.id = "analysisDetail"; detail.className = "analysis-detail"; detail.textContent = "Wähle einen Zug aus der Liste.";
    const finalButton = document.createElement("button"); finalButton.type = "button"; finalButton.className = "text-button analysis-final"; finalButton.textContent = "Endstellung auf dem Brett zeigen";
    finalButton.addEventListener("click", () => { state.reviewPosition = null; state.reviewMove = null; renderBoard(); all(".analysis-row").forEach((row) => row.classList.remove("active")); detail.textContent = "Endstellung der Partie."; });
    box.append(heading, note, list, detail, finalButton);
    const firstCritical = results.findIndex((item) => ["mistake", "blunder"].includes(item.classification.id));
    showAnalysisPosition(firstCritical >= 0 ? firstCritical : 0);
  }

  function showAnalysisPosition(index) {
    const item = state.gameAnalysis[index];
    if (!item) return;
    state.reviewPosition = E.fromFEN(item.fen);
    state.reviewMove = { played: item.played, best: item.best };
    renderBoard();
    all(".analysis-row").forEach((row, rowIndex) => row.classList.toggle("active", rowIndex === index));
    const detail = $("#analysisDetail");
    if (detail) detail.innerHTML = `<strong>${item.playedSan}: ${item.classification.label}</strong><p>${explainAnalysisMove(item)}</p><small>Bewertung danach: ${formatPlayerEvaluation(item.evaluation)} · Rot: gespielt · Gold: stärkste Alternative · Suchtiefe ${item.depth || 1}</small>`;
  }

  function explainAnalysisMove(item) {
    if (item.loss <= 15) return `${item.playedSan} gehört zu den stärksten gefundenen Zügen. ${explainHintMove(E.fromFEN(item.fen), item.played)}`;
    const lossText = item.loss > 90000 ? "eine entscheidende Wendung" : `${(item.loss / 100).toFixed(2)} Bauerneinheiten`;
    return `${item.playedSan} kostet nach lokaler Berechnung ungefähr ${lossText}. Besser war ${item.bestSan}: ${explainHintMove(E.fromFEN(item.fen), item.best)}`;
  }

  function formatAnalysisLoss(loss) {
    return loss > 90000 ? "entscheidende Wendung" : `−${(loss / 100).toFixed(2)}`;
  }

  function formatPlayerEvaluation(value) {
    if (Math.abs(value) > 900) return value > 0 ? "entscheidender Vorteil" : "entscheidender Nachteil";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  }

  $("#reviewGame").addEventListener("click", startGameAnalysis);
  $("#trainGameMistakes").addEventListener("click", () => switchMode("mistakes"));
  $("#mistakeHint").addEventListener("click", showMistakeHint);
  $("#nextMistake").addEventListener("click", () => state.mixed.active ? advanceMixedTraining() : loadGameMistake(0));
  $("#removeMistake").addEventListener("click", removeActiveMistake);
  $("#loadStart").addEventListener("click", () => { $("#fenInput").value = E.START_FEN; loadFen(); });
  $("#loadFen").addEventListener("click", loadFen);
  $("#undoButton").addEventListener("click", () => {
    clearMatchHint(); cancelGameAnalysis(); $("#coachReview").hidden = true;
    state.liveAnalysisRequest += 1; state.liveAnalysisPending = 0;
    const frame = [];
    if (state.mode === "match") {
      let removedOwnMove = false;
      while (state.game.history.length && !removedOwnMove) {
        const historyEntry = state.game.history.at(-1), removed = state.moves.pop();
        frame.unshift({ move: { ...historyEntry.move }, moveData: removed ? { ...removed } : null });
        state.game = E.undo(state.game);
        removedOwnMove = removed?.color === state.playerColor;
      }
    } else {
      const historyEntry = state.game.history.at(-1), removed = state.moves.pop();
      if (historyEntry) frame.push({ move: { ...historyEntry.move }, moveData: removed ? { ...removed } : null });
      state.game = E.undo(state.game);
    }
    if (frame.length) state.redoFrames.push(frame);
    state.lastMove = state.game.history.at(-1)?.move || null;
    state.opponentLastMove = null;
    for (let i = state.game.history.length - 1; i >= 0; i--) {
      const entry = state.game.history[i];
      if (entry.piece && E.colorOf(entry.piece) !== state.playerColor) { state.opponentLastMove = entry.move; break; }
    }
    if (state.personalMatchMistake) state.personalMatchPending = E.toFEN(state.game).split(" ").slice(0, 4).join(" ") === state.personalMatchMistake.fen.split(" ").slice(0, 4).join(" ");
    state.selected = null; state.legal = []; state.messageOverride = null; render();
  });
  $("#redoButton").addEventListener("click", () => {
    const frame = state.redoFrames.pop();
    if (!frame?.length) return;
    clearMatchHint(); cancelGameAnalysis(); $("#coachReview").hidden = true;
    for (const item of frame) {
      const move = E.legalMoves(state.game).find((candidate) => candidate.from === item.move.from && candidate.to === item.move.to && (candidate.promotion || "") === (item.move.promotion || ""));
      if (!move) { state.redoFrames = []; break; }
      const before = state.game, san = E.notation(before, move);
      state.game = E.applyMove(before, move);
      state.moves.push(item.moveData || { color: before.turn, san });
    }
    state.lastMove = state.game.history.at(-1)?.move || null;
    state.opponentLastMove = null;
    for (let i = state.game.history.length - 1; i >= 0; i--) {
      const entry = state.game.history[i];
      if (entry.piece && E.colorOf(entry.piece) !== state.playerColor) { state.opponentLastMove = entry.move; break; }
    }
    if (state.personalMatchMistake) state.personalMatchPending = E.toFEN(state.game).split(" ").slice(0, 4).join(" ") === state.personalMatchMistake.fen.split(" ").slice(0, 4).join(" ");
    state.selected = null; state.legal = []; state.messageOverride = { kind: "", title: "Zug wiederhergestellt", text: frame.length === 1 ? "Der zurückgenommene Zug wurde erneut ausgeführt." : "Dein Zug und die gespeicherte Computerantwort wurden erneut ausgeführt." }; render();
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

  populateOpeningSelect(); setDifficulty(recommendedDifficultyIndex(getMatchStats().rating) + 1); updateTrainingProgress(); updateMixedDueCount(); switchMode("home"); setBoardView(boardView, false);
})();
