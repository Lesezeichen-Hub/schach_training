import fs from "node:fs";

const sourceUrl = new URL("./training-data.json", import.meta.url);
const targetUrl = new URL("./training-data.generated.js", import.meta.url);
const data = JSON.parse(fs.readFileSync(sourceUrl, "utf8"));
fs.writeFileSync(targetUrl, `/* Generated from training-data.json – do not edit manually. */\nwindow.CHESS_TRAINING_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");
console.log(`Trainingsdaten generiert: ${data.tactics.length} Taktikaufgaben, ${data.openings.length} Eröffnungen, ${data.endgames.length} Endspiele`);
