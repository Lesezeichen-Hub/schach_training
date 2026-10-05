import fs from "node:fs";
import vm from "node:vm";

const sourceUrl = new URL("./training-data.json", import.meta.url);
const targetUrl = new URL("./training-data.generated.js", import.meta.url);
const data = JSON.parse(fs.readFileSync(sourceUrl, "utf8"));
const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('./chess-engine.js', import.meta.url), 'utf8'), context);
vm.runInContext(fs.readFileSync(new URL('./training-core.js', import.meta.url), 'utf8'), context);
const E = context.globalThis.ChessEngine, T = context.globalThis.ChessTraining;
const content = data.lessonContent;
const names = { k: 'König', q: 'Dame', r: 'Turm', b: 'Läufer', n: 'Springer', p: 'Bauer' };
function annotate(record, scenario, notes = []) {
	let game = T.scenarioStart(E, record, scenario);
	scenario.steps = scenario.line.map((code, index) => {
		const move = T.legalUci(E, game, code);
		if (!move) throw new Error(`${record.id}/${scenario.id}/${index}: ${code} illegal in ${E.toFEN(game)}`);
		const [r, c] = E.coords(move.from), piece = game.board[r][c];
		const side = game.turn === 'w' ? 'Weiß' : 'Schwarz';
		const san = E.notation(game, move);
		const next = E.applyMove(game, move);
		const check = E.inCheck(next, next.turn);
		const purpose = notes[index] || content.movePurposes[code] || (move.castle ? 'Sichert den König durch Rochade und aktiviert gleichzeitig den Turm.' : move.capture ? `Nimmt ${names[E.typeOf(move.capture)]} auf ${move.to}; Material, geöffnete Linien und mögliche Rückschläge müssen gemeinsam gerechnet werden.` : (E.typeOf(piece) === 'k' ? `Bringt den König nach ${move.to} außerhalb des aktuellen Angriffs; die andere bedrohte Figur wird dadurch nicht automatisch gerettet.` : `Stellt ${names[E.typeOf(piece)]} nach ${move.to} und verändert dort die Kontrolle über die erreichbaren Felder. Das Szenarioziel bleibt: ${scenario.purpose}`));
		const responseCode = scenario.line[index + 1];
		const response = responseCode ? T.legalUci(E, next, responseCode) : null;
		const consequence = check ? 'Der gegnerische König steht im Schach: Die nächste Antwort muss das Schach beseitigen.' : move.capture ? 'Der Materialtausch ist ausgeführt; prüfe jetzt, ob eine Rücknahme möglich ist.' : 'Kein Schachtempo: Die andere Seite kann ihren Entwicklungs- oder Abwehrplan verfolgen.';
		const step = { move: code, side: game.turn, piece: names[E.typeOf(piece)], before: `${side}: ${names[E.typeOf(piece)]} ${move.from} → ${move.to} (${san}). ${purpose}`, after: `${consequence} ${response ? `Kuratierte gegnerische Antwort: ${E.notation(next, response)} (${response.from} → ${response.to}).` : `Ende dieses Ausschnitts: ${scenario.outcome}`}`, hint: purpose, visual: { arrows: [{ from: move.from, to: move.to, kind: scenario.id === 'main' ? 'move' : scenario.id, label: `${scenario.title}: ${san}` }], squares: [move.from, move.to] } };
		// Explicit neutral comparison: legality is checked, but no false blunder claim is made.
		const alternative = E.legalMoves(game).find((candidate) => candidate.from === move.from && candidate.from + candidate.to + (candidate.promotion || '') !== code);
		if (alternative) step.mistakes = [{ move: alternative.from + alternative.to + (alternative.promotion || ''), reply: [], text: `${alternative.from} → ${alternative.to} ist eine legale Abweichung, aber führt nicht die ausgewählte Lehrfolge aus. Keine Behauptung, dass der Zug verliert. Vergleiche das Ziel dieses Schrittes: ${purpose}` }];
		game = next;
		return step;
	});
	return scenario;
}
for (const record of data.tactics) {
	const edit = content.tactics[record.id];
	if (JSON.stringify(record.line) !== JSON.stringify(edit.line) || (edit.fen && record.fen !== edit.fen)) throw new Error(`${record.id}: Basisdatensatz und Lektionsredaktion widersprechen sich`);
	record.fen = edit.fen || record.fen;
	record.line = edit.line;
	record.explanation = edit.first;
	const comparison = content.comparisons[record.category];
	const blackFen = record.fen.replace(' w ', ' b ');
	const main = { id: 'main', title: 'Hauptlinie', purpose: record.prompt, learnerSide: 'w', startPly: 0, line: record.line, outcome: edit.outcome };
	const defense = { id: 'defense', title: 'Abwehr · vorher reagieren', purpose: 'Vor dem weißen Angriff das bedrohte Ziel retten oder den Angreifer beseitigen.', learnerSide: 'b', startFen: blackFen, line: edit.defense, outcome: 'Schwarz reagiert einen Zug früher. Das ursprüngliche Doppelziel ist aufgehoben; daraus folgt keine pauschale Bewertung der Reststellung.' };
	const counter = { id: 'counter', title: 'Konter · Vergleichsstellung', purpose: 'Die Voraussetzungen des Motivs prüfen und den fehlerhaften Angriff konkret beantworten.', learnerSide: 'b', startFen: comparison.startFen, line: comparison.line, outcome: comparison.outcome, comparison: true };
	record.lesson = { revision: content.revision, goal: record.prompt, intro: content.motifs[record.category], scenarios: [annotate(record, main, [edit.first]), annotate(record, defense), annotate(record, counter, comparison.notes)] };
	main.steps[0].mistakes = [{ move: content.tacticMistakes[record.id], reply: [edit.defense[0]], text: `Der ruhige Königszug verzichtet auf das taktische Tempo. Die Gegenseite kann ${edit.defense[0].slice(0,2)} → ${edit.defense[0].slice(2,4)} spielen und das ursprüngliche Motiv aufheben. Warum ist die Schach- oder Schlagfolge hier zeitkritisch?`, curated: true }];
	// Explicit motif arrows: the landing square attacks the two aligned targets;
	// in an Abzug, the stationary line piece attacks the queen after the blocker leaves.
	const initial = E.fromFEN(record.fen);
	const first = main.line[0], landing = first.slice(2,4);
	const targets = [];
	for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
		const p = initial.board[r][c];
		if (p && E.colorOf(p) === 'b' && (E.typeOf(p) === 'q' || E.typeOf(p) === 'k' || (record.id === 'fork-02' && E.typeOf(p) === 'r'))) targets.push({piece:p,square:E.sq(r,c)});
	}
	if (record.category !== 'pin') {
		for (const target of targets) {
			let from = landing;
			if (record.category === 'discovered' && E.typeOf(target.piece) === 'q') {
				const blockerType = E.typeOf(initial.board[E.coords(first.slice(0,2))[0]][E.coords(first.slice(0,2))[1]]);
				for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (initial.board[r][c] === (blockerType === 'n' ? 'B' : 'R')) from = E.sq(r,c);
			}
			main.steps[0].visual.arrows.push({from,to:target.square,kind:'attack',label:`Angriff auf ${names[E.typeOf(target.piece)]} ${target.square}`});
		}
	}
}
for (const record of data.openings) {
	const branches = content.openingBranches[record.id];
	const main = { id: 'main', title: 'Hauptlinie', purpose: record.ideas.join(' · '), learnerSide: record.side, startPly: 0, line: record.line, outcome: `${record.name}: Der Repertoireausschnitt ist abgeschlossen. Weiterer Plan: ${record.ideas.join(' · ')}. Kein forcierter Gewinn wird behauptet.` };
	const defense = { id: 'defense', title: 'Abwehr', purpose: branches.defenseGoal, learnerSide: record.side === 'w' ? 'b' : 'w', startPly: branches.startPly, line: branches.defense, outcome: `${branches.defenseGoal} Der Ausschnitt endet hier; andere legale Antworten bleiben möglich.` };
	const counter = { id: 'counter', title: 'Gegenspiel', purpose: branches.counterGoal, learnerSide: record.side, startPly: branches.startPly, line: branches.counter, outcome: `${branches.counterGoal} Kein Vollvariantenbaum und kein Gewinnbeweis.` };
	record.lesson = { revision: content.revision, goal: record.name, intro: `${record.ideas.join(' · ')}. Zu beachten: ${record.warning}`, scenarios: [annotate(record, main), annotate(record, defense), annotate(record, counter)] };
	main.steps[record.side === 'b' ? 1 : 0].mistakes = [{...content.openingMistakes[record.side], curated: true}];
}
for (const record of [...data.tactics, ...data.openings]) {
	const errors = T.validateLesson(E, record);
	if (errors.length) throw new Error(errors.join('\n'));
}
fs.writeFileSync(targetUrl, `/* Generated from training-data.json – do not edit manually. */\nwindow.CHESS_TRAINING_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");
console.log(`Trainingsdaten generiert: ${data.tactics.length} Taktikaufgaben, ${data.openings.length} Eröffnungen, ${data.endgames.length} Endspiele`);
