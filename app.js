(function () {
  "use strict";

  const E = window.ChessEngine;
  const glyph = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const boardEl = document.querySelector("#board");
  const statusCard = document.querySelector(".status-card");
  const state = {
    game: E.fromFEN(), mode: "match", level: "medium", selected: null,
    legal: [], lastMove: null, opponentLastMove: null, moves: [], thinking: false, puzzleIndex: 0,
    puzzleSolved: false, messageOverride: null
  };

  const puzzles = [
    { theme: "Springergabel", fen: "3q3k/5ppp/8/4N3/8/8/6PP/6K1 w - - 0 1", solution: "e5f7", prompt: "Gewinne die Dame.", text: "Weiß zieht. Finde den Doppelangriff mit Tempo.", hint: "Ein Springer kann König und Dame gleichzeitig angreifen.", lesson: "Suche bei jedem Zug nach Schachs, Schlagzügen und direkten Drohungen." },
    { theme: "Matt in 1", fen: "6k1/6pp/7Q/8/8/2B5/8/6K1 w - - 0 1", solution: "h6g7", prompt: "Setze sofort matt.", text: "Weiß zieht. Alle Fluchtfelder des Königs sind begrenzt.", hint: "Die Dame kann auf g7 schlagen und wird vom Läufer gedeckt.", lesson: "Beim Mattangriff zählt nicht nur das Schach, sondern auch jedes Fluchtfeld." },
    { theme: "Grundreihenmatt", fen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1", solution: "e1e8", prompt: "Nutze die schwache Grundreihe.", text: "Weiß zieht und setzt in einem Zug matt.", hint: "Der eigene Bauernwall nimmt dem schwarzen König alle Felder.", lesson: "Ein Luftloch für den König verhindert viele Mattmotive auf der Grundreihe." },
    { theme: "Angriff", fen: "6k1/5ppp/8/7Q/2B5/8/6PP/6K1 w - - 0 1", solution: "h5f7", prompt: "Finde den stärksten Angriffszug.", text: "Weiß zieht. Dame und Läufer zielen gemeinsam auf f7.", hint: "Der schwächste Punkt ist oft der Bauer direkt neben dem König.", lesson: "Zwei Angreifer gegen einen unzureichend gedeckten Punkt können die Stellung entscheiden." },
    { theme: "Umwandlung", fen: "7k/P7/8/8/8/8/6K1/8 w - - 0 1", solution: "a7a8q", prompt: "Vollende den Freibauern.", text: "Weiß zieht und schafft sofort eine neue Dame.", hint: "Ziehe den Bauern auf die letzte Reihe und wähle die stärkste Figur.", lesson: "Ein weit vorgerückter Freibauer zwingt den Gegner oft zur völligen Passivität." }
  ];

  function $(selector) { return document.querySelector(selector); }
  function all(selector) { return [...document.querySelectorAll(selector)]; }

  function render() {
    renderBoard();
    renderMoves();
    renderStatus();
    $("#whiteTurn").classList.toggle("active", state.game.turn === "w" && !state.thinking);
    $("#blackTurn").classList.toggle("active", state.game.turn === "b");
    $("#thinking").hidden = !state.thinking;
    $("#undoButton").disabled = !state.game.history.length || state.thinking || state.mode === "tactics";
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    const checkColor = E.inCheck(state.game, state.game.turn) ? state.game.turn : null;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
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
      if (piece && E.typeOf(piece) === "k" && E.colorOf(piece) === checkColor) button.classList.add("in-check");
      if (piece) button.innerHTML = `<span class="piece" aria-hidden="true">${glyph[piece]}</span>`;
      if (c === 0) button.insertAdjacentHTML("beforeend", `<span class="coord rank" aria-hidden="true">${8 - r}</span>`);
      if (r === 7) button.insertAdjacentHTML("beforeend", `<span class="coord file" aria-hidden="true">${"abcdefgh"[c]}</span>`);
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
    state.moves.push({ color: before.turn, san });
    state.lastMove = move;
    if (state.mode === "match" && actor === "ai") state.opponentLastMove = move;
    state.selected = null;
    state.legal = [];
    state.messageOverride = null;

    if (state.mode === "tactics" && actor === "human") {
      const expected = puzzles[state.puzzleIndex].solution;
      const played = move.from + move.to + (move.promotion || "");
      if (played === expected) {
        state.puzzleSolved = true;
        state.messageOverride = { kind: "success", title: "Genau richtig!", text: explainMove(move, san) };
        recordPuzzleSuccess();
      } else {
        state.game = before;
        state.moves.pop();
        state.lastMove = null;
        state.messageOverride = { kind: "error", title: "Noch nicht ganz.", text: "Die Idee ist legal, aber es gibt einen stärkeren Zug. Rechne zuerst alle Schachs und Schlagzüge." };
      }
      render();
      return;
    }

    render();
    if (state.mode === "match" && !E.gameStatus(state.game).over && state.game.turn === "b") requestAiMove();
  }

  function explainMove(move, san) {
    if (san.endsWith("#")) return `${san} setzt matt. Der König hat kein legales Fluchtfeld.`;
    if (move.promotion) return `${san} verwandelt den Freibauern und gewinnt entscheidendes Material.`;
    if (move.capture) return `${san} nutzt das taktische Motiv und erzwingt einen Vorteil.`;
    return `${san} ist der präzise Zug und stellt die entscheidende Drohung auf.`;
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
    all(".mode-tab").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    $("#matchControls").hidden = mode !== "match";
    $("#tacticsControls").hidden = mode !== "tactics";
    $("#practiceControls").hidden = mode !== "practice";
    const copy = {
      match: ["TRAININGSPARTIE", "Spiel mit Plan.", "Nimm dir Zeit. Nach jedem Zug zeigt dir die Werkstatt, ob dein König sicher steht."],
      tactics: ["TAKTIKTRAINING", "Finde den Schlüsselzug.", "Rechne die Stellung durch, bevor du eine Figur berührst."],
      practice: ["FREIES BRETT", "Untersuche eine Stellung.", "Lade eine FEN-Stellung und probiere für beide Seiten alle legalen Varianten aus."]
    }[mode];
    $("#panelEyebrow").textContent = copy[0]; $("#panelTitle").textContent = copy[1]; $("#panelIntro").textContent = copy[2];
    if (mode === "tactics") loadPuzzle(state.puzzleIndex);
    else resetGame();
  }

  function resetGame() {
    state.game = E.fromFEN(); state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = null; state.puzzleSolved = false; state.thinking = false;
    $("#lessonText").textContent = state.mode === "practice" ? "Prüfe zuerst Material, Königssicherheit und Bauernstruktur – erst danach einzelne Varianten." : "Entwickle zuerst deine Figuren, bringe den König in Sicherheit und kämpfe dann um das Zentrum.";
    $("#fenInput").value = E.START_FEN;
    render();
  }

  function loadPuzzle(index) {
    state.puzzleIndex = (index + puzzles.length) % puzzles.length;
    const puzzle = puzzles[state.puzzleIndex];
    state.game = E.fromFEN(puzzle.fen); state.moves = []; state.lastMove = null; state.opponentLastMove = null; state.selected = null; state.legal = []; state.messageOverride = null; state.puzzleSolved = false;
    $("#puzzleTheme").textContent = puzzle.theme; $("#puzzleProgress").textContent = `${state.puzzleIndex + 1} / ${puzzles.length}`;
    $("#puzzlePrompt").textContent = puzzle.prompt; $("#puzzleDescription").textContent = puzzle.text; $("#lessonText").textContent = puzzle.lesson;
    render();
  }

  function recordPuzzleSuccess() {
    const today = new Date().toISOString().slice(0, 10);
    const saved = JSON.parse(localStorage.getItem("schachwerkstatt-progress") || "{}");
    if (saved.date !== today) { saved.date = today; saved.count = 0; }
    saved.count = (saved.count || 0) + 1;
    localStorage.setItem("schachwerkstatt-progress", JSON.stringify(saved));
    $("#streakCount").textContent = saved.count;
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem("schachwerkstatt-progress") || "{}");
      $("#streakCount").textContent = saved.date === new Date().toISOString().slice(0, 10) ? (saved.count || 0) : 0;
    } catch { $("#streakCount").textContent = 0; }
  }

  all(".mode-tab").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
  all("[data-level]").forEach((button) => button.addEventListener("click", () => {
    state.level = button.dataset.level;
    all("[data-level]").forEach((b) => { const active = b === button; b.classList.toggle("active", active); b.setAttribute("aria-checked", String(active)); });
    const labels = { easy: "Leicht · spielt locker", medium: "Mittel · denkt positionell", hard: "Stark · rechnet tiefer" };
    $("#opponentDetail").textContent = labels[state.level]; resetGame();
  }));
  $("#newGame").addEventListener("click", resetGame);
  $("#nextPuzzle").addEventListener("click", () => loadPuzzle(state.puzzleIndex + 1));
  $("#hintButton").addEventListener("click", () => { const p = puzzles[state.puzzleIndex]; state.messageOverride = { kind: "", title: "Hinweis", text: p.hint }; render(); });
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

  loadProgress(); resetGame();
})();
