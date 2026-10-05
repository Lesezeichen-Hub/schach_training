(function () {
  "use strict";

  const E = window.ChessEngine;
  const T = window.ChessTraining;
  const glyph = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const boardEl = document.querySelector("#board");
  const statusCard = document.querySelector(".status-card");
  const state = {
    game: E.fromFEN(), mode: "home", level: "medium", selected: null,
    legal: [], lastMove: null, opponentLastMove: null, moves: [], thinking: false, puzzleIndex: 0, puzzlePosition: 0,
    puzzleSolved: false, attemptsOnPuzzle: 0, solutionFrom: null, solutionTo: null,
    endgameId: "ladder-mate", endgameFailed: false, strategyStep: 0, strategySolved: false,
    openingIndex: 0, openingPly: 0, openingErrors: 0, basicsStep: 0, messageOverride: null
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

  function render() {
    renderBoard();
    renderMoves();
    renderStatus();
    const interactiveBoard = !["home", "learn", "basics", "strategy"].includes(state.mode);
    $("#whiteTurn").classList.toggle("active", interactiveBoard && state.game.turn === "w" && !state.thinking);
    $("#blackTurn").classList.toggle("active", interactiveBoard && state.game.turn === "b");
    $("#thinking").hidden = !state.thinking;
    $("#undoButton").disabled = !state.game.history.length || state.thinking || !["match", "practice"].includes(state.mode);
    if (state.mode === "match" && E.gameStatus(state.game).over) renderCoachReview();
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    const checkColor = E.inCheck(state.game, state.game.turn) ? state.game.turn : null;
    const flipped = state.mode === "openings" && trainingData.openings[state.openingIndex].side === "b";
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
      if (state.mode === "tactics") {
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
    if (state.mode === "openings" && (state.openingPly >= trainingData.openings[state.openingIndex].line.length || state.game.turn !== trainingData.openings[state.openingIndex].side)) return;
    if (state.mode === "match" && state.game.turn === "b") return;
    const [r, c] = E.coords(square);
    const piece = state.game.board[r][c];
    const targetMoves = state.legal.filter((move) => move.to === square);
    if (state.selected && targetMoves.length) {
      let move = targetMoves[0];
      if (targetMoves.some((m) => m.promotion)) {
        const promotion = await choosePromotion();
        move = targetMoves.find((m) => m.promotion === promotion) || targetMoves[0];
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
      const onClose = () => { dialog.removeEventListener("close", onClose); resolve(dialog.returnValue || "q"); };
      dialog.addEventListener("close", onClose);
      dialog.showModal();
    });
  }

  function makeMove(move, actor) {
    const before = state.game;
    const san = E.notation(before, move);
    state.game = E.applyMove(before, move);
    state.moves.push({ color: before.turn, san, whiteMaterialBefore: T.materialFor(E, before, "w"), whiteMaterialAfter: T.materialFor(E, state.game, "w") });
    state.lastMove = move;
    if (state.mode === "match" && actor === "ai") state.opponentLastMove = move;
    state.selected = null;
    state.legal = [];
    state.messageOverride = null;

    if (state.mode === "tactics" && actor === "human") {
      const result = T.validateTactic(puzzles[state.puzzleIndex], move);
      if (result.correct) {
        state.puzzleSolved = true;
        state.messageOverride = { kind: "success", title: "Richtig!", text: puzzles[state.puzzleIndex].explanation };
        recordPuzzleAttempt(true);
        animateBoard("correct-flash");
      } else {
        state.game = before;
        state.moves.pop();
        state.lastMove = null;
        state.attemptsOnPuzzle += 1;
        recordPuzzleAttempt(false);
        state.messageOverride = { kind: "error", title: "Versuch es noch einmal", text: state.attemptsOnPuzzle >= 3 ? "Drei Versuche sind vorbei. Du kannst dir jetzt die Lösung auf dem Brett anzeigen lassen." : "Setze die Figur zurück und prüfe erneut: Schachs, Schlagzüge, Drohungen." };
        $("#revealSolution").disabled = state.attemptsOnPuzzle < 3;
        animateBoard("wrong-shake");
      }
      render();
      return;
    }

    if (state.mode === "openings" && actor === "human") {
      const opening = trainingData.openings[state.openingIndex];
      const played = move.from + move.to + (move.promotion || "");
      if (played !== opening.line[state.openingPly]) {
        state.game = before; state.moves.pop(); state.lastMove = before.history.at(-1)?.move || null; state.openingErrors += 1;
        state.messageOverride = { kind: "error", title: "Nicht der Repertoirezug", text: `Versuch es noch einmal. Denke an den Plan: ${opening.ideas[0]}.` };
        updateLearningRating("openings", 0, opening.rating); animateBoard("wrong-shake"); render(); return;
      }
      state.openingPly += 1;
      updateLearningRating("openings", 1, opening.rating);
      state.messageOverride = { kind: "success", title: "Repertoirezug erkannt", text: opening.ideas[Math.min(opening.ideas.length - 1, Math.floor(state.openingPly / 4))] };
      animateBoard("correct-flash"); updateOpeningLineProgress(); render();
      window.setTimeout(advanceOpeningLine, 380); return;
    }

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
    if (state.mode === "match" && !E.gameStatus(state.game).over && state.game.turn === "b") requestAiMove();
  }

  function animateBoard(className) {
    boardEl.classList.remove(className);
    void boardEl.offsetWidth;
    boardEl.classList.add(className);
    window.setTimeout(() => boardEl.classList.remove(className), 2100);
  }

  function requestEndgameDefense() {
    state.thinking = true; render();
    window.setTimeout(() => {
      const move = T.chooseEndgameDefense(E, state.game, state.endgameId);
      state.thinking = false;
      if (move) makeMove(move, "defense"); else render();
    }, 420);
  }

  function requestAiMove() {
    state.thinking = true;
    render();
    const delay = state.level === "easy" ? 280 : state.level === "medium" ? 450 : 650;
    window.setTimeout(() => {
      const move = E.chooseMove(state.game, state.level);
      state.thinking = false;
      if (move) makeMove(move, "ai"); else render();
    }, delay);
  }

  function renderStatus() {
    const status = E.gameStatus(state.game);
    statusCard.className = "status-card";
    let title, text, kind = "";
    if (state.messageOverride) ({ title, text, kind } = state.messageOverride);
    else if (status.type === "checkmate") { title = "Schachmatt"; text = `${status.winner === "w" ? "Weiß" : "Schwarz"} gewinnt die Partie.`; kind = "success"; }
    else if (status.type === "stalemate") { title = "Patt"; text = "Kein legaler Zug, aber der König steht nicht im Schach. Die Partie ist remis."; }
    else if (status.type === "fiftyMove") { title = "Remis"; text = "50-Züge-Regel: 100 Halbzüge ohne Bauernzug oder Schlagzug."; }
    else if (status.type === "repetition") { title = "Remis"; text = "Dieselbe Stellung ist dreimal entstanden."; }
    else if (status.type === "insufficient") { title = "Remis"; text = "Mit diesem Material ist kein Matt mehr möglich."; }
    else if (state.thinking) { title = "Die KI rechnet"; text = "Sie prüft legale Antworten auf deinen letzten Zug."; }
    else if (status.check) { title = "Schach!"; text = `${state.game.turn === "w" ? "Dein" : "Der schwarze"} König ist angegriffen. Reagiere auf das Schach.`; kind = "error"; }
    else if (state.mode === "tactics" && state.puzzleSolved) { title = "Aufgabe gelöst"; text = "Sehr gut erkannt. Nimm das Motiv mit in deine nächste Partie."; kind = "success"; }
    else { title = state.game.turn === "w" ? "Weiß ist am Zug" : "Schwarz ist am Zug"; text = "Wähle eine Figur und danach eines der markierten Zielfelder."; }
    if (kind) statusCard.classList.add(kind);
    $("#statusTitle").textContent = title;
    $("#statusText").textContent = text;
    $("#statusIcon").textContent = kind === "success" ? "◆" : kind === "error" ? "!" : "●";
  }

  function renderMoves() {
    const list = $("#moveList");
    if (!state.moves.length) { list.innerHTML = '<p class="empty-state">Noch keine Züge gespielt.</p>'; return; }
    list.innerHTML = "";
    for (let i = 0; i < state.moves.length; i += 2) {
      const number = document.createElement("span"); number.className = "move-number"; number.textContent = `${i / 2 + 1}.`;
      const white = document.createElement("span"); white.className = "move-cell"; white.textContent = state.moves[i]?.san || "";
      const black = document.createElement("span"); black.className = "move-cell"; black.textContent = state.moves[i + 1]?.san || "";
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
    $("#opponentDetail").textContent = mode === "match" ? `${state.level === "easy" ? "Leicht" : state.level === "hard" ? "Stark" : "Mittel"} · Trainingspartie` : mode === "tactics" ? "Muster erkennen · Zug berechnen" : mode === "endgame" ? "Technik gegen beste Verteidigung" : mode === "strategy" ? "Verstehen, bevor du ziehst" : mode === "openings" ? "Zugfolge und Pläne lernen" : mode === "home" ? "Hier beginnt dein Training" : mode === "learn" ? "Wähle dein nächstes Lernziel" : "Varianten ohne Zeitdruck";
    $("#playerDetail").textContent = ["home", "learn"].includes(mode) ? "Dein Tempo · ohne Zeitdruck" : mode === "basics" ? "Erst verstehen, dann ziehen" : mode === "strategy" ? "Wähle eine Antwort im Lernpanel" : mode === "openings" ? `Du spielst ${trainingData.openings[state.openingIndex].side === "w" ? "Weiß" : "Schwarz"}` : "Weiß · konzentriert";
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
      state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.selected = null; state.legal = []; state.thinking = false;
      state.messageOverride = mode === "home" ? { kind: "", title: "Bereit für deine erste Einheit?", text: "Starte mit der Empfehlung. Es gibt keinen Zeitdruck und jeder Fehler wird erklärt." } : { kind: "", title: "Fünf Bausteine für gutes Schach", text: "Beginne ohne Vorwissen bei den Grundlagen. Danach folgen Taktik, Eröffnungen, Endspiel und Strategie." };
      updateHomeRecommendation(); render();
    }
    else resetGame();
  }

  function resetGame() {
    state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = null; state.puzzleSolved = false; state.thinking = false;
    $("#lessonText").textContent = state.mode === "practice" ? "Prüfe zuerst Material, Königssicherheit und Bauernstruktur – erst danach einzelne Varianten." : "Entwickle zuerst deine Figuren, bringe den König in Sicherheit und kämpfe dann um das Zentrum.";
    $("#fenInput").value = E.START_FEN;
    $("#coachReview").hidden = true;
    render();
  }

  function loadBasics(index) {
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
    localStorage.setItem("schachwerkstatt-progress", JSON.stringify(saved));
    state.basicsStep = 0; updateHomeRecommendation(); switchMode("learn");
  }

  function loadEndgame(id) {
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
    advanceOpeningLine();
  }

  function advanceOpeningLine() {
    if (state.mode !== "openings") return;
    const opening = trainingData.openings[state.openingIndex];
    while (state.openingPly < opening.line.length && state.game.turn !== opening.side) {
      const expected = opening.line[state.openingPly];
      const move = E.legalMoves(state.game).find((candidate) => candidate.from + candidate.to + (candidate.promotion || "") === expected);
      if (!move) { state.messageOverride = { kind: "error", title: "Variantendaten fehlerhaft", text: `Der Zug ${expected} ist in dieser Stellung nicht legal.` }; render(); return; }
      const before = state.game; const san = E.notation(before, move); state.game = E.applyMove(before, move);
      state.moves.push({ color: before.turn, san, whiteMaterialBefore: T.materialFor(E, before, "w"), whiteMaterialAfter: T.materialFor(E, state.game, "w") });
      state.lastMove = move; state.openingPly += 1;
    }
    updateOpeningLineProgress();
    if (state.openingPly >= opening.line.length) {
      state.messageOverride = { kind: "success", title: "Variante abgeschlossen", text: `${opening.name}: ${opening.ideas.join(" · ")}` };
      animateBoard("correct-flash");
    } else if (!state.messageOverride) {
      state.messageOverride = { kind: "", title: `${opening.side === "w" ? "Weiß" : "Schwarz"} am Zug`, text: "Finde den nächsten Repertoirezug aus dem Plan der Eröffnung." };
    }
    render();
  }

  function updateOpeningLineProgress() {
    const opening = trainingData.openings[state.openingIndex];
    const ownPlies = opening.line.filter((_, index) => (index % 2 === 0 ? "w" : "b") === opening.side).length;
    const completed = opening.line.slice(0, state.openingPly).filter((_, index) => (index % 2 === 0 ? "w" : "b") === opening.side).length;
    $("#openingLineProgress").textContent = `${completed} / ${ownPlies} eigene Züge`;
  }

  function loadPuzzle(index) {
    const reviewEmpty = $("#themeFilter")?.value === "review" && !puzzles.some((puzzle) => (getProgress().puzzles?.[puzzle.id]?.errors || 0) > 0);
    const pool = currentPuzzlePool();
    state.puzzlePosition = (index + pool.length) % pool.length;
    const puzzle = pool[state.puzzlePosition];
    state.puzzleIndex = puzzles.indexOf(puzzle);
    state.game = E.fromFEN(puzzle.fen); state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = reviewEmpty ? { kind: "success", title: "Noch keine Fehler offen", text: "Stark! Bis hierhin gibt es keine Fehlversuche. Du trainierst deshalb weiter im gemischten Modus." } : null; state.puzzleSolved = false; state.attemptsOnPuzzle = 0; state.solutionFrom = null; state.solutionTo = null;
    $("#puzzleTheme").textContent = categoryMeta[puzzle.category].title; $("#puzzleProgress").textContent = `${state.puzzlePosition + 1} / ${pool.length}`;
    $("#conceptTitle").textContent = puzzle.title; $("#conceptText").textContent = categoryMeta[puzzle.category].concept;
    $("#puzzlePrompt").textContent = puzzle.prompt; $("#puzzleDescription").textContent = "Weiß ist am Zug. Führe den besten Zug direkt auf dem Brett aus."; $("#lessonText").textContent = categoryMeta[puzzle.category].rule;
    $("#nextPuzzle").textContent = "Nächste Aufgabe";
    $("#revealSolution").disabled = true; $("#revealSolution").textContent = "Lösung anzeigen · nach 3 Versuchen";
    updateTrainingProgress();
    render();
  }

  function localDate() {
    return new Date().toLocaleDateString("sv-SE");
  }

  function getProgress() {
    try { return JSON.parse(localStorage.getItem("schachwerkstatt-progress") || "{}"); }
    catch { return {}; }
  }

  function currentPuzzlePool() {
    const filter = $("#themeFilter")?.value || "all";
    if (filter === "all") return puzzles;
    if (filter === "review") {
      const progress = getProgress();
      const review = puzzles.filter((puzzle) => (progress.puzzles?.[puzzle.id]?.errors || 0) > 0);
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
    item.attempts += 1; item.successes += success ? 1 : 0; item.errors += success ? 0 : 1; item.lastSeen = today;
    const theme = saved.themes[puzzle.category] ||= { attempts: 0, successes: 0 };
    theme.attempts += 1; theme.successes += success ? 1 : 0;
    localStorage.setItem("schachwerkstatt-progress", JSON.stringify(saved));
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
    localStorage.setItem("schachwerkstatt-progress", JSON.stringify(saved));
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

  all(".mode-tab").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
  all("[data-learning-mode]").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.learningMode)));
  $("#learningBack").addEventListener("click", () => switchMode("learn"));
  $("#continueLearning").addEventListener("click", (event) => switchMode(event.currentTarget.dataset.target || "tactics"));
  $("#nextBasics").addEventListener("click", advanceBasics);
  all("[data-level]").forEach((button) => button.addEventListener("click", () => {
    state.level = button.dataset.level;
    all("[data-level]").forEach((b) => { const active = b === button; b.classList.toggle("active", active); b.setAttribute("aria-checked", String(active)); });
    const labels = { easy: "Leicht · spielt locker", medium: "Mittel · denkt positionell", hard: "Stark · rechnet tiefer" };
    $("#opponentDetail").textContent = labels[state.level]; resetGame();
  }));
  $("#newGame").addEventListener("click", resetGame);
  $("#nextPuzzle").addEventListener("click", () => loadPuzzle(state.puzzlePosition + 1));
  $("#hintButton").addEventListener("click", () => { const p = puzzles[state.puzzleIndex]; state.messageOverride = { kind: "", title: "Hinweis", text: p.hint }; render(); });
  $("#revealSolution").addEventListener("click", () => {
    if (state.attemptsOnPuzzle < 3) return;
    const solution = puzzles[state.puzzleIndex].line[0]; state.solutionFrom = solution.slice(0, 2); state.solutionTo = solution.slice(2, 4);
    state.messageOverride = { kind: "", title: "Lösung auf dem Brett", text: `${state.solutionFrom} → ${state.solutionTo}. ${puzzles[state.puzzleIndex].explanation}` };
    $("#revealSolution").textContent = `${state.solutionFrom} → ${state.solutionTo}`; render();
  });
  $("#themeFilter").addEventListener("change", () => loadPuzzle(0));
  $("#endgameSelect").addEventListener("change", (event) => loadEndgame(event.target.value));
  $("#restartEndgame").addEventListener("click", () => loadEndgame(state.endgameId));
  $("#nextStrategy").addEventListener("click", () => loadStrategyStep(state.strategyStep + 1));
  $("#openingSelect").addEventListener("change", (event) => loadOpening(event.target.value));
  $("#restartOpening").addEventListener("click", () => loadOpening(trainingData.openings[state.openingIndex].id));
  function renderCoachReview() {
    const review = T.coachReview(state.moves, T.toPgn(state.moves)); const box = $("#coachReview"); box.hidden = false; box.innerHTML = "";
    const title = document.createElement("strong"); title.textContent = review.title;
    const summary = document.createElement("p"); summary.textContent = review.summary;
    box.append(title, summary);
  }
  $("#reviewGame").addEventListener("click", renderCoachReview);
  $("#loadStart").addEventListener("click", () => { $("#fenInput").value = E.START_FEN; loadFen(); });
  $("#loadFen").addEventListener("click", loadFen);
  $("#undoButton").addEventListener("click", () => {
    const count = state.mode === "match" && state.game.history.length >= 2 ? 2 : 1;
    for (let i = 0; i < count; i++) { state.game = E.undo(state.game); state.moves.pop(); }
    state.lastMove = state.game.history.at(-1)?.move || null;
    state.opponentLastMove = null;
    for (let i = state.game.history.length - 1; i >= 0; i--) {
      const entry = state.game.history[i];
      if (entry.piece && E.colorOf(entry.piece) === "b") { state.opponentLastMove = entry.move; break; }
    }
    state.selected = null; state.legal = []; state.messageOverride = null; render();
  });

  function loadFen() {
    try {
      const parsed = E.fromFEN($("#fenInput").value.trim());
      if (!(E.inCheck(parsed, "w") && E.inCheck(parsed, "b")) && parsed.board.flat().filter((p) => p === "K").length === 1 && parsed.board.flat().filter((p) => p === "k").length === 1) {
        state.game = parsed; state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = { kind: "success", title: "Stellung geladen", text: `${parsed.turn === "w" ? "Weiß" : "Schwarz"} ist am Zug.` }; render();
      } else throw new Error();
    } catch { state.messageOverride = { kind: "error", title: "FEN nicht lesbar", text: "Prüfe die Stellung. Beide Könige müssen vorhanden sein und dürfen nicht gleichzeitig bedroht sein." }; render(); }
  }

  populateOpeningSelect(); updateTrainingProgress(); switchMode("home");
})();
