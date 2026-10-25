import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("./backup.js", import.meta.url), "utf8"), context);
const backup = context.ChessBackup;

function storage(initial = {}, failOn = null) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { if (key === failOn) throw new Error("Quota exceeded"); values.set(key, value); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); }
  };
}

const source = storage({
  "schachwerkstatt-progress": JSON.stringify({ lessons: { sample: { completions: { main: 2 } } }, ratings: { tactics: 123 } }),
  "schachwerkstatt-games": JSON.stringify([{ id: "match-1", moves: [{ uci: "e2e4" }] }]),
  "schachwerkstatt-saved-positions": JSON.stringify([{ id: "position-1", fen: "8/8/8/8/8/8/8/8 w - - 0 1" }]),
  "schachwerkstatt-3d-effects": "off",
  "schachwerkstatt-future-setting": "kept",
  "other-app-data": "private"
});
const archive = backup.parse(JSON.stringify(backup.create(source, "4.33.0")));
assert.equal(archive.data["other-app-data"], undefined);
assert.equal(Object.keys(archive.data).length, 5);
const destination = storage({ "schachwerkstatt-old-setting": "obsolete", "other-app-data": "untouched" });
backup.restore(destination, archive);
assert.equal(destination.getItem("other-app-data"), "untouched");
assert.equal(destination.getItem("schachwerkstatt-old-setting"), null);
for (const [key, value] of Object.entries(archive.data)) assert.equal(destination.getItem(key), value);

for (const bad of [
  "not JSON",
  JSON.stringify({ ...archive, format: "unrelated" }),
  JSON.stringify({ ...archive, data: { "other-app-data": "overwrite" } }),
  JSON.stringify({ ...archive, data: { "schachwerkstatt-games": "broken" } })
]) assert.throws(() => backup.parse(bad));

const limited = storage({ "schachwerkstatt-progress": "{}", "other-app-data": "safe" }, "schachwerkstatt-games");
const before = limited.snapshot();
assert.throws(() => backup.restore(limited, archive), /wiederhergestellt/);
assert.deepEqual(limited.snapshot(), before, "Fehlgeschlagener Import muss die bisherigen Daten wiederherstellen");
console.log("Backup: vollständiger Export, Import, fremde Browserdaten, ungültige Dateien und Rollback bestanden.");
