import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("./chess-engine.js", import.meta.url), "utf8");
const trainingSource = fs.readFileSync(new URL("./training-core.js", import.meta.url), "utf8");
const trainingData = JSON.parse(fs.readFileSync(new URL("./training-data.json", import.meta.url), "utf8"));
const generatedSource = fs.readFileSync(new URL("./training-data.generated.js", import.meta.url), "utf8");
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(source, context);
vm.runInContext(trainingSource, context);
const E = context.globalThis.ChessEngine;
const T = context.globalThis.ChessTraining;
const generatedContext = { window: {} };
vm.createContext(generatedContext);
vm.runInContext(generatedSource, generatedContext);
assert.deepEqual(JSON.parse(JSON.stringify(generatedContext.window.CHESS_TRAINING_DATA)), trainingData, "Generierte Browserdaten entsprechen der JSON-Quelle");

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

const cleanMate = E.fromFEN("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");
assert.equal(E.gameStatus(cleanMate).type, "checkmate", "Schach ohne Fluchtfeld wird als Matt erkannt");
const cleanStalemate = E.fromFEN("7k/5K2/6Q1/8/8/8/8/8 b - - 0 1");
assert.equal(E.gameStatus(cleanStalemate).type, "stalemate", "Kein Zug ohne Schach wird als Patt erkannt");

const reportedPositionWhite = E.fromFEN("8/6R1/5R2/3pn3/N2p2Pp/4kP2/1BP1B3/4K3 w - - 0 1");
assert.equal(E.gameStatus(reportedPositionWhite).over, false, "Gemeldete Stellung ist bei weißem Zug nicht beendet");
assert.equal(E.legalMoves(reportedPositionWhite).length, 41, "Weiß hat in der gemeldeten Stellung legale Züge");
const reportedPositionBlack = E.fromFEN("8/6R1/5R2/3pn3/N2p2Pp/4kP2/1BP1B3/4K3 b - - 0 1");
assert.equal(E.gameStatus(reportedPositionBlack).over, false, "Gemeldete Stellung ist auch bei schwarzem Zug nicht beendet");
assert.equal(E.legalMoves(reportedPositionBlack).length, 10, "Schwarz hat in der gemeldeten Stellung legale Züge");

const pin = E.fromFEN("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
assert.ok(E.inCheck(pin, "b"));

let repetition = E.fromFEN();
for (const uci of ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"]) repetition = play(repetition, uci);
assert.equal(E.gameStatus(repetition).type, "repetition");

for (const category of ["fork", "pin", "skewer", "discovered"]) {
  assert.ok(trainingData.tactics.filter((task) => task.category === category).length >= 5, `${category} enthält mindestens fünf Aufgaben`);
}
for (const task of trainingData.tactics) {
  const move = E.legalMoves(E.fromFEN(task.fen)).find((candidate) => candidate.from + candidate.to + (candidate.promotion || "") === task.line[0]);
  assert.ok(move, `Taktikzug ${task.id}/${task.line[0]} ist legal`);
  assert.equal(T.validateTactic(task, move).correct, true, `Validator erkennt ${task.id}`);
}
for (const [index, step] of trainingData.masterclass.steps.entries()) {
  const legal = E.legalMoves(E.fromFEN(step.fen));
  for (const choice of step.choices) assert.ok(legal.some((move) => move.from + move.to + (move.promotion || "") === choice.move), `Strategieoption ${index + 1}/${choice.move} ist legal`);
}
assert.ok(trainingData.openings.length >= 20, "Eröffnungsrepertoire enthält mindestens 20 sinnvolle Varianten");
for (const opening of trainingData.openings) {
  let position = E.fromFEN();
  for (const uci of opening.line) position = play(position, uci);
}
assert.ok(T.updateRating(800, 1, 800) > 800, "Lern-Elo steigt nach erfolgreicher Aufgabe");
assert.ok(T.updateRating(800, 0, 800) < 800, "Lern-Elo sinkt nach Fehler");
assert.equal(T.ratingStage(800).name, "Springer", "Aufbaustufe wird korrekt bestimmt");

const ladder = E.fromFEN(trainingData.endgames.find((item) => item.id === "ladder-mate").fen);
const ladderMove = E.legalMoves(ladder)[0];
const ladderReply = T.chooseEndgameDefense(E, E.applyMove(ladder, ladderMove), "ladder-mate");
assert.ok(!ladderReply || E.legalMoves(E.applyMove(ladder, ladderMove)).some((move) => move.from === ladderReply.from && move.to === ladderReply.to), "Endspielverteidigung wählt legalen Zug");

const opposition = E.fromFEN(trainingData.endgames.find((item) => item.id === "pawn-opposition").fen);
const winningKingMove = E.legalMoves(opposition).find((move) => move.from === "e6" && move.to === "d6");
const losingKingMove = E.legalMoves(opposition).find((move) => move.from === "e6" && move.to === "d5");
assert.equal(T.canForcePawnWin(E, E.applyMove(opposition, winningKingMove)), true, "Oppositionsmodul erkennt den Gewinnweg");
assert.equal(T.canForcePawnWin(E, E.applyMove(opposition, losingKingMove)), false, "Oppositionsmodul erkennt den Verlust des Gewinnwegs");

const review = T.coachReview([{ color: "w", san: "e4", whiteMaterialBefore: 3900, whiteMaterialAfter: 3900 }]);
assert.ok(review.improvements.some((text) => text.includes("Rochiere")), "Coach erkennt fehlende Rochade");
assert.equal(T.toPgn([{ color: "w", san: "e4" }, { color: "b", san: "e5" }]), "1. e4 e5 *", "PGN wird aus dem Partieverlauf erzeugt");

assert.equal(E.DIFFICULTY_LEVELS.length, 8, "Acht fein abgestufte Spielstärken sind verfügbar");
for (let index = 1; index < E.DIFFICULTY_LEVELS.length; index++) {
  assert.ok(E.DIFFICULTY_LEVELS[index].depth >= E.DIFFICULTY_LEVELS[index - 1].depth, "Suchtiefe steigt nicht rückwärts");
  assert.ok(E.DIFFICULTY_LEVELS[index].timeMs >= E.DIFFICULTY_LEVELS[index - 1].timeMs, "Bedenkzeit steigt nicht rückwärts");
  assert.ok(E.DIFFICULTY_LEVELS[index].tolerance <= E.DIFFICULTY_LEVELS[index - 1].tolerance, "Fehlertoleranz sinkt mit der Spielstärke");
}
for (const level of E.DIFFICULTY_LEVELS) {
  const position = E.fromFEN("8/p7/8/3k4/8/4K3/7P/8 b - - 0 1");
  const choice = E.chooseMove(position, level.id);
  assert.ok(E.legalMoves(position).some((m) => m.from === choice.from && m.to === choice.to && m.promotion === choice.promotion), `KI-Zug (${level.id}) ist legal`);
}
const mateInOne = E.fromFEN("6k1/6pp/7Q/8/8/2B5/8/6K1 w - - 0 1");
const expertMove = E.chooseMove(mateInOne, "expert");
assert.equal(expertMove.from + expertMove.to, "h6g7", "Expertenstufe findet ein Matt in einem Zug");

console.log("Alle Schachregeln-Tests bestanden.");
