import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { execFileSync } from 'node:child_process';

const source = fs.readFileSync(new URL("./chess-engine.js", import.meta.url), "utf8");
const trainingSource = fs.readFileSync(new URL("./training-core.js", import.meta.url), "utf8");
const authoredData = JSON.parse(fs.readFileSync(new URL("./training-data.json", import.meta.url), "utf8"));
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
const trainingData = JSON.parse(JSON.stringify(generatedContext.window.CHESS_TRAINING_DATA));
execFileSync(process.execPath, [new URL('./build-training-data.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')]);
assert.equal(fs.readFileSync(new URL('./training-data.generated.js', import.meta.url), 'utf8'), generatedSource, 'Generator ist deterministisch und Browserdaten sind aktuell');
assert.deepEqual(trainingData.lessonContent, authoredData.lessonContent, 'Redaktionelle Quelle wird unverändert eingebunden');
assert.deepEqual(trainingData.endgames, authoredData.endgames);
assert.deepEqual(trainingData.masterclass, authoredData.masterclass);

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
assert.equal(T.updateRating(0, 0, 650), 0, "Lern-Elo startet bei null und kann nicht negativ werden");
assert.ok(T.updateRating(0, 1, 650) > 0, "Erster Erfolg baut Lern-Elo von null auf");
assert.equal(T.ratingStage(0).name, "Bauer", "Erste Aufbaustufe beginnt bei null");
assert.equal(T.ratingStage(400).name, "Springer", "Aufbaustufe wird korrekt bestimmt");
assert.equal(T.calculateMatchElo(undefined, 450, 0, 0).rating, 0, "Spiel-Elo startet bei null");
assert.equal(T.calculateMatchElo(0, 450, 0, 0).change, 0, "Spiel-Elo kann nicht unter null fallen");
assert.equal(T.calculateMatchElo(800, 800, 1, 0).change, 20, "Sieg gegen gleich starke KI erhöht die Start-Elo um 20");
assert.equal(T.calculateMatchElo(800, 800, .5, 0).change, 0, "Remis gegen gleich starke KI hält die Elo");
assert.equal(T.calculateMatchElo(800, 800, 0, 0).change, -20, "Niederlage gegen gleich starke KI senkt die Start-Elo um 20");
assert.ok(T.calculateMatchElo(800, 1200, 1, 0).change > T.calculateMatchElo(800, 800, 1, 0).change, "Überraschungssieg gegen stärkere KI wird höher bewertet");
const runningClock = T.advanceClock({ initialMs: 180000, w: 180000, b: 180000, lastTick: 1000, flagged: null }, 'w', 2600);
assert.equal(runningClock.w, 178400, 'Schachuhr zieht nur der aktiven Farbe die verstrichene Zeit ab');
assert.equal(runningClock.b, 180000, 'Schachuhr lässt die inaktive Farbe unverändert');
const expiredClock = T.advanceClock({ ...runningClock, lastTick: 2600, w: 500 }, 'w', 3200);
assert.equal(expiredClock.w, 0, 'Schachuhr fällt nicht unter null');
assert.equal(expiredClock.flagged, 'w', 'Zeitüberschreitung merkt sich die verlierende Farbe');
assert.deepEqual(T.advanceClock(expiredClock, 'b', 5000), expiredClock, 'Abgelaufene Uhr bleibt gestoppt');
const incrementedClock = T.addClockIncrement({ initialMs: 180000, incrementMs: 2000, w: 178400, b: 180000, lastTick: 2600, flagged: null }, 'w');
assert.equal(incrementedClock.w, 180400, 'Fischer-Inkrement wird nach einem legalen Zug gutgeschrieben');
assert.equal(T.addClockIncrement({ ...incrementedClock, flagged: 'w' }, 'w').w, 180400, 'Nach Zeitüberschreitung gibt es kein Inkrement');
assert.equal(T.matchViewColor('ai', 'b', 'w'), 'b', 'Gegen die KI bleibt die gewählte Spielerperspektive erhalten');
assert.equal(T.matchViewColor('hotseat', 'w', 'w'), 'w', 'Hot Seat zeigt Weiß unten, wenn Weiß am Zug ist');
assert.equal(T.matchViewColor('hotseat', 'w', 'b'), 'b', 'Hot Seat dreht das Brett für den schwarzen Zug');
let navigationPosition = E.fromFEN();
const navigationMoves = [];
for (const code of ["e2e4", "e7e5"]) {
  const move = E.legalMoves(navigationPosition).find((candidate) => candidate.from + candidate.to === code);
  navigationMoves.push({ ...move }); navigationPosition = E.applyMove(navigationPosition, move);
}
const navigationEnd = E.toFEN(navigationPosition);
navigationPosition = E.undo(E.undo(navigationPosition));
assert.equal(E.toFEN(navigationPosition), E.START_FEN, "Zurück stellt die Ausgangsposition wieder her");
for (const savedMove of navigationMoves) {
  const move = E.legalMoves(navigationPosition).find((candidate) => candidate.from === savedMove.from && candidate.to === savedMove.to && (candidate.promotion || "") === (savedMove.promotion || ""));
  navigationPosition = E.applyMove(navigationPosition, move);
}
assert.equal(E.toFEN(navigationPosition), navigationEnd, "Vor stellt dieselbe Partieposition exakt wieder her");
assert.equal(T.classifyMoveLoss(0).id, "best", "Verlustfreier Zug gilt als bester Zug");
assert.equal(T.classifyMoveLoss(60).id, "inaccuracy", "Moderater Bewertungsverlust gilt als Ungenauigkeit");
assert.equal(T.classifyMoveLoss(250).id, "blunder", "Großer Bewertungsverlust gilt als grober Fehler");

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
const blackReview = T.coachReview([
  { color: "w", san: "Bxh6", playerMaterialBefore: 3900, playerMaterialAfter: 3570 },
  { color: "b", san: "O-O", playerMaterialBefore: 3570, playerMaterialAfter: 3570 }
], undefined, "b");
assert.ok(blackReview.improvements.some((text) => text.includes("Figur verloren")), "Coach erkennt Materialverlust des schwarzen Spielers");
assert.ok(blackReview.strengths.some((text) => text.includes("Rochade")), "Coach erkennt die schwarze Rochade");
assert.equal(T.toPgn([{ color: "w", san: "e4" }, { color: "b", san: "e5" }]), "1. e4 e5 *", "PGN wird aus dem Partieverlauf erzeugt");
const importedTokens = T.pgnMoveTokens('[Event "Test"]\n\n1. e4 {Zentrum} e5 (1... c5) 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O $1 1-0');
assert.equal([...importedTokens].join(" "), "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O", "PGN-Import entfernt Kopfzeilen, Kommentare, Varianten, NAGs und Ergebnis");
let importedPosition = E.fromFEN();
for (const token of importedTokens) {
  const move = T.resolvePgnMove(E, importedPosition, token);
  assert.ok(move, `PGN-Zug ${token} wird eindeutig und legal aufgelöst`);
  importedPosition = E.applyMove(importedPosition, move);
}
assert.equal(importedPosition.board[E.coords("g1")[0]][E.coords("g1")[1]], "K", "PGN-Rochade setzt den König korrekt nach g1");
assert.equal(T.resolvePgnMove(E, E.fromFEN(), "Qh9"), null, "Ungültige PGN-Züge werden abgewiesen");

assert.equal(E.DIFFICULTY_LEVELS.length, 8, "Acht fein abgestufte Spielstärken sind verfügbar");
for (let index = 1; index < E.DIFFICULTY_LEVELS.length; index++) {
  assert.ok(E.DIFFICULTY_LEVELS[index].rating > E.DIFFICULTY_LEVELS[index - 1].rating, "Computer-Elo steigt mit der Spielstärke");
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

const openingHint = E.analyzePosition(E.fromFEN(), { depth: 2, timeMs: 250, multiPv: 3 });
assert.ok(openingHint.move, "Analyse liefert aus der Grundstellung einen Hinweis");
assert.ok(E.legalMoves(E.fromFEN()).some((move) => move.from === openingHint.move.from && move.to === openingHint.move.to), "Hinweiszug ist legal");
assert.ok(openingHint.alternatives.length >= 1 && openingHint.alternatives.length <= 3, "Analyse liefert begrenzte Alternativen");
assert.ok(Number.isFinite(openingHint.score), "Analyse liefert eine Stellungsbewertung");
assert.equal(openingHint.scoredMoves.length, E.legalMoves(E.fromFEN()).length, "Analyse bewertet jeden legalen Kandidaten");

const mateHint = E.analyzePosition(mateInOne, { depth: 2, timeMs: 250 });
assert.equal(mateHint.move.from + mateHint.move.to, "h6g7", "Zughilfe erkennt Matt in einem Zug");
const finishedHint = E.analyzePosition(cleanMate, { depth: 2, timeMs: 100 });
assert.equal(finishedHint.move, null, "Beendete Stellungen erzeugen keinen Hinweiszug");

const expectedOpenings = ['italian','ruy-lopez','scotch','four-knights','vienna','kings-gambit','sicilian-open','sicilian-alapin','french','caro-kann','scandinavian','pirc','queens-gambit','qgd','qga','london','colle','catalan','slav','kings-indian','nimzo-indian','dutch','english','reti','modern'];
assert.deepEqual(trainingData.openings.map((r) => r.id), expectedOpenings, 'Genau die 25 bisherigen Eröffnungs-IDs');
assert.equal(trainingData.tactics.length, 32);
for (const category of ['fork','pin','skewer','discovered']) {
  assert.deepEqual(trainingData.tactics.filter((r) => r.category === category).map((r) => r.id), Array.from({length: 5}, (_, i) => `${category}-0${i + 1}`));
  assert.ok(trainingData.lessonContent.motifs[category].includes('Konter:'));
}
for (const category of ['mate1','mate2','material']) {
  assert.deepEqual(trainingData.tactics.filter((r) => r.category === category).map((r) => r.id), Array.from({length: 4}, (_, i) => `${category}-0${i + 1}`));
}
let scenarioCount = 0, stepCount = 0, completions = 0;
for (const record of [...trainingData.tactics, ...trainingData.openings]) {
  assert.equal(T.validateLesson(E, record).length, 0, `Alle Schritte und Vergleiche von ${record.id} gültig`);
  assert.deepEqual(record.lesson.scenarios.map((s) => s.id), ['mate1','mate2','material'].includes(record.category) ? ['main'] : ['main', 'defense', 'counter']);
  assert.deepEqual(record.lesson.scenarios[0].line, record.line);
  for (const scenario of record.lesson.scenarios) {
    scenarioCount++; stepCount += scenario.line.length;
    assert.ok(scenario.steps.some((step) => step.mistakes?.length), `${record.id}/${scenario.id}: geprüftes Vergleichsbeispiel`);
    for (const phase of ['demo', 'guided', 'practice']) {
      const session = T.createLessonSession(E, record, { scenario: scenario.id, phase });
      let emitted = 0;
      while (session.ply < scenario.line.length) {
        const view = T.getLessonView(session);
        if (view.status === 'awaiting-user') {
          const fen = E.toFEN(session.game);
          const bad = E.legalMoves(session.game).find((m) => m.from + m.to + (m.promotion || '') !== view.expected);
          if (bad) {
            assert.equal(T.submitLessonMove(session, bad).correct, false);
            assert.equal(E.toFEN(session.game), fen, 'Falscher legaler Zug verändert die Stellung nicht');
          }
          assert.equal(T.advanceLesson(session).needsHelp, true, 'Weiter überspringt keinen eigenen Zug');
        }
        const result = view.status === 'awaiting-user' ? T.submitLessonMove(session, view.expected) : T.advanceLesson(session);
        assert.equal(result.correct, true, `${record.id}/${scenario.id}/${phase}/${session.ply}`);
        if (session.ply < scenario.line.length) assert.equal(result.completion, null, 'Kein vorzeitiger Abschluss');
        if (result.completion) { emitted++; assert.equal(result.completion.scored, phase === 'practice'); }
      }
      assert.equal(emitted, 1); completions++;
      assert.equal(T.advanceLesson(session).completion, undefined, 'Kein zweites Abschlussereignis');
      const endFen = E.toFEN(session.game);
      T.seekLesson(session, 0);
      assert.equal(session.game.history.length, 0);
      T.seekLesson(session, scenario.line.length);
      assert.equal(E.toFEN(session.game), endFen, 'Seek rekonstruiert exakt');
      const replay = T.restartLesson(session);
      assert.equal(replay.ply, 0);
      assert.equal(replay.assisted, true, 'Neustart nach gesehener Linie ist unterstützt');
    }
    const explanation = T.createLessonSession(E, record, { scenario: scenario.id, phase: 'explain' });
    assert.equal(T.getLessonView(explanation).status, 'explaining');
    const fen = E.toFEN(explanation.game);
    assert.equal(T.advanceLesson(explanation).correct, false);
    assert.equal(E.toFEN(explanation.game), fen);
  }
}
assert.equal(scenarioCount, 147);
assert.equal(completions, 441);
for (const record of trainingData.tactics.filter((item) => ['fork','pin','skewer','discovered'].includes(item.category))) {
  const main = record.lesson.scenarios[0];
  let before = T.scenarioStart(E, record, main), after = before;
  for (const code of main.line) after = play(after, code);
  const gain = T.materialFor(E, after, 'w') - T.materialFor(E, after, 'b') - (T.materialFor(E, before, 'w') - T.materialFor(E, before, 'b'));
  const expected = record.id === 'fork-01' ? 1000 : record.id === 'fork-02' ? 500 : record.category === 'fork' ? 900 : record.category === 'pin' ? 400 : record.id === 'skewer-01' ? 900 : ['skewer-02','skewer-03'].includes(record.id) ? 570 : record.category === 'skewer' ? 400 : record.id === 'discovered-01' ? 500 : ['discovered-02','discovered-03'].includes(record.id) ? 670 : 580;
  assert.equal(gain, expected, `${record.id}: Materialbilanz inklusive Rückschlägen`);
  assert.ok(E.gameStatus(after).over || !E.legalMoves(after).some((m) => m.capture && ['n','b','r','q'].includes(E.typeOf(m.capture))), `${record.id}: Hauptlinie endet nicht vor einem unmittelbaren Figurenrückschlag (außer die Partie ist schon Remis)`);
  if (record.category === 'pin' || ['discovered-04','discovered-05'].includes(record.id) || (record.category === 'fork' && record.id !== 'fork-01')) assert.equal(E.gameStatus(after).type, 'insufficient', 'Materialgewinn nicht als Partiegewinn ausgeben');
  if (record.category === 'skewer') {
    const first = play(before, main.line[0]);
    assert.ok(!E.legalMoves(first).some((m) => m.to === main.line[0].slice(2,4) && m.capture && E.typeOf(m.capture) !== 'p'), 'Gedeckter Spießangreifer nicht vom König schlagbar');
  }
}
for (const record of trainingData.tactics.filter((item) => ['fork','pin','skewer','discovered'].includes(item.category))) {
  const defense = record.lesson.scenarios[1];
  let position = T.scenarioStart(E, record, defense);
  for (const code of defense.line) position = play(position, code);
  assert.ok(!E.legalMoves(position).some((m) => m.capture === 'q' || (record.id === 'fork-02' && m.capture === 'r')), `${record.id}: Abwehr rettet das ursprünglich zweite Ziel wirklich`);
}
for (const [category, expected] of [['fork',220],['pin',180],['skewer',330],['discovered',230]]) {
  const scenario = trainingData.tactics.find((r) => r.category === category).lesson.scenarios[2];
  let start = E.fromFEN(scenario.startFen), end = start;
  for (const code of scenario.line) end = play(end, code);
  assert.equal((T.materialFor(E,end,'b')-T.materialFor(E,end,'w')) - (T.materialFor(E,start,'b')-T.materialFor(E,start,'w')), expected);
}
for (const record of trainingData.tactics.filter((item) => item.category === 'mate1')) {
  assert.equal(record.line.length, 1, `${record.id}: Matt in 1 hat genau einen Halbzug`);
  assert.equal(E.gameStatus(play(E.fromFEN(record.fen), record.line[0])).type, 'checkmate', `${record.id}: Lösungszug setzt matt`);
}
for (const record of trainingData.tactics.filter((item) => item.category === 'mate2')) {
  assert.equal(record.line.length, 3, `${record.id}: Matt in 2 enthält zwei eigene Züge und eine Antwort`);
  const start = E.fromFEN(record.fen);
  const afterKey = play(start, record.line[0]);
  for (const reply of E.legalMoves(afterKey)) {
    const afterReply = E.applyMove(afterKey, reply);
    assert.ok(E.legalMoves(afterReply).some((move) => E.gameStatus(E.applyMove(afterReply, move)).type === 'checkmate'), `${record.id}: Schlüsselzug erzwingt Matt gegen jede Antwort`);
  }
  let position = start;
  for (const code of record.line) position = play(position, code);
  assert.equal(E.gameStatus(position).type, 'checkmate', `${record.id}: Lösungsfolge endet matt`);
}
for (const [record, expected] of trainingData.tactics.filter((item) => item.category === 'material').map((item, index) => [item, [900, 500, 900, 400][index]])) {
  let start = E.fromFEN(record.fen), end = start;
  for (const code of record.line) end = play(end, code);
  const gain = (T.materialFor(E,end,'w') - T.materialFor(E,end,'b')) - (T.materialFor(E,start,'w') - T.materialFor(E,start,'b'));
  assert.equal(gain, expected, `${record.id}: versprochener Materialgewinn stimmt`);
}
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
  const square = E.sq(r,c), a = T.arrowPoint(E,square), b = T.arrowPoint(E,square,true);
  assert.equal(a.x,c+.5); assert.equal(a.y,r+.5);
  assert.equal(b.x,7-c+.5); assert.equal(b.y,7-r+.5);
  assert.equal(a.x+b.x,8); assert.equal(a.y+b.y,8);
}
const lessonReview = { openError: true, errors: 3 };
T.setLessonReviewState(lessonReview, 'counter', false);
assert.equal(lessonReview.openError, true, 'Ein Kontererfolg schließt keinen offenen Hauptlinienfehler');
T.setLessonReviewState(lessonReview, 'main', false);
assert.equal(lessonReview.openError, false, 'Auch eine unterstützte fehlerfreie Wiederholung schließt den Wiederholungsbedarf');
T.setLessonReviewState(lessonReview, 'defense', true);
T.setLessonReviewState(lessonReview, 'main', false);
assert.equal(lessonReview.openError, true, 'Offener Abwehrfehler bleibt unabhängig von der Hauptlinie erhalten');
assert.equal(lessonReview.errors, 3, 'Die Fehlerhistorie bleibt erhalten');
const blackRows = T.moveRows([{ color: 'b', san: 'Qe8' }, { color: 'w', san: 'Nxf7+' }, { color: 'b', san: 'Kf8' }], 7);
assert.equal(blackRows[0].number, 7); assert.equal(blackRows[0].white, ''); assert.equal(blackRows[0].black, 'Qe8');
assert.equal(blackRows[1].number, 8); assert.equal(blackRows[1].white, 'Nxf7+'); assert.equal(blackRows[1].black, 'Kf8');
const legacy = T.normalizeProgress({totalSolved:7,puzzles:{old:{errors:2,attempts:3,successes:1}}, ratings:{tactics:912}});
assert.equal(legacy.totalSolved,7); assert.equal(legacy.ratings.tactics,912);
assert.equal(legacy.puzzles.old.openError,true); assert.equal(Object.keys(legacy.lessons).length,0);
assert.equal(T.isReviewDue(legacy.puzzles.old, '2026-10-07'), true, 'Alte Aufgaben ohne Termin sind sofort fällig');
const untouchedOldDefault = T.normalizeProgress({ratings:{tactics:800,endgame:800,strategy:800,openings:800}});
assert.deepEqual(Object.values(untouchedOldDefault.ratings), [0,0,0,0], 'Unberührter alter Standardwert wird auf den neuen Nullstart migriert');
const spaced = {};
T.scheduleReview(spaced, 'success', '2026-10-07');
assert.equal(spaced.reviewStage, 1); assert.equal(spaced.nextReview, '2026-10-08');
T.scheduleReview(spaced, 'success', '2026-10-08');
assert.equal(spaced.reviewStage, 2); assert.equal(spaced.nextReview, '2026-10-11');
assert.equal(T.isReviewDue(spaced, '2026-10-10'), false); assert.equal(T.isReviewDue(spaced, '2026-10-11'), true);
T.scheduleReview(spaced, 'failure', '2026-10-11');
assert.equal(spaced.reviewStage, 0); assert.equal(spaced.nextReview, '2026-10-11'); assert.equal(spaced.lapses, 1);
T.scheduleReview(spaced, 'assisted', '2026-10-11');
assert.equal(spaced.reviewStage, 0); assert.equal(spaced.nextReview, '2026-10-11', 'Unterstützte Korrektur bleibt am selben Tag fällig');
assert.equal(T.reviewDueLabel({nextReview:'2026-10-08'}, '2026-10-07'), 'morgen fällig');
assert.equal(T.normalizeProgress({gameMistakes:"kaputt"}).gameMistakes.length, 0, "Beschädigter Partiefehlerspeicher wird repariert");
const repairedThinking = T.normalizeProgress({thinkingCoach:"kaputt"}).thinkingCoach;
assert.equal(repairedThinking.attempts, 0, "Beschädigte Denk-Check-Versuche werden repariert");
assert.equal(repairedThinking.correct, 0, "Beschädigte Denk-Check-Treffer werden repariert");
const plausibleThinking = T.normalizeProgress({thinkingCoach:{attempts:3,correct:8}}).thinkingCoach;
assert.equal(plausibleThinking.attempts, 3); assert.equal(plausibleThinking.correct, 3, "Denk-Check-Treffer bleiben plausibel");
const learnedMistake = T.normalizeProgress({gameMistakes:[{fen:E.START_FEN,best:'e2e4',seenCount:-2,lastSeenAt:'kaputt'}]}).gameMistakes[0];
assert.equal(learnedMistake.seenCount, 1); assert.equal(learnedMistake.lastSeenAt, 0); assert.equal(learnedMistake.reviewStage, 0);
for (const corrupt of [null, [], 1, 'bad', {ratings:[],puzzles:{bad:null},themes:{bad:3},count:'x'}]) {
  const safe = T.normalizeProgress(corrupt);
  assert.equal(Number.isFinite(safe.count),true); assert.equal(Number.isFinite(safe.ratings.openings),true);
}
// Special move metadata is recovered from legalMoves, never trusted from input.
for (const [fen, line] of [
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',['e1g1','e8c8']],
  ['7k/8/8/3pP3/8/8/6K1/8 w - d6 0 1',['e5d6','h8g8']],
  ['7k/P7/8/8/8/8/6K1/8 w - - 0 1',['a7a8n']]
]) {
  const record = {id:'special',fen,line};
  const session = T.createLessonSession(E,record,{phase:'practice'});
  for (const code of line) {
    const view = T.getLessonView(session);
    const result = view.status === 'awaiting-user' ? T.submitLessonMove(session,{from:code.slice(0,2),to:code.slice(2,4),promotion:code[4]}) : T.advanceLesson(session);
    assert.equal(result.correct,true);
  }
  const fenEnd = E.toFEN(session.game);
  T.seekLesson(session,0); T.seekLesson(session,line.length); assert.equal(E.toFEN(session.game),fenEnd);
}
console.log(`Alle Tests bestanden: 57 Lektionen, ${scenarioCount} Szenarien, ${stepCount} annotierte Halbzüge, ${completions} Phasenabschlüsse; Regeln, Material, Vergleiche, Navigation, Orientierung und Legacy-Fortschritt.`);
