# Schachwerkstatt

Eine vollständig lokale Schach-Lernapp für den Lesezeichen-Hub. Sie benötigt keinen Server und lädt keine externen Bibliotheken.

## Lernkonzept

Die App startet auf einer geführten Einstiegsseite und empfiehlt die nächste sinnvolle Einheit. Taktiken und Eröffnungen werden als vollständige **kuratiert ausgewählte Lehrfolgen** trainiert, einschließlich gegnerischer Antworten und Verwertung. Jeder Halbzug nennt Seite, Figur, Zugzweck, konkrete Konsequenz und die nächste hinterlegte Antwort. Die Denkfolge bleibt **Schachs → Schlagzüge → Drohungen**.

Die Hauptnavigation ist bewusst anfängerfreundlich auf vier Ziele reduziert: **Start**, **Lernweg**, **Spielen** und **Analyse**. Der Start empfiehlt automatisch den aktuell schwächsten Lernbereich. Im Lernweg werden Fachbegriffe zusätzlich als konkrete Ziele erklärt, etwa „Figuren gewinnen“ oder „Gut in die Partie starten“.

## Funktionen

- Sichtbarer Kurs mit 12 direkt startbaren Mitmach-Einheiten: Schäfermatt spielen und abwehren, Sizilianisch, Alapin, Italienisch, Französisch, Caro-Kann, London, Gabel, Fesselung, Treppenmatt und Opposition
- Kompakter Denk-Check vor jedem eigenen Zug in geführten Lektionen: Zugidee einordnen, dann erst auf dem Brett ausführen; lokale Trefferquote inklusive
- 32 Taktikaufgaben: 20 Motivlektionen zu Gabel, Fesselung, Spieß und Abzugsangriff sowie je vier Aufgaben zu Matt in 1, Matt in 2 und Materialgewinn
- Geführter Grundlagenkurs zu Spielziel, Figuren, Schach, Matt und den ersten Partieprinzipien
- Vier jederzeit wählbare Lernphasen für alle 45 Eröffnungs- und Taktiklektionen
- 147 Szenarien (45 Hauptlinien, 45 Abwehrausschnitte, 45 Gegenspiel-/Konterabläufe und 12 direkte Praxisaufgaben), insgesamt 627 erklärte Halbzüge
- SVG-Zug- und Angriffspfeile mit Labels und Legende, korrekt gedreht mit der Lernfarbe und responsiv skaliert
- Zurück, Weiter, Neustart sowie Abspielen/Pause in Vorführungen
- Konkrete geprüfte Planabweichungen mit Antwort; unbekannte legale Abweichungen werden nicht als automatisch schlechte Züge bezeichnet
- Interaktive Endspiele: Treppenmatt und König-Bauer gegen König mit Opposition
- Regelbasierte Endspielverteidigung und unmittelbare Fehlererklärung
- Strategie-Masterclass mit Multiple-Choice-Entscheidungen
- Spielbarer Eröffnungstrainer mit 25 sinnvollen Repertoirevarianten für Weiß und Schwarz
- Pläne, typische Fehler, ECO-Codes und schrittweise Zugkontrolle zu jeder Eröffnung
- Lokale Lern-Elo für Taktik, Endspiel, Strategie und Eröffnungen
- Freie Partien wahlweise ohne Uhr oder mit 3, 5 beziehungsweise 10 Minuten Bedenkzeit je Spieler
- Hot-Seat-Modus für zwei Personen an einem PC; nach jedem Zug dreht sich das Brett automatisch zur am Zug befindlichen Seite
- Manueller Profil-Elo-Reset auf 0, ohne Fehlerstellungen, Wiederholungen oder Lektionsfortschritt zu löschen
- Aufbaustufen Bauer, Springer, Läufer, Turm, Dame und Meister
- Coach-Review aus dem PGN-Partieverlauf mit Material- und Rochadeheuristik
- Tagesziel, Trefferquote, Gesamtfortschritt und persönlicher Trainingsfokus
- Lokale Fehlerwiederholung für noch unsichere Motive
- Erklärungen, Hinweise und konkrete Merksätze zu jeder Aufgabe
- Trainingspartien gegen acht fein abgestufte Computer-Spielstärken von „Einstieg“ bis „Experte“
- Stellungsspezifische Zughilfe während Computerpartien mit Brettmarkierung, Erklärung, Bewertung und Alternativen
- Persistente Spiel-Elo nach klassischer Erwartungswertformel mit Bilanz, Bestwert und passender Gegnerempfehlung
- Zug-für-Zug-Partieanalyse mit Bewertungsverlust, Zugklassifikation, bester Alternative und Brettnavigation
- Automatischer persönlicher Fehlertrainer aus kritischen Stellungen gespielter Partien
- Verteilte Wiederholung mit wachsenden Abständen von 1, 3, 7, 21 und 45 Tagen für Partiefehler und Taktiken
- Sofortige Fehlerkorrektur: Der richtige Zug muss direkt ausgeführt werden und erscheint in gemischten Einheiten später erneut
- Gemischte Einheiten mit bis zu zehn fälligen Partiefehlern und Taktikfolgen
- Selbstlernender Trainingspartner: Eigene Züge werden bereits während der Partie lokal bewertet und neue Fehler sofort gespeichert
- Ungerankte persönliche Übungspartien starten aus fälligen Fehlerstellungen, verlangen zunächst den Korrekturzug und laufen danach gegen den Computer weiter
- Optionaler automatischer Denkanstoß sowie die vorhandenen drei Hinweisstufen für persönliche Fehlerstellungen
- Hintergrundanalyse per Web Worker mit stärkerer Suchtiefe und Rückfallmodus für lokale Dateien
- Gestufte Hinweise von der strategischen Idee bis zum konkreten Zug
- Drag-and-drop, vollständige Tastatursteuerung und eigene Brettmarkierungen
- Dezente lokal erzeugte Zug- und Schlaggeräusche mit dauerhaft gespeichertem Ein-/Ausschalter
- Flüssige Zuganimationen für automatische Computer-, Endspiel- und Lektionsantworten in der 2D- und 3D-Ansicht; reduzierte Bewegung wird berücksichtigt
- Optionales echtes WebGL-3D-Brett mit lokal erzeugten, detaillierten Staunton-Figuren, Materialglanz, freier Orbit-Perspektive sowie Maus- und Touch-Drag-and-drop; 2D bleibt jederzeit als barriereärmerer Rückfall verfügbar
- Vor/Zurück-Navigation in laufenden Partien und auf dem Analysebrett; nach einem neuen Alternativzug verfällt der Vor-Stapel
- Freie Farbwahl: mit Weiß, Schwarz oder bei jeder neuen Partie zufällig spielen
- Iterative Tiefensuche, begrenzte Bedenkzeit und taktische Ruhesuche für höhere Stufen
- Freies Analysebrett mit FEN-Import
- Vollständige Zugprüfung inklusive Rochade, en passant und Bauernumwandlung
- Erkennung von Schach, Matt, Patt, dreifacher Stellungswiederholung, 50-Züge-Regel und unzureichendem Material
- Responsive Bedienung für Desktop und Mobilgeräte
- Lokaler Lernfortschritt im Browser

Die Brettansicht wird lokal gespeichert und kann über den Schalter am Brett gewechselt werden. In 3D lässt sich der Blickwinkel durch Ziehen auf einer freien Stelle oder überall mit der rechten Maustaste frei horizontal und vertikal drehen. Zusätzlich kann das Brett schrittweise gedreht und bildschirmfüllend angezeigt werden; Escape beendet das Vollbild. `?view=3d` erzwingt die 3D-Ansicht für einen direkten Aufruf. Ist WebGL 2 nicht verfügbar, bleibt der Schalter deaktiviert und die vollständige 2D-Bedienung aktiv.

## Lernphasen und Szenarien

- **Erklären:** Konzept, Voraussetzungen, Ausführung, Abwehr und Konter kennenlernen; das Brett zeigt die Ausgangsstellung und nummerierte Zug-/Motivpfeile mit Textlegende. Keine Wertung.
- **Vorführen:** Eine Folge Halbzug für Halbzug oder automatisch ansehen. Zurück rekonstruiert Brett, Text und Pfeile. Keine Wertung.
- **Geführt:** Die ausgewählte Lernfarbe selbst ziehen; Gegnerantworten werden einzeln ausgeführt. Erklärungen und Pfeile bleiben sichtbar. Abschlüsse werden getrennt gespeichert, ohne Lern-Elo und Tageszielpunkte.
- **Selbst üben:** Die ganze Folge ohne Lösungshinweise spielen. Erst der vollständige, nicht unterstützte Versuch wird einmal gewertet; nicht jeder Halbzug. Eine Folge mit Fehlversuchen zählt nicht als fehlerfrei gelöst.

„Weiter“ überspringt keinen eigenen Übungszug. Hinweise, Lösungspfeile, Rückwärtsnavigation und Wiederholungen bereits gesehener Folgen kennzeichnen den Versuch als **unterstützt**. In einer Vorführung ist Abspielen/Pause verfügbar; in einer Übung werden nur die kuratierten Gegnerzüge automatisch gespielt. Bei Wechseln werden laufende Lektions-Timer abgebrochen und ihre Sitzungs-/Stellungskennung erneut geprüft. Eine offene Umwandlung wird abgebrochen; Escape wandelt nicht stillschweigend in eine Dame um.

Die 45 Motiv- und Eröffnungslektionen bieten **Hauptlinie, Abwehr und Konter/Gegenspiel**. Die 12 direkten Matt- und Materialaufgaben konzentrieren sich dagegen auf genau eine konkrete Lösungsfolge. Eröffnungszweige beginnen nach `startPly` Halbzügen der Hauptlinie. Die Taktikabwehr beginnt ausdrücklich **einen Zug früher mit Schwarz am Zug**. Taktikkonter sind gekennzeichnete, verwandte **Vergleichsstellungen**: Die 20 Konterabläufe nutzen vier gemeinsame Motivvergleiche (zusätzlicher Verteidiger, relative Fesselung, ungedeckter Spieß, rettende Damenantwort). Es sind nicht 20 verschiedene erzwungene Widerlegungen der Hauptstellungen.

Die Abdeckung ist bewusst begrenzt: **25 Eröffnungs-IDs, die bisherigen 20 Motiv-IDs und 12 direkte Praxisaufgaben**, kein vollständiger Variantenbaum und keine Behauptung universell bester Antworten. Manche vereinfachten Fesselungs-/Gabelstellungen enden trotz Materialgewinn mit bloßen Königen beziehungsweise König und Springer in **Remis**. Rückschläge und dieses Partieergebnis werden ausdrücklich erläutert. Die Eröffnungsausschnitte enden mit einem Entwicklungsplan, nicht mit einem behaupteten Gewinn.

## Fortschritt

Der bisherige Schlüssel `schachwerkstatt-progress` bleibt erhalten: alte Zähler, Motivstatistiken, Grundlagenabschluss und Bereichsratings werden übernommen, aber alte Einzugerfolge nicht als neue vollständige Lektionsmeisterung ausgegeben. `lessons` speichert additiv Revision, Szenario-/Phasenabschlüsse, unterstützt/selbstständig und die letzte abgeschlossene Auswahl. Fehlerhistorie bleibt erhalten; `openError` unterscheidet offene Wiederholungen von jemals gemachten Fehlern. „Meine Fehler“ zeigt offene Taktikfehler. Der Wiederholungsbedarf wird je Szenario geführt: Ein fehlerfreier vollständiger Übungsdurchlauf schließt ihn auch ohne Elo-Berechtigung; ein Kontererfolg schließt keinen offenen Hauptlinienfehler. Eine neue Inhaltsrevision behält die Altstatistik, verlangt aber neue vollständige Abschlüsse.

`reviewStage`, `nextReview`, `reviewStreak` und `lapses` bilden die verteilte Wiederholung ab. Selbstständige richtige Abrufe vergrößern den Abstand; Fehler setzen ihn zurück und unterstützte Korrekturen bleiben am selben Tag fällig. Bestehende Fortschritte ohne Wiederholungstermin werden als sofort fällig übernommen.

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

Die Tests prüfen exakte IDs und Kategorien, deterministische Generatorausgabe, alle 147 vollständigen Szenarien und Vergleichsantworten, 441 Abschlüsse in Demo/Geführt/Üben plus den Erklärmodus, echte Mattenden in der angegebenen Zugzahl, Materialbilanzen einschließlich Rücknahmen und Remis, unveränderte Stellung bei Fehlern, beide Lernfarben, Rückwärts-/Neustartnavigation, einmalige Abschlussereignisse, Hilfe-Kennzeichnung, Rochade/en passant/Unterverwandlung, alle 64 Pfeilkoordinaten in beiden Orientierungen und beschädigten/alten Fortschritt. Die vorhandenen Regeln-, KI-, Endspiel- und Strategietests bleiben enthalten.

Lern- und Spiel-Elo beginnen bei neuen Profilen bei **0** und werden ausschließlich durch absolvierte Übungen beziehungsweise gewertete Partien aufgebaut. Werte können nicht negativ werden. Bereits erspielte Wertungen bleiben erhalten; lediglich unberührte alte 800-Standardwerte ohne gewertete Aktivität werden auf 0 migriert. Die Lern-Elo reagiert ähnlich einer Elo-Wertung auf richtige und falsche Entscheidungen sowie die Schwierigkeit der Übung; sie ist keine offizielle Spielstärke.
