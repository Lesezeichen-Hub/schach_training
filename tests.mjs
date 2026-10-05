import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("./chess-engine.js", import.meta.url), "utf8");
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(source, context);
const E = context.globalThis.ChessEngine;

function play(state, uci) {
  const move = E.legalMoves(state).find((m) => m.from + m.to + (m.promotion || "") === uci);
  assert.ok(move, `Zug ${uci} muss legal sein`);
  return E.applyMove(state, move);
}

let game = E.fromFEN();
assert.equal(E.legalMoves(game).length, 20, "Grundstellung hat 20 legale Züge");
function perft(position, depth) {
  if (depth === 0) return 1;
  return E.legalMoves(position).reduce((sum, move) => sum + perft(E.applyMove(position, move, false), depth - 1), 0);
}
assert.equal(perft(game, 2), 400, "Perft Tiefe 2");
assert.equal(perft(game, 3), 8902, "Perft Tiefe 3");
game = play(game, "e2e4");
game = play(game, "e7e5");
game = play(game, "g1f3");
assert.equal(game.turn, "b");

let castle = E.fromFEN("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
assert.ok(E.legalMoves(castle).some((m) => m.from === "e1" && m.to === "g1" && m.castle));
castle = play(castle, "e1g1");
assert.equal(castle.board[7][5], "R", "Turm zieht bei der Rochade mit");

let ep = E.fromFEN();
ep = play(ep, "e2e4"); ep = play(ep, "a7a6"); ep = play(ep, "e4e5"); ep = play(ep, "d7d5");
assert.ok(E.legalMoves(ep).some((m) => m.from === "e5" && m.to === "d6" && m.enPassant));
ep = play(ep, "e5d6");
assert.equal(ep.board[3][3], null, "en-passant-Bauer wird entfernt");

let promotion = E.fromFEN("7k/P7/8/8/8/8/6K1/8 w - - 0 1");
promotion = play(promotion, "a7a8q");
assert.equal(promotion.board[0][0], "Q");

let mate = E.fromFEN("6k1/6pp/7Q/8/8/2B5/8/6K1 w - - 0 1");
mate = play(mate, "h6g7");
assert.equal(E.gameStatus(mate).type, "checkmate");

const pin = E.fromFEN("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
assert.ok(E.inCheck(pin, "b"));

let repetition = E.fromFEN();
for (const uci of ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"]) repetition = play(repetition, uci);
assert.equal(E.gameStatus(repetition).type, "repetition");

for (const [fen, uci] of [
  ["3q3k/5ppp/8/4N3/8/8/6PP/6K1 w - - 0 1", "e5f7"],
  ["6k1/6pp/7Q/8/8/2B5/8/6K1 w - - 0 1", "h6g7"],
  ["6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1", "e1e8"],
  ["6k1/5ppp/8/7Q/2B5/8/6PP/6K1 w - - 0 1", "h5f7"],
  ["7k/P7/8/8/8/8/6K1/8 w - - 0 1", "a7a8q"]
]) assert.ok(E.legalMoves(E.fromFEN(fen)).some((m) => m.from + m.to + (m.promotion || "") === uci), `Taktikzug ${uci} ist legal`);

for (const level of ["easy", "medium", "hard"]) {
  const position = E.fromFEN();
  const choice = E.chooseMove(position, level);
  assert.ok(E.legalMoves(position).some((m) => m.from === choice.from && m.to === choice.to && m.promotion === choice.promotion), `KI-Zug (${level}) ist legal`);
}

console.log("Alle Schachregeln-Tests bestanden.");
