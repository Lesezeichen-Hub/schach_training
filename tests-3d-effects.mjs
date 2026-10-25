import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// Deterministic lifecycle checks; actual shader rendering is checked in a browser.
let now = 0, sequence = 0, reduced = false, maximumInstances = 0, kicks = 0;
const frames = new Map();
const gl = new Proxy({
  getShaderParameter: () => true, getProgramParameter: () => true,
  checkFramebufferStatus: () => 1, getParameter: () => 1024,
  getUniformLocation: () => ({}),
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
const view = context.window.Chess3DView.create(canvas);
assert.ok(view?.available);
const board = Array.from({ length: 8 }, () => Array(8).fill(null));
board[7][4] = "K"; board[0][4] = "k"; board[4][4] = "Q"; board[3][3] = "r";
const update = () => view.update({ board, flipped: false, highlights: {}, movable: new Set(["e4"]) });
const step = milliseconds => { now += milliseconds; const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now); };
update();
const move = { from: "e4", to: "d5", piece: "Q", capturedPiece: "r", captureSquare: "d5", effectKind: "capture", duration: 1000, effects: true };

let impacts = 0, completions = 0;
view.animateMove({ ...move, onImpact: () => impacts++ }, () => completions++);
step(680); assert.equal(impacts, 1); assert.equal(completions, 0);
step(80);
assert.ok(maximumInstances >= 180, "Schlag erzeugt keine dichte Trümmerwolke");
step(400); assert.equal(completions, 1);
step(3000); assert.equal(frames.size, 0, "Abgeschlossene Effekte halten die Render-Schleife am Leben");
assert.equal(impacts, 1); assert.equal(completions, 1);
assert.ok(maximumInstances <= 1800, "Partikelbudget wird überschritten");

const fast = view.animateMove({ ...move, onImpact: () => impacts++ }, () => completions++);
step(50); fast.finish(); fast.finish();
assert.equal(impacts, 2); assert.equal(completions, 2, "Abschlussfrist führt einen Zug doppelt aus");
step(3000); assert.equal(frames.size, 0);

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
step(120); step(120); step(3000);
assert.equal(completions, 6, "Direkt aufeinanderfolgende Animationen blockieren einander");
assert.equal(frames.size, 0);
view.signalSquare("e4", "Q"); assert.ok(frames.size > 0);
view.clearEffects(); assert.equal(frames.size, 0);
console.log("Effektschach: Schlag, Partikelbudget, Abschlussfrist, Abbruch, Aus-Schalter, reduzierte Bewegung und Folgeanimationen bestanden.");
