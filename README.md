# Schachwerkstatt

Eine vollständig lokale Schach-Lernapp für den Lesezeichen-Hub. Sie benötigt keinen Server und lädt keine externen Bibliotheken.

## Lernkonzept

Die App startet auf einer geführten Einstiegsseite und empfiehlt die nächste sinnvolle Einheit. Taktiken und Eröffnungen werden als vollständige **kuratiert ausgewählte Lehrfolgen** trainiert, einschließlich gegnerischer Antworten und Verwertung. Jeder Halbzug nennt Seite, Figur, Zugzweck, konkrete Konsequenz und die nächste hinterlegte Antwort. Die Denkfolge bleibt **Schachs → Schlagzüge → Drohungen**.

Die Hauptnavigation ist bewusst anfängerfreundlich auf vier Ziele reduziert: **Start**, **Lernweg**, **Spielen** und **Analyse**. Der Start empfiehlt automatisch den aktuell schwächsten Lernbereich. Im Lernweg werden Fachbegriffe zusätzlich als konkrete Ziele erklärt, etwa „Figuren gewinnen“ oder „Gut in die Partie starten“.

## Funktionen

- 20 Taktikaufgaben zu Gabel, Fesselung, Spieß und Abzugsangriff
- Geführter Grundlagenkurs zu Spielziel, Figuren, Schach, Matt und den ersten Partieprinzipien
- Vier jederzeit wählbare Lernphasen für alle 45 Eröffnungs- und Taktiklektionen
- 135 Szenarien (45 Hauptlinien, 45 Abwehrausschnitte, 45 Gegenspiel-/Konterabläufe), insgesamt 606 erklärte Halbzüge
- SVG-Zug- und Angriffspfeile mit Labels und Legende, korrekt gedreht mit der Lernfarbe und responsiv skaliert
- Zurück, Weiter, Neustart sowie Abspielen/Pause in Vorführungen
- Konkrete geprüfte Planabweichungen mit Antwort; unbekannte legale Abweichungen werden nicht als automatisch schlechte Züge bezeichnet
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
- Trainingspartien gegen acht fein abgestufte Computer-Spielstärken von „Einstieg“ bis „Experte“
- Stellungsspezifische Zughilfe während Computerpartien mit Brettmarkierung, Erklärung, Bewertung und Alternativen
- Persistente Spiel-Elo nach klassischer Erwartungswertformel mit Bilanz, Bestwert und passender Gegnerempfehlung
- Freie Farbwahl: mit Weiß, Schwarz oder bei jeder neuen Partie zufällig spielen
- Iterative Tiefensuche, begrenzte Bedenkzeit und taktische Ruhesuche für höhere Stufen
- Freies Analysebrett mit FEN-Import
- Vollständige Zugprüfung inklusive Rochade, en passant und Bauernumwandlung
- Erkennung von Schach, Matt, Patt, dreifacher Stellungswiederholung, 50-Züge-Regel und unzureichendem Material
- Responsive Bedienung für Desktop und Mobilgeräte
- Lokaler Lernfortschritt im Browser

## Lernphasen und Szenarien

- **Erklären:** Konzept, Voraussetzungen, Ausführung, Abwehr und Konter kennenlernen; das Brett zeigt die Ausgangsstellung und nummerierte Zug-/Motivpfeile mit Textlegende. Keine Wertung.
- **Vorführen:** Eine Folge Halbzug für Halbzug oder automatisch ansehen. Zurück rekonstruiert Brett, Text und Pfeile. Keine Wertung.
- **Geführt:** Die ausgewählte Lernfarbe selbst ziehen; Gegnerantworten werden einzeln ausgeführt. Erklärungen und Pfeile bleiben sichtbar. Abschlüsse werden getrennt gespeichert, ohne Lern-Elo und Tageszielpunkte.
- **Selbst üben:** Die ganze Folge ohne Lösungshinweise spielen. Erst der vollständige, nicht unterstützte Versuch wird einmal gewertet; nicht jeder Halbzug. Eine Folge mit Fehlversuchen zählt nicht als fehlerfrei gelöst.

„Weiter“ überspringt keinen eigenen Übungszug. Hinweise, Lösungspfeile, Rückwärtsnavigation und Wiederholungen bereits gesehener Folgen kennzeichnen den Versuch als **unterstützt**. In einer Vorführung ist Abspielen/Pause verfügbar; in einer Übung werden nur die kuratierten Gegnerzüge automatisch gespielt. Bei Wechseln werden laufende Lektions-Timer abgebrochen und ihre Sitzungs-/Stellungskennung erneut geprüft. Eine offene Umwandlung wird abgebrochen; Escape wandelt nicht stillschweigend in eine Dame um.

Jede Lektion bietet **Hauptlinie, Abwehr und Konter/Gegenspiel**. Eröffnungszweige beginnen nach `startPly` Halbzügen der Hauptlinie. Die Taktikabwehr beginnt ausdrücklich **einen Zug früher mit Schwarz am Zug**. Taktikkonter sind gekennzeichnete, verwandte **Vergleichsstellungen**: Die 20 Konterabläufe nutzen vier gemeinsame Motivvergleiche (zusätzlicher Verteidiger, relative Fesselung, ungedeckter Spieß, rettende Damenantwort). Es sind nicht 20 verschiedene erzwungene Widerlegungen der Hauptstellungen.

Die Abdeckung ist bewusst begrenzt: **genau die bisherigen 25 Eröffnungs-IDs und 20 Taktik-IDs**, keine neuen Motive, kein vollständiger Variantenbaum, keine Behauptung universell bester Antworten. Manche vereinfachten Fesselungs-/Gabelstellungen enden trotz Materialgewinn mit bloßen Königen beziehungsweise König und Springer in **Remis**. Rückschläge und dieses Partieergebnis werden ausdrücklich erläutert. Die Eröffnungsausschnitte enden mit einem Entwicklungsplan, nicht mit einem behaupteten Gewinn.

## Fortschritt

Der bisherige Schlüssel `schachwerkstatt-progress` bleibt erhalten: alte Zähler, Motivstatistiken, Grundlagenabschluss und Bereichsratings werden übernommen, aber alte Einzugerfolge nicht als neue vollständige Lektionsmeisterung ausgegeben. `lessons` speichert additiv Revision, Szenario-/Phasenabschlüsse, unterstützt/selbstständig und die letzte abgeschlossene Auswahl. Fehlerhistorie bleibt erhalten; `openError` unterscheidet offene Wiederholungen von jemals gemachten Fehlern. „Meine Fehler“ zeigt offene Taktikfehler. Der Wiederholungsbedarf wird je Szenario geführt: Ein fehlerfreier vollständiger Übungsdurchlauf schließt ihn auch ohne Elo-Berechtigung; ein Kontererfolg schließt keinen offenen Hauptlinienfehler. Eine neue Inhaltsrevision behält die Altstatistik, verlangt aber neue vollständige Abschlüsse.

Beschädigte Werte werden normalisiert. Bei verweigertem Speicher erscheint eine Warnung; bis zum Neuladen arbeitet die App mit einer Speicherkopie weiter. Kein Server, keine Hub-Speicherung und keine automatische Auslieferung an eine installierte Modulkopie.

## Trainingsdaten erweitern

Einzige redaktionelle Quelle ist [training-data.json](training-data.json). Die Basisdatensätze erhalten die vorhandenen IDs, FEN/Startstellung, UCI-Linie, Kategorie beziehungsweise Trainingsfarbe. `lessonContent` enthält die Lernrevision, Motiveinführungen, zugbezogene Zwecke, vollständige Taktikverwertungen, Abwehrlinien, Vergleichsstellungen, Eröffnungszweige und geprüfte Fehlzugantworten.

[build-training-data.mjs](build-training-data.mjs) kompiliert daraus additive `lesson`-Objekte mit `goal`, `intro`, `revision` und drei `scenarios`. Ein Szenario enthält stabile ID, Titel, Zweck, Lernfarbe, entweder `startPly` **oder** eigenes `startFen`, `line`, `steps` und begrenztes `outcome`. Jeder Schritt enthält `before`, `after`, `hint`, Figur/Seite, benannte SVG-Pfeile und geprüfte Vergleichszüge. Zugnotationen, Schachstatus, Figuren und nächste Antworten werden aus tatsächlich legalen Zügen gewonnen, nicht aus KI-Bewertungen. Das Erklärungsformat kombiniert redaktionelle Zwecke mit überprüfbaren Zugfakten; es ist keine automatische freie Schachanalyse.

Die Browserdatei [training-data.generated.js](training-data.generated.js) **niemals von Hand bearbeiten**; ausschließlich mit dem dokumentierten Generator erzeugen:

```powershell
node build-training-data.mjs
```

## Start

[index.html](index.html) direkt im Browser öffnen oder den Quellordner als lokales Modul hinzufügen. Änderungen hier verändern keine separat installierte Kopie.

## Tests

Mit installiertem Node.js:

```powershell
node tests.mjs
```

Die Tests prüfen exakte IDs und Kategorien, deterministische Generatorausgabe, alle 135 vollständigen Szenarien und Vergleichsantworten, 405 Abschlüsse in Demo/Geführt/Üben plus den Erklärmodus, Materialbilanzen einschließlich Rücknahmen und Remis, unveränderte Stellung bei Fehlern, beide Lernfarben, Rückwärts-/Neustartnavigation, einmalige Abschlussereignisse, Hilfe-Kennzeichnung, Rochade/en passant/Unterverwandlung, alle 64 Pfeilkoordinaten in beiden Orientierungen und beschädigten/alten Fortschritt. Die vorhandenen Regeln-, KI-, Endspiel- und Strategietests bleiben enthalten.

Die Lern-Elo beginnt bei 800 und reagiert ähnlich einer Elo-Wertung auf richtige und falsche Entscheidungen sowie die Schwierigkeit der Übung. Sie dient ausschließlich als lokaler Trainings- und Fortschrittswert und ist keine offizielle Spielstärke.
