/* A small, dependency-free chess rules engine for the training app. */
(function (root) {
  "use strict";

  const FILES = "abcdefgh";
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  const opposite = (color) => color === "w" ? "b" : "w";
  const colorOf = (piece) => piece === piece.toUpperCase() ? "w" : "b";
  const typeOf = (piece) => piece.toLowerCase();
  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const sq = (r, c) => FILES[c] + (8 - r);
  const coords = (square) => [8 - Number(square[1]), FILES.indexOf(square[0])];

  function cloneState(state) {
    return {
      board: state.board.map((row) => row.slice()),
      turn: state.turn,
      castling: { ...state.castling },
      ep: state.ep,
      halfmove: state.halfmove,
      fullmove: state.fullmove,
      history: state.history ? state.history.slice() : []
    };
  }

  function fromFEN(fen = START_FEN) {
    const [placement, turn, castle, ep, half = "0", full = "1"] = fen.trim().split(/\s+/);
    const board = placement.split("/").map((rank) => {
      const row = [];
      for (const ch of rank) {
        if (/\d/.test(ch)) row.push(...Array(Number(ch)).fill(null));
        else row.push(ch);
      }
      if (row.length !== 8) throw new Error("Ungültige FEN");
      return row;
    });
    if (board.length !== 8) throw new Error("Ungültige FEN");
    return {
      board,
      turn,
      castling: { K: castle.includes("K"), Q: castle.includes("Q"), k: castle.includes("k"), q: castle.includes("q") },
      ep: ep === "-" ? null : ep,
      halfmove: Number(half),
      fullmove: Number(full),
      history: []
    };
  }

  function toFEN(state) {
    const placement = state.board.map((row) => {
      let out = "", empty = 0;
      for (const piece of row) {
        if (!piece) empty++;
        else { if (empty) out += empty; empty = 0; out += piece; }
      }
      return out + (empty || "");
    }).join("/");
    const castle = Object.keys(state.castling).filter((key) => state.castling[key]).join("") || "-";
    return `${placement} ${state.turn} ${castle} ${state.ep || "-"} ${state.halfmove} ${state.fullmove}`;
  }

  function findKing(state, color) {
    const king = color === "w" ? "K" : "k";
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (state.board[r][c] === king) return [r, c];
    return null;
  }

  function isAttacked(state, r, c, byColor) {
    const pawn = byColor === "w" ? "P" : "p";
    const pawnRow = r + (byColor === "w" ? 1 : -1);
    for (const dc of [-1, 1]) if (inside(pawnRow, c + dc) && state.board[pawnRow][c + dc] === pawn) return true;

    const knight = byColor === "w" ? "N" : "n";
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      if (inside(r + dr, c + dc) && state.board[r + dr][c + dc] === knight) return true;
    }

    const king = byColor === "w" ? "K" : "k";
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if ((dr || dc) && inside(r + dr, c + dc) && state.board[r + dr][c + dc] === king) return true;
    }

    for (const [dr, dc, types] of [[-1,0,"rq"],[1,0,"rq"],[0,-1,"rq"],[0,1,"rq"],[-1,-1,"bq"],[-1,1,"bq"],[1,-1,"bq"],[1,1,"bq"]]) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const piece = state.board[rr][cc];
        if (piece) {
          if (colorOf(piece) === byColor && types.includes(typeOf(piece))) return true;
          break;
        }
        rr += dr; cc += dc;
      }
    }
    return false;
  }

  function inCheck(state, color) {
    const king = findKing(state, color);
    return !king || isAttacked(state, king[0], king[1], opposite(color));
  }

  function pushMove(moves, fromR, fromC, toR, toC, extra = {}) {
    moves.push({ from: sq(fromR, fromC), to: sq(toR, toC), ...extra });
  }

  function pseudoMoves(state, color = state.turn) {
    const moves = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || colorOf(piece) !== color) continue;
      const type = typeOf(piece);

      if (type === "p") {
        const dir = color === "w" ? -1 : 1;
        const start = color === "w" ? 6 : 1;
        const promotionRow = color === "w" ? 0 : 7;
        if (inside(r + dir, c) && !state.board[r + dir][c]) {
          if (r + dir === promotionRow) for (const promotion of ["q","r","b","n"]) pushMove(moves, r, c, r + dir, c, { promotion });
          else pushMove(moves, r, c, r + dir, c);
          if (r === start && !state.board[r + 2 * dir][c]) pushMove(moves, r, c, r + 2 * dir, c, { doublePawn: true });
        }
        for (const dc of [-1, 1]) {
          const rr = r + dir, cc = c + dc;
          if (!inside(rr, cc)) continue;
          const target = state.board[rr][cc];
          if (target && colorOf(target) !== color && typeOf(target) !== "k") {
            if (rr === promotionRow) for (const promotion of ["q","r","b","n"]) pushMove(moves, r, c, rr, cc, { promotion, capture: target });
            else pushMove(moves, r, c, rr, cc, { capture: target });
          } else if (state.ep === sq(rr, cc)) pushMove(moves, r, c, rr, cc, { enPassant: true, capture: color === "w" ? "p" : "P" });
        }
      }

      if (type === "n") for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const rr = r + dr, cc = c + dc;
        if (!inside(rr, cc)) continue;
        const target = state.board[rr][cc];
        if (!target || (colorOf(target) !== color && typeOf(target) !== "k")) pushMove(moves, r, c, rr, cc, target ? { capture: target } : {});
      }

      if (["b","r","q"].includes(type)) {
        const dirs = type === "b" ? [[-1,-1],[-1,1],[1,-1],[1,1]] : type === "r" ? [[-1,0],[1,0],[0,-1],[0,1]] : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (inside(rr, cc)) {
            const target = state.board[rr][cc];
            if (!target) pushMove(moves, r, c, rr, cc);
            else { if (colorOf(target) !== color && typeOf(target) !== "k") pushMove(moves, r, c, rr, cc, { capture: target }); break; }
            rr += dr; cc += dc;
          }
        }
      }

      if (type === "k") {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) {
          const rr = r + dr, cc = c + dc;
          if (!inside(rr, cc)) continue;
          const target = state.board[rr][cc];
          if (!target || (colorOf(target) !== color && typeOf(target) !== "k")) pushMove(moves, r, c, rr, cc, target ? { capture: target } : {});
        }
        const home = color === "w" ? 7 : 0;
        const enemy = opposite(color);
        if (r === home && c === 4 && !inCheck(state, color)) {
          const kRight = color === "w" ? "K" : "k";
          const qRight = color === "w" ? "Q" : "q";
          const rook = color === "w" ? "R" : "r";
          if (state.castling[kRight] && state.board[home][7] === rook && !state.board[home][5] && !state.board[home][6] && !isAttacked(state, home, 5, enemy) && !isAttacked(state, home, 6, enemy)) pushMove(moves, r, c, home, 6, { castle: "K" });
          if (state.castling[qRight] && state.board[home][0] === rook && !state.board[home][1] && !state.board[home][2] && !state.board[home][3] && !isAttacked(state, home, 3, enemy) && !isAttacked(state, home, 2, enemy)) pushMove(moves, r, c, home, 2, { castle: "Q" });
        }
      }
    }
    return moves;
  }

  function applyMove(state, move, record = true) {
    const next = cloneState(state);
    const [fr, fc] = coords(move.from), [tr, tc] = coords(move.to);
    const piece = next.board[fr][fc];
    const captured = move.enPassant ? next.board[fr][tc] : next.board[tr][tc];
    next.board[fr][fc] = null;
    next.board[tr][tc] = move.promotion ? (colorOf(piece) === "w" ? move.promotion.toUpperCase() : move.promotion) : piece;
    if (move.enPassant) next.board[fr][tc] = null;
    if (move.castle === "K") { next.board[tr][5] = next.board[tr][7]; next.board[tr][7] = null; }
    if (move.castle === "Q") { next.board[tr][3] = next.board[tr][0]; next.board[tr][0] = null; }

    if (piece === "K") { next.castling.K = false; next.castling.Q = false; }
    if (piece === "k") { next.castling.k = false; next.castling.q = false; }
    if (move.from === "a1" || move.to === "a1") next.castling.Q = false;
    if (move.from === "h1" || move.to === "h1") next.castling.K = false;
    if (move.from === "a8" || move.to === "a8") next.castling.q = false;
    if (move.from === "h8" || move.to === "h8") next.castling.k = false;

    next.ep = move.doublePawn ? sq((fr + tr) / 2, fc) : null;
    next.halfmove = typeOf(piece) === "p" || captured ? 0 : state.halfmove + 1;
    next.fullmove = state.fullmove + (state.turn === "b" ? 1 : 0);
    next.turn = opposite(state.turn);
    if (record) next.history.push({ move: { ...move }, fen: toFEN(state), piece, captured });
    return next;
  }

  function legalMoves(state, fromSquare = null) {
    return pseudoMoves(state).filter((move) => {
      if (fromSquare && move.from !== fromSquare) return false;
      return !inCheck(applyMove(state, move, false), state.turn);
    });
  }

  function gameStatus(state) {
    const legal = legalMoves(state);
    if (!legal.length) return inCheck(state, state.turn) ? { over: true, type: "checkmate", winner: opposite(state.turn) } : { over: true, type: "stalemate", winner: null };
    if (state.halfmove >= 100) return { over: true, type: "fiftyMove", winner: null };
    const positionKey = (fen) => fen.split(" ").slice(0, 4).join(" ");
    const currentKey = positionKey(toFEN(state));
    const repetitions = 1 + state.history.filter((item) => positionKey(item.fen) === currentKey).length;
    if (repetitions >= 3) return { over: true, type: "repetition", winner: null };
    const material = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (piece && typeOf(piece) !== "k") material.push({ type: typeOf(piece), color: colorOf(piece), squareColor: (r + c) % 2 });
    }
    const bareMinor = material.length <= 1 && material.every((p) => ["b", "n"].includes(p.type));
    const sameColorBishops = material.length > 0 && material.every((p) => p.type === "b") && material.every((p) => p.squareColor === material[0].squareColor);
    if (!material.length || bareMinor || sameColorBishops) return { over: true, type: "insufficient", winner: null };
    return { over: false, check: inCheck(state, state.turn) };
  }

  function notation(before, move) {
    const [fr, fc] = coords(move.from), [tr, tc] = coords(move.to);
    const piece = before.board[fr][fc];
    if (move.castle) return move.castle === "K" ? "O-O" : "O-O-O";
    const after = applyMove(before, move, false);
    const prefix = typeOf(piece) === "p" ? (move.capture ? FILES[fc] : "") : typeOf(piece).toUpperCase();
    const suffix = gameStatus(after).type === "checkmate" ? "#" : inCheck(after, after.turn) ? "+" : "";
    return `${prefix}${move.capture ? "x" : ""}${move.to}${move.promotion ? "=" + move.promotion.toUpperCase() : ""}${suffix}`;
  }

  function undo(state) {
    const last = state.history[state.history.length - 1];
    if (!last) return state;
    const restored = fromFEN(last.fen);
    restored.history = state.history.slice(0, -1);
    return restored;
  }

  const DIFFICULTY_LEVELS = [
    { id: "first", name: "Einstieg", rating: 450, depth: 0, timeMs: 0, tolerance: Infinity, quiescence: 0, description: "Spielt fast zufällig und lässt viele Chancen zu." },
    { id: "beginner", name: "Anfänger", rating: 600, depth: 1, timeMs: 40, tolerance: 350, quiescence: 0, description: "Erkennt direkte Schlagzüge, übersieht aber Antworten." },
    { id: "learner", name: "Lernpartner", rating: 800, depth: 2, timeMs: 90, tolerance: 220, quiescence: 0, description: "Prüft deinen nächsten direkten Gegenzug." },
    { id: "steady", name: "Solide", rating: 950, depth: 2, timeMs: 160, tolerance: 100, quiescence: 0, description: "Spielt zuverlässig, erlaubt aber noch taktische Chancen." },
    { id: "club", name: "Verein", rating: 1150, depth: 3, timeMs: 280, tolerance: 55, quiescence: 0, description: "Berechnet kurze Kombinationen über drei Halbzüge." },
    { id: "advanced", name: "Fortgeschritten", rating: 1350, depth: 4, timeMs: 500, tolerance: 30, quiescence: 1, description: "Rechnet tiefer und prüft Schlagfolgen am Suchende." },
    { id: "strong", name: "Stark", rating: 1550, depth: 5, timeMs: 800, tolerance: 12, quiescence: 2, description: "Findet mehrzügige Taktiken und vermeidet einfache Fallen." },
    { id: "expert", name: "Experte", rating: 1800, depth: 6, timeMs: 1200, tolerance: 0, quiescence: 3, description: "Nutzt die maximale lokale Suchtiefe und spielt den besten gefundenen Zug." }
  ];

  function evaluate(state) {
    let score = 0;
    const center = [[3,3],[3,4],[4,3],[4,4]];
    let whiteBishops = 0, blackBishops = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const sign = colorOf(p) === "w" ? 1 : -1;
      const type = typeOf(p);
      score += sign * PIECE_VALUE[type];
      if (center.some(([rr, cc]) => rr === r && cc === c)) score += sign * 18;
      if (type === "p") {
        const advance = colorOf(p) === "w" ? (6 - r) : (r - 1);
        score += sign * advance * 5;
        if (state.fullmove <= 10 && [0, 1, 6, 7].includes(c)) score -= sign * advance * 12;
        if (state.fullmove <= 10 && c === 5) score -= sign * advance * 7;
      }
      if (type === "b") colorOf(p) === "w" ? whiteBishops++ : blackBishops++;
      if (["n", "b"].includes(type)) {
        const undeveloped = colorOf(p) === "w" ? r === 7 : r === 0;
        if (!undeveloped) score += sign * 12;
      }
      if (type === "n") {
        const centerDistance = Math.abs(r - 3.5) + Math.abs(c - 3.5);
        score += sign * Math.round(18 - centerDistance * 5);
      }
      if (type === "k" && (c === 2 || c === 6)) score += sign * 32;
    }
    if (whiteBishops >= 2) score += 24;
    if (blackBishops >= 2) score -= 24;
    return score;
  }

  function difficultyConfig(level) {
    const aliases = { easy: "first", medium: "learner", hard: "club" };
    const id = aliases[level] || level;
    return DIFFICULTY_LEVELS.find((item) => item.id === id) || DIFFICULTY_LEVELS[2];
  }

  function chooseMove(state, level = "learner") {
    const moves = legalMoves(state);
    if (!moves.length) return null;
    const config = difficultyConfig(level);
    if (config.depth === 0) {
      const pool = moves.flatMap((m) => Array(m.capture ? 3 : 1).fill(m));
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const context = { deadline: Date.now() + config.timeMs, nodes: 0, table: new Map(), quiescence: config.quiescence };
    let completedScores = moves.map((move) => ({ move, score: evaluate(applyMove(state, move, false)) }));
    for (let depth = 1; depth <= config.depth; depth++) {
      try {
        const iteration = [];
        for (const move of orderMoves(moves)) {
          checkSearchTime(context);
          iteration.push({ move, score: minimax(applyMove(state, move, false), depth - 1, -Infinity, Infinity, context) });
        }
        completedScores = iteration;
      } catch (error) {
        if (error !== SEARCH_TIMEOUT) throw error;
        break;
      }
    }
    return chooseWithinTolerance(completedScores, state.turn === "w", config.tolerance);
  }

  function analyzePosition(state, options = {}) {
    const moves = legalMoves(state);
    const status = gameStatus(state);
    if (!moves.length || status.over) return { move: null, alternatives: [], depth: 0, nodes: 0, score: null };

    const maxDepth = Math.max(1, Math.min(8, Number(options.depth) || 5));
    const timeMs = Math.max(50, Math.min(5000, Number(options.timeMs) || 1000));
    const quiescenceDepth = Math.max(0, Math.min(4, Number(options.quiescence) || 2));
    const context = { deadline: Date.now() + timeMs, nodes: 0, table: new Map(), quiescence: quiescenceDepth };
    let completedDepth = 0;
    let completedScores = moves.map((move) => ({ move, score: evaluate(applyMove(state, move, false)) }));

    for (let depth = 1; depth <= maxDepth; depth++) {
      try {
        const iteration = [];
        for (const move of orderMoves(moves)) {
          checkSearchTime(context);
          iteration.push({ move, score: minimax(applyMove(state, move, false), depth - 1, -Infinity, Infinity, context) });
        }
        completedScores = iteration;
        completedDepth = depth;
      } catch (error) {
        if (error !== SEARCH_TIMEOUT) throw error;
        break;
      }
    }

    const direction = state.turn === "w" ? -1 : 1;
    completedScores.sort((a, b) => direction * (a.score - b.score));
    const alternatives = completedScores.slice(0, Math.max(1, Math.min(5, Number(options.multiPv) || 3)));
    return {
      move: alternatives[0].move,
      score: alternatives[0].score,
      alternatives,
      scoredMoves: completedScores,
      depth: completedDepth,
      nodes: context.nodes
    };
  }

  const SEARCH_TIMEOUT = Symbol("search-timeout");

  function checkSearchTime(context) {
    context.nodes += 1;
    if ((context.nodes & 127) === 0 && Date.now() >= context.deadline) throw SEARCH_TIMEOUT;
  }

  function chooseWithinTolerance(scored, maximize, tolerance) {
    const best = maximize ? Math.max(...scored.map((item) => item.score)) : Math.min(...scored.map((item) => item.score));
    const candidates = scored.filter((item) => maximize ? best - item.score <= tolerance : item.score - best <= tolerance);
    return candidates[Math.floor(Math.random() * candidates.length)].move;
  }

  function orderMoves(moves) {
    return moves.slice().sort((a, b) => (Number(Boolean(b.promotion)) * 2 + Number(Boolean(b.capture))) - (Number(Boolean(a.promotion)) * 2 + Number(Boolean(a.capture))));
  }

  function minimax(state, depth, alpha, beta, context) {
    checkSearchTime(context);
    const status = gameStatus(state);
    if (status.over) {
      if (status.type === "checkmate") return status.winner === "w" ? 100000 + depth : -100000 - depth;
      return 0;
    }
    if (depth === 0) return context.quiescence ? quiescence(state, alpha, beta, context.quiescence, context) : evaluate(state);
    const key = `${toFEN(state).split(" ").slice(0, 4).join(" ")}|${depth}`;
    if (context.table.has(key)) return context.table.get(key);
    let result, cutoff = false;
    if (state.turn === "w") {
      let value = -Infinity;
      for (const move of orderMoves(legalMoves(state))) { value = Math.max(value, minimax(applyMove(state, move, false), depth - 1, alpha, beta, context)); alpha = Math.max(alpha, value); if (alpha >= beta) { cutoff = true; break; } }
      result = value;
    } else {
      let value = Infinity;
      for (const move of orderMoves(legalMoves(state))) { value = Math.min(value, minimax(applyMove(state, move, false), depth - 1, alpha, beta, context)); beta = Math.min(beta, value); if (alpha >= beta) { cutoff = true; break; } }
      result = value;
    }
    if (!cutoff) context.table.set(key, result);
    return result;
  }

  function quiescence(state, alpha, beta, depth, context) {
    checkSearchTime(context);
    const status = gameStatus(state);
    if (status.over) {
      if (status.type === "checkmate") return status.winner === "w" ? 100000 + depth : -100000 - depth;
      return 0;
    }
    const standPat = evaluate(state);
    if (depth <= 0) return standPat;
    const inCheckNow = inCheck(state, state.turn);
    const tacticalMoves = orderMoves(legalMoves(state).filter((move) => inCheckNow || move.capture || move.promotion));
    if (!tacticalMoves.length) return standPat;
    if (state.turn === "w") {
      let value = inCheckNow ? -Infinity : standPat;
      for (const move of tacticalMoves) { value = Math.max(value, quiescence(applyMove(state, move, false), alpha, beta, depth - 1, context)); alpha = Math.max(alpha, value); if (alpha >= beta) break; }
      return value;
    }
    let value = inCheckNow ? Infinity : standPat;
    for (const move of tacticalMoves) { value = Math.min(value, quiescence(applyMove(state, move, false), alpha, beta, depth - 1, context)); beta = Math.min(beta, value); if (alpha >= beta) break; }
    return value;
  }

  root.ChessEngine = { START_FEN, DIFFICULTY_LEVELS, fromFEN, toFEN, cloneState, legalMoves, applyMove, gameStatus, notation, undo, chooseMove, analyzePosition, difficultyConfig, inCheck, coords, sq, colorOf, typeOf, evaluate };
})(typeof window !== "undefined" ? window : globalThis);
