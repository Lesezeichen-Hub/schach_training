(function (root) {
  "use strict";

  const FORMAT = "schachwerkstatt-backup";
  const PREFIX = "schachwerkstatt-";
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const MAX_ENTRIES = 64;
  const JSON_KEYS = new Map([
    ["schachwerkstatt-progress", "object"],
    ["schachwerkstatt-games", "array"],
    ["schachwerkstatt-saved-positions", "array"]
  ]);

  function entriesFrom(storage) {
    const entries = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) entries[key] = storage.getItem(key);
    }
    return entries;
  }

  function validateData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Die Sicherung enthält keine gültigen Daten.");
    const pairs = Object.entries(data);
    if (pairs.length > MAX_ENTRIES) throw new Error("Die Sicherung enthält zu viele Einträge.");
    for (const [key, value] of pairs) {
      if (!key.startsWith(PREFIX) || key.length > 128 || typeof value !== "string") throw new Error("Die Sicherung enthält einen ungültigen Speichereintrag.");
      const expected = JSON_KEYS.get(key);
      if (expected) {
        let parsed;
        try { parsed = JSON.parse(value); } catch { throw new Error(`Der Eintrag „${key}“ ist beschädigt.`); }
        if (!parsed || typeof parsed !== "object" || (Array.isArray(parsed) ? "array" : "object") !== expected) throw new Error(`Der Eintrag „${key}“ hat ein ungültiges Format.`);
      }
    }
    return pairs;
  }

  function create(storage, appVersion) {
    const data = entriesFrom(storage);
    validateData(data);
    return { format: FORMAT, version: 1, appVersion, createdAt: new Date().toISOString(), data };
  }

  function parse(text) {
    if (typeof text !== "string" || text.length > MAX_FILE_SIZE) throw new Error("Die Datei ist zu groß oder nicht lesbar.");
    let backup;
    try { backup = JSON.parse(text); } catch { throw new Error("Die Datei ist kein gültiges JSON."); }
    if (!backup || backup.format !== FORMAT || backup.version !== 1) throw new Error("Die Datei ist keine unterstützte Schachwerkstatt-Sicherung.");
    if (typeof backup.createdAt !== "string" || Number.isNaN(Date.parse(backup.createdAt))) throw new Error("Der Sicherungszeitpunkt fehlt oder ist ungültig.");
    validateData(backup.data);
    return backup;
  }

  function restore(storage, backup) {
    const incoming = validateData(backup.data);
    const previous = entriesFrom(storage);
    try {
      for (const key of Object.keys(previous)) storage.removeItem(key);
      for (const [key, value] of incoming) storage.setItem(key, value);
    } catch {
      for (const key of Object.keys(entriesFrom(storage))) storage.removeItem(key);
      for (const [key, value] of Object.entries(previous)) storage.setItem(key, value);
      throw new Error("Der Import konnte nicht gespeichert werden. Die bisherigen Daten wurden wiederhergestellt.");
    }
  }

  root.ChessBackup = { create, parse, restore };
})(typeof window !== "undefined" ? window : globalThis);
