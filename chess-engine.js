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

  function evaluate(state) {
    let score = 0;
    const center = [[3,3],[3,4],[4,3],[4,4]];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const sign = colorOf(p) === "w" ? 1 : -1;
      score += sign * PIECE_VALUE[typeOf(p)];
      if (center.some(([rr, cc]) => rr === r && cc === c)) score += sign * 18;
      if (typeOf(p) === "p") score += sign * (colorOf(p) === "w" ? (6 - r) : (r - 1)) * 5;
    }
    return score;
  }

  function chooseMove(state, level = "easy") {
    const moves = legalMoves(state);
    if (!moves.length) return null;
    if (level === "easy") {
      const pool = moves.flatMap((m) => Array(m.capture ? 3 : 1).fill(m));
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const depth = level === "medium" ? 2 : 3;
    const maximize = state.turn === "w";
    let best = maximize ? -Infinity : Infinity, choices = [];
    for (const move of orderMoves(moves)) {
      const score = minimax(applyMove(state, move, false), depth - 1, -Infinity, Infinity);
      if ((maximize && score > best) || (!maximize && score < best)) { best = score; choices = [move]; }
      else if (score === best) choices.push(move);
    }
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function orderMoves(moves) { return moves.slice().sort((a, b) => Number(Boolean(b.capture)) - Number(Boolean(a.capture))); }

  function minimax(state, depth, alpha, beta) {
    const status = gameStatus(state);
    if (status.over) {
      if (status.type === "checkmate") return status.winner === "w" ? 100000 + depth : -100000 - depth;
      return 0;
    }
    if (depth === 0) return evaluate(state);
    if (state.turn === "w") {
      let value = -Infinity;
      for (const move of orderMoves(legalMoves(state))) { value = Math.max(value, minimax(applyMove(state, move, false), depth - 1, alpha, beta)); alpha = Math.max(alpha, value); if (alpha >= beta) break; }
      return value;
    }
    let value = Infinity;
    for (const move of orderMoves(legalMoves(state))) { value = Math.min(value, minimax(applyMove(state, move, false), depth - 1, alpha, beta)); beta = Math.min(beta, value); if (alpha >= beta) break; }
    return value;
  }

  root.ChessEngine = { START_FEN, fromFEN, toFEN, cloneState, legalMoves, applyMove, gameStatus, notation, undo, chooseMove, inCheck, coords, sq, colorOf, typeOf, evaluate };
})(typeof window !== "undefined" ? window : globalThis);
