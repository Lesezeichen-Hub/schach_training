# Schachwerkstatt

Eine vollständig lokale Schach-Lernapp für den Lesezeichen-Hub. Sie benötigt keinen Server und lädt keine externen Bibliotheken.

## Lernkonzept

Die App startet auf einer geführten Einstiegsseite und empfiehlt die nächste sinnvolle Einheit. Taktiken und Eröffnungen werden als vollständige **kuratiert ausgewählte Lehrfolgen** trainiert, einschließlich gegnerischer Antworten und Verwertung. Jeder Halbzug nennt Seite, Figur, Zugzweck, konkrete Konsequenz und die nächste hinterlegte Antwort. Die Denkfolge bleibt **Schachs → Schlagzüge → Drohungen**.

Die Hauptnavigation ist bewusst anfängerfreundlich auf vier Ziele reduziert: **Start**, **Lernweg**, **Spielen** und **Analyse**. Der Start empfiehlt automatisch den aktuell schwächsten Lernbereich. Im Lernweg werden Fachbegriffe zusätzlich als konkrete Ziele erklärt, etwa „Figuren gewinnen“ oder „Gut in die Partie starten“.

## Funktionen

- Eigene Brettstellungen im Analysebrett oder direkt während einer Partie lokal benennen, speichern, laden und löschen
- Visueller Stellungseditor mit Figurenpalette, Radierer, Zugrecht, Rochaderechten und Gültigkeitsprüfung
- PGN-Import mit legaler Zugrekonstruktion, Farbauswahl und automatischer lokaler Zug-für-Zug-Analyse
- Variantenlabor für geladene PGNs und FENs: beliebige Hauptvarianten-Stellung wählen, gegen automatische KI-Antworten weiterspielen und zum festen Ausgangspunkt zurückspringen
- Komplette PGN-Partien und FEN-Stellungen lokal benennen, speichern und wieder laden
- Laufende Trainingspartien nach jedem Zug lokal sichern, später fortsetzen und abgeschlossene Partien archivieren
- PGN-Dateiexport für aktuelle und gespeicherte Partien inklusive Ergebnis und Schach960-Ausgangsstellung
- Laufendes Weiß-Schwarz-Gewinnverhältnis mit lokaler Neuberechnung nach jedem Zug in Trainingspartien und freien Varianten
- Engine-Zugvorschläge als Textliste; in der Partieanalyse werden gespielter und besserer Zug gegenübergestellt
- Gespeicherte Positionen frei analysieren oder als ungewertete Partie gegen die Engine weiterspielen
- Dreistufige Engine-Hinweise im Analysebrett: Idee, Figur und konkreter Zug
- Filterbare Taktikstufen Leicht, Mittel und Schwer, kombinierbar mit dem gewünschten Motiv
- Zeitpartien ohne Inkrement oder als Fischer-Modus 3+2, 5+3, 10+5 und 15+20
- Installierbare Progressive Web App mit lokalem Offline-Cache; nach dem ersten Online-Aufruf läuft die App ohne Verbindung weiter
- Sichtbarer Kurs mit 12 direkt startbaren Mitmach-Einheiten: Schäfermatt spielen und abwehren, Sizilianisch, Alapin, Italienisch, Französisch, Caro-Kann, London, Gabel, Fesselung, Treppenmatt und Opposition
- 40 Taktikaufgaben: 20 Motivlektionen zu Gabel, Fesselung, Spieß und Abzugsangriff sowie 20 direkte Matt- und Materialaufgaben
- Geführter Grundlagenkurs zu Spielziel, Figuren, Schach, Matt und den ersten Partieprinzipien
- Vier jederzeit wählbare Lernphasen für alle 65 Eröffnungs- und Taktiklektionen
- 155 Szenarien (45 Hauptlinien, 45 Abwehrausschnitte, 45 Gegenspiel-/Konterabläufe und 20 direkte Praxisaufgaben), insgesamt 635 erklärte Halbzüge
- Ausführliche Texterklärungen zu Lektionszügen; Zugvorschläge bleiben als Text statt als festes Brett-Overlay lesbar
- Zurück, Weiter, Neustart sowie Abspielen/Pause in Vorführungen
- Konkrete geprüfte Planabweichungen mit Antwort; unbekannte legale Abweichungen werden nicht als automatisch schlechte Züge bezeichnet
- Fünf interaktive Endspiele: Treppenmatt, Dame- und Turmmatt sowie Bauernendspiele mit Opposition und Schlüsselfeldern
- Regelbasierte Endspielverteidigung und unmittelbare Fehlererklärung
- Strategie-Masterclass mit sieben interaktiven Entscheidungen zu Entwicklung, Initiative, Linien, Freibauern und Königssicherheit
- Spielbarer Eröffnungstrainer mit 25 sinnvollen Repertoirevarianten für Weiß und Schwarz
- Pläne, typische Fehler, ECO-Codes und schrittweise Zugkontrolle zu jeder Eröffnung
- Positionsbasiertes Repertoiretraining: Stammvariante und eigenes Gegenspiel werden als getrennte Äste nach Fälligkeit und Beherrschung abgefragt
- Eigener Wiederholungsplan pro Repertoire-Ast mit Sofort-Wiederholung nach Fehlern und wachsenden Abständen bis 45 Tage
- Lokale Lern-Elo für Taktik, Endspiel, Strategie und Eröffnungen
- Freie Partien wahlweise ohne Uhr oder mit 3, 5 beziehungsweise 10 Minuten Bedenkzeit je Spieler
- Schach960 als Spielvariante gegen alle acht Computerstufen oder im Hot-Seat-Modus; jede neue Partie erhält eine regelkonforme Zufallsaufstellung samt vollständiger Schach960-Rochade
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
- Adaptives Tagestraining mit bis zu zehn Partiefehlern, Taktikfolgen, Endspielen und Strategieentscheidungen
- Kritische Momente aus der Partieanalyse lassen sich direkt erneut spielen und werden anschließend verteilt wiederholt
- Selbstlernender Trainingspartner: Eigene Züge werden bereits während der Partie lokal bewertet und neue Fehler sofort gespeichert
- Persönliche Übungspartien aus fälligen Fehlerstellungen sind optional und standardmäßig aus; nach Aktivierung kommt zuerst der Korrekturzug, danach geht es gegen den Computer weiter
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
- Kompakte, responsive Arbeitsfläche: Das Brett bleibt am Desktop sichtbar, Coach-Inhalte scrollen separat; Spiel, Lernkurs, Taktik und Analyse sind in aufklappbare Bereiche gegliedert
- Lokaler Lernfortschritt im Browser

Die Brettansicht wird lokal gespeichert und kann über den Schalter am Brett gewechselt werden. Das Brett kann sowohl in 2D als auch in 3D bildschirmfüllend angezeigt werden; bei Zeitpartien bleiben beide Uhren sichtbar. Escape beendet das Vollbild. In 3D lässt sich der Blickwinkel durch Ziehen auf einer freien Stelle oder überall mit der rechten Maustaste frei horizontal und vertikal drehen. Zusätzlich kann das Brett schrittweise gedreht werden. `?view=3d` erzwingt die 3D-Ansicht für einen direkten Aufruf. Ist WebGL 2 nicht verfügbar, bleibt der Schalter deaktiviert und die vollständige 2D-Bedienung aktiv.

Für die Installation als Offline-App muss die Schachwerkstatt einmal über `https://` oder lokal über `http://localhost` geöffnet werden. Sobald der Browser die Installation anbietet, erscheint oben „App installieren“. Ein direkter Aufruf als `file://` unterstützt aus Sicherheitsgründen keine Service Worker.

Partien werden unter `schachwerkstatt-games` getrennt vom Lernfortschritt auf diesem Gerät gespeichert. Jeder Halbzug aktualisiert den Zwischenstand; das Archiv behält bis zu 50 Partien. Laufende Partien lassen sich mit Zug-Historie, Variante und ggf. Schachuhr fortsetzen. Abgeschlossene Partien bleiben für den PGN-Export verfügbar.

## Lernphasen und Szenarien

- **Erklären:** Konzept, Voraussetzungen, Ausführung, Abwehr und Konter kennenlernen; das Brett zeigt die Ausgangsstellung und passende Texterklärungen. Keine Wertung.
- **Vorführen:** Eine Folge Halbzug für Halbzug oder automatisch ansehen. Zurück rekonstruiert Brett und Text. Keine Wertung.
- **Geführt:** Die ausgewählte Lernfarbe selbst ziehen; Gegnerantworten werden einzeln ausgeführt. Erklärungen bleiben sichtbar. Abschlüsse werden getrennt gespeichert, ohne Lern-Elo und Tageszielpunkte.
- **Selbst üben:** Die ganze Folge ohne Lösungshinweise spielen. Erst der vollständige, nicht unterstützte Versuch wird einmal gewertet; nicht jeder Halbzug. Eine Folge mit Fehlversuchen zählt nicht als fehlerfrei gelöst.

„Weiter“ überspringt keinen eigenen Übungszug. Hinweise, Rückwärtsnavigation und Wiederholungen bereits gesehener Folgen kennzeichnen den Versuch als **unterstützt**. In einer Vorführung ist Abspielen/Pause verfügbar; in einer Übung werden nur die kuratierten Gegnerzüge automatisch gespielt. Bei Wechseln werden laufende Lektions-Timer abgebrochen und ihre Sitzungs-/Stellungskennung erneut geprüft. Eine offene Umwandlung wird abgebrochen; Escape wandelt nicht stillschweigend in eine Dame um.

Die 45 Motiv- und Eröffnungslektionen bieten **Hauptlinie, Abwehr und Konter/Gegenspiel**. Die 20 direkten Matt- und Materialaufgaben konzentrieren sich dagegen auf genau eine konkrete Lösungsfolge. Eröffnungszweige beginnen nach `startPly` Halbzügen der Hauptlinie. Die Taktikabwehr beginnt ausdrücklich **einen Zug früher mit Schwarz am Zug**. Taktikkonter sind gekennzeichnete, verwandte **Vergleichsstellungen**: Die 20 Konterabläufe nutzen vier gemeinsame Motivvergleiche (zusätzlicher Verteidiger, relative Fesselung, ungedeckter Spieß, rettende Damenantwort). Es sind nicht 20 verschiedene erzwungene Widerlegungen der Hauptstellungen.

Die Abdeckung ist bewusst begrenzt: **25 Eröffnungs-IDs, die bisherigen 20 Motiv-IDs und 20 direkte Praxisaufgaben**, kein vollständiger Variantenbaum und keine Behauptung universell bester Antworten. Manche vereinfachten Fesselungs-/Gabelstellungen enden trotz Materialgewinn mit bloßen Königen beziehungsweise König und Springer in **Remis**. Rückschläge und dieses Partieergebnis werden ausdrücklich erläutert. Die Eröffnungsausschnitte enden mit einem Entwicklungsplan, nicht mit einem behaupteten Gewinn.

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

Die Tests prüfen exakte IDs und Kategorien, deterministische Generatorausgabe, alle 155 vollständigen Szenarien und Vergleichsantworten, 465 Abschlüsse in Demo/Geführt/Üben plus den Erklärmodus, echte Mattenden in der angegebenen Zugzahl, Materialbilanzen einschließlich Rücknahmen und Remis, unveränderte Stellung bei Fehlern, beide Lernfarben, Rückwärts-/Neustartnavigation, einmalige Abschlussereignisse, Hilfe-Kennzeichnung, Rochade/en passant/Unterverwandlung, alle 64 Engine-Pfeilkoordinaten in beiden Orientierungen, PGN-Header/Export und legale Wiederaufnahme gespeicherter Zugfolgen. Die vorhandenen Regeln-, KI-, Endspiel- und Strategietests bleiben enthalten.

Lern- und Spiel-Elo beginnen bei neuen Profilen bei **0** und werden ausschließlich durch absolvierte Übungen beziehungsweise gewertete Partien aufgebaut. Werte können nicht negativ werden. Bereits erspielte Wertungen bleiben erhalten; lediglich unberührte alte 800-Standardwerte ohne gewertete Aktivität werden auf 0 migriert. Die Lern-Elo reagiert ähnlich einer Elo-Wertung auf richtige und falsche Entscheidungen sowie die Schwierigkeit der Übung; sie ist keine offizielle Spielstärke.
