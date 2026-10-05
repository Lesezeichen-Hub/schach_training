# Schachwerkstatt

Eine vollständig lokale Schach-Lernapp für den Lesezeichen-Hub. Sie benötigt keinen Server und lädt keine externen Bibliotheken.

## Lernkonzept

Die App startet auf einer geführten Einstiegsseite und empfiehlt die nächste sinnvolle Einheit. Jede Taktikaufgabe verbindet eine kurze Motiverklärung mit einer festen Denkfolge: **Schachs → Schlagzüge → Drohungen**. Richtige und falsche Versuche werden lokal ausgewertet; über „Meine Fehler“ lassen sich schwierige Motive gezielt wiederholen.

Die Hauptnavigation ist bewusst anfängerfreundlich auf vier Ziele reduziert: **Start**, **Lernweg**, **Spielen** und **Analyse**. Der Start empfiehlt automatisch den aktuell schwächsten Lernbereich. Im Lernweg werden Fachbegriffe zusätzlich als konkrete Ziele erklärt, etwa „Figuren gewinnen“ oder „Gut in die Partie starten“.

## Funktionen

- 20 Taktikaufgaben zu Gabel, Fesselung, Spieß und Abzugsangriff
- Geführter Grundlagenkurs zu Spielziel, Figuren, Schach, Matt und den ersten Partieprinzipien
- Drei Fehlversuche mit anschließend animierter Lösungshilfe
- Interaktive Endspiele: Treppenmatt und König-Bauer gegen König mit Opposition
- Regelbasierte Endspielverteidigung und unmittelbare Fehlererklärung
- Strategie-Masterclass mit Multiple-Choice-Entscheidungen
- Spielbarer Eröffnungstrainer mit 25 sinnvollen Repertoirevarianten für Weiß und Schwarz
- Pläne, typische Fehler, ECO-Codes und schrittweise Zugkontrolle zu jeder Eröffnung
- Lokale Lern-Elo für Taktik, Endspiel, Strategie und Eröffnungen
- Aufbaustufen Bauer, Springer, Läufer, Turm, Dame und Meister
- Coach-Review aus dem PGN-Partieverlauf mit Material- und Rochadeheuristik
- Tagesziel, Trefferquote, Gesamtfortschritt und persönlicher Trainingsfokus
- Lokale Fehlerwiederholung für noch unsichere Motive
- Erklärungen, Hinweise und konkrete Merksätze zu jeder Aufgabe
- Trainingspartien gegen drei Computer-Spielstärken zum Transfer
- Freies Analysebrett mit FEN-Import
- Vollständige Zugprüfung inklusive Rochade, en passant und Bauernumwandlung
- Erkennung von Schach, Matt, Patt, dreifacher Stellungswiederholung, 50-Züge-Regel und unzureichendem Material
- Responsive Bedienung für Desktop und Mobilgeräte
- Lokaler Lernfortschritt im Browser

## Trainingsdaten erweitern

Neue Aufgaben und Eröffnungsvarianten werden in `training-data.json` ergänzt. Jede Taktik enthält eine FEN-Stellung, eine UCI-Zugfolge, Erklärung, Hinweis und visuelle Anker. Eröffnungen enthalten ECO-Code, Trainingsseite, vollständige Zugfolge, Pläne und typische Fehler. Danach wird die ohne Server lauffähige Browserdatei neu erzeugt:

```powershell
node build-training-data.mjs
```

## Start

`index.html` direkt im Browser öffnen oder den Ordner im Lesezeichen-Hub als lokales Modul hinzufügen.

## Tests

Mit installiertem Node.js:

```powershell
node tests.mjs
```

Die Tests prüfen unter anderem, dass jede Kategorie mindestens fünf Aufgaben enthält und alle hinterlegten Taktik- und Strategiezüge legal sind.

Die Lern-Elo beginnt bei 800 und reagiert ähnlich einer Elo-Wertung auf richtige und falsche Entscheidungen sowie die Schwierigkeit der Übung. Sie dient ausschließlich als lokaler Trainings- und Fortschrittswert und ist keine offizielle Spielstärke.
