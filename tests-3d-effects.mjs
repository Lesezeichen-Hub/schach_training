import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// Deterministic lifecycle checks; actual shader rendering is checked in a browser.
let now = 0, sequence = 0, reduced = false, maximumInstances = 0, kicks = 0, upload = null;
const frames = new Map();
const gl = new Proxy({
  getShaderParameter: () => true, getProgramParameter: () => true,
  checkFramebufferStatus: () => 1, getParameter: () => 1024,
  getUniformLocation: () => ({}),
  bufferData: (_target, values) => { upload = values; },
  drawElementsInstanced: (_mode, _count, _type, _offset, instances) => { maximumInstances = Math.max(maximumInstances, instances); }
}, { get(target, key) { return key in target ? target[key] : /^[A-Z_0-9]+$/.test(key) ? 1 : String(key).startsWith("create") ? () => ({}) : () => {}; } });
const canvas = {
  width: 640, height: 640, clientWidth: 640, clientHeight: 640, hidden: false,
  getContext: () => gl, addEventListener() {},
  animate() { kicks++; return { cancel() {} }; }
};
const context = vm.createContext({
  window: { matchMedia: () => ({ matches: reduced }) }, devicePixelRatio: 1,
  performance: { now: () => now }, ResizeObserver: class { observe() {} },
  requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
  cancelAnimationFrame(id) { frames.delete(id); }
});
vm.runInContext(fs.readFileSync(new URL("./chess-3d.js", import.meta.url), "utf8"), context);
let debrisImpacts = 0;
const view = context.window.Chess3DView.create(canvas, { onDebrisImpact: () => debrisImpacts++ });
assert.ok(view?.available);
const pose = context.window.Chess3DView.combatPose;
for (const type of ['p','n','b','r','q','k']) {
  assert.ok(pose(.06,type,true).travel < 0, 'Angreifer holt nicht aus');
  const contact = pose(.66,type,true);
  assert.equal(contact.travel,1,'Explosion beginnt vor Erreichen des Gegners');
  assert.equal(contact.lift,0,'Angreifer schwebt beim Einschlag');
  assert.ok(contact.vertical<1,'Bodenkontakt hat keinen sichtbaren Impuls');
  assert.equal(pose(1,type,true).lift,0); assert.equal(pose(1,type,true).vertical,1);
}
assert.ok(pose(.39,'n',true).lift > pose(.39,'r',true).lift * 3);
assert.equal(new Set(['p','n','b','r','q','k'].map(type => JSON.stringify(pose(.39,type,true)))).size,6);
assert.ok(pose(.39,'n',true).lateral > 0 && pose(.39,'b',true).lateral < 0);
for (const type of ['p','n','b','r','q','k']) {
  for (const progress of [.66,1]) {
    const p = pose(progress,type,true);
    assert.equal(p.lateral,0); assert.equal(p.yaw,0); assert.equal(p.tilt,0);
  }
}
const fragmentState = context.window.Chess3DView.fragmentState;
const fragment = { kind:'hot',stage:'body',delay:.15,height:.8,vx:1,vz:0,vy:1,life:2.5 };
assert.equal(fragmentState(fragment,.1).elapsed,0);
assert.equal(fragmentState(fragment,.1).x,0);
assert.ok(fragmentState(fragment,.5).heat > 0);
assert.equal(fragmentState(fragment,3).heat,0);
const hits = fragmentState(fragment,1).hitTimes;
assert.equal(fragmentState(fragment,hits[0]+fragment.delay+.001).hits,1);
assert.equal(fragmentState(fragment,hits[1]+fragment.delay+.001).hits,2);
const head = {...fragment,stage:'head',delay:0,clusterVX:2,clusterLift:1};
assert.equal(fragmentState(head,.05).flight,0);
assert.equal(fragmentState(head,.05).x,.1);
const base = {...fragment,stage:'base',delay:.32};
assert.equal(fragmentState(base,.25).elapsed,0);
assert.ok(fragmentState(fragment,.25).flight>0);
const board = Array.from({ length: 8 }, () => Array(8).fill(null));
board[7][4] = "K"; board[0][4] = "k"; board[4][4] = "Q"; board[3][3] = "r";
const update = () => view.update({ board, flipped: false, highlights: {}, movable: new Set(["e4"]) });
const step = milliseconds => { now += milliseconds; const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now); };
update();
const move = { from: "e4", to: "d5", piece: "Q", capturedPiece: "r", captureSquare: "d5", effectKind: "capture", duration: 1000, effects: true };

let impacts = 0, completions = 0;
view.animateMove({ ...move, onImpact: () => impacts++ }, () => completions++);
step(680); assert.equal(impacts, 1); assert.equal(completions, 0);
let bodyFragments = 0;
let fireBlocks = 0;
for (let i = 0; i < upload.length; i += 12) if (Math.abs(upload[i+3]-.0432)<.00001 && upload[i+1]>.3) bodyFragments++;
for (let i = 0; i < upload.length; i += 12) if (upload[i+6]>1 && upload[i+7]<upload[i+6] && upload[i+8]<upload[i+7]) fireBlocks++;
assert.ok(bodyFragments>60,'Geschlagene Figur wird nicht aus Körperfragmenten zerlegt');
assert.ok(fireBlocks>8,'Beim Vernichten fehlt der selbstleuchtende Feuerball');
step(80);
assert.ok(maximumInstances >= 180, "Schlag erzeugt keine dichte Trümmerwolke");
step(400); assert.equal(completions, 1);
for (let i=0;i<12;i++) step(100);
assert.ok(debrisImpacts>0,'Glühende Bruchstücke haben keine Aufprallgeräusche');
const previousDebrisImpacts = debrisImpacts; step(0);
assert.equal(debrisImpacts,previousDebrisImpacts,'Ein Aufprall wird mehrfach ausgelöst');
step(4000); assert.equal(frames.size, 0, "Abgeschlossene Effekte halten die Render-Schleife am Leben");
assert.equal(impacts, 1); assert.equal(completions, 1);
assert.ok(maximumInstances <= 1800, "Partikelbudget wird überschritten");

const fast = view.animateMove({ ...move, onImpact: () => impacts++ }, () => completions++);
step(50); fast.finish(); fast.finish();
assert.equal(impacts, 2); assert.equal(completions, 2, "Abschlussfrist führt einen Zug doppelt aus");
step(4000); assert.equal(frames.size, 0);

const cancelled = view.animateMove({ ...move, onImpact: () => impacts++ }, () => completions++);
cancelled.cancel(); step(2000);
assert.equal(impacts, 2); assert.equal(completions, 2); assert.equal(frames.size, 0);

view.setEffectsEnabled(false); const previousKicks = kicks;
view.signalSquare("e4", "Q"); assert.equal(frames.size, 0);
view.animateMove({ ...move, duration: 100, onImpact: () => impacts++ }, () => completions++);
step(110); assert.equal(completions, 3); assert.equal(impacts, 2); assert.equal(kicks, previousKicks);
assert.equal(frames.size, 0);

view.setEffectsEnabled(true); reduced = true;
view.signalSquare("e4", "Q"); assert.equal(frames.size, 0);
view.animateMove({ ...move, duration: 100, onImpact: () => impacts++ }, () => completions++);
step(110); assert.equal(completions, 4); assert.equal(impacts, 2); assert.equal(kicks, previousKicks);
reduced = false;

view.animateMove({ ...move, duration: 100 }, () => {
  completions++;
  view.animateMove({ ...move, duration: 100 }, () => completions++);
});
step(120); step(120); step(4000);
assert.equal(completions, 6, "Direkt aufeinanderfolgende Animationen blockieren einander");
assert.equal(frames.size, 0);
view.signalSquare("e4", "Q"); assert.ok(frames.size > 0);
view.clearEffects(); assert.equal(frames.size, 0);
view.animateMove({...move,duration:100},()=>{});step(80);step(500);
const beforeSwitchOff = debrisImpacts;
view.setEffectsEnabled(false); step(1000);
assert.equal(debrisImpacts,beforeSwitchOff); assert.equal(frames.size,0);
console.log("Effektschach: sechs Angriffsmuster, gestaffelter Zerfall, glühende Bruchstücke mit zwei Aufprallen, Feuerball, Partikelbudget, Abschlussfrist, Abbruch, Aus-Schalter, reduzierte Bewegung und Folgeanimationen bestanden.");
