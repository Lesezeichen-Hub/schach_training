/* Runs expensive position searches away from the user interface. */
"use strict";

importScripts("chess-engine.js");

self.addEventListener("message", (event) => {
  const { id, fen, options } = event.data || {};
  try {
    const position = self.ChessEngine.fromFEN(fen);
    const analysis = self.ChessEngine.analyzePosition(position, options || {});
    self.postMessage({ id, analysis });
  } catch (error) {
    self.postMessage({ id, error: error?.message || "Analyse fehlgeschlagen" });
  }
});
