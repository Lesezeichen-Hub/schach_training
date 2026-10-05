# Schachwerkstatt

Eine vollständig lokale Schach-Lernapp für den Lesezeichen-Hub. Sie benötigt keinen Server und lädt keine externen Bibliotheken.

## Lernkonzept

Die App startet direkt im Taktiktraining. Jede Aufgabe verbindet eine kurze Motiverklärung mit einer festen Denkfolge: **Schachs → Schlagzüge → Drohungen**. Richtige und falsche Versuche werden lokal ausgewertet; über „Meine Fehler“ lassen sich schwierige Motive gezielt wiederholen.

## Funktionen

- 20 Taktikaufgaben zu Gabel, Fesselung, Spieß und Abzugsangriff
- Drei Fehlversuche mit anschließend animierter Lösungshilfe
- Interaktive Endspiele: Treppenmatt und König-Bauer gegen König mit Opposition
- Regelbasierte Endspielverteidigung und unmittelbare Fehlererklärung
- Strategie-Masterclass mit Multiple-Choice-Entscheidungen
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

Neue Aufgaben werden in `training-data.json` ergänzt. Jede Taktik enthält eine FEN-Stellung, eine UCI-Zugfolge, Erklärung, Hinweis und visuelle Anker. Danach wird die ohne Server lauffähige Browserdatei neu erzeugt:

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
