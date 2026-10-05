/* Generated from training-data.json – do not edit manually. */
window.CHESS_TRAINING_DATA = {
  "schemaVersion": 1,
  "tactics": [
    {
      "id": "fork-01",
      "category": "fork",
      "title": "Springergabel auf f7",
      "fen": "3q3k/5ppp/8/4N3/8/8/6PP/6K1 w - - 0 1",
      "line": [
        "e5f7"
      ],
      "prompt": "Finde die Springergabel.",
      "explanation": "Sf7+ greift gleichzeitig König und Dame an. Weil Schwarz zuerst auf das Schach reagieren muss, fällt danach die Dame.",
      "hint": "Prüfe alle Springerschachs.",
      "anchors": {
        "pieces": [
          "e5"
        ],
        "targets": [
          "f7",
          "d8",
          "h8"
        ]
      }
    },
    {
      "id": "fork-02",
      "category": "fork",
      "title": "Gabel auf c7",
      "fen": "r3k3/8/8/3N4/8/8/8/6K1 w - - 0 1",
      "line": [
        "d5c7"
      ],
      "prompt": "Gewinne den Turm mit Tempo.",
      "explanation": "Sc7+ zwingt den König zu einer Antwort und greift zugleich den Turm a8 an.",
      "hint": "Welches Springerfeld greift König und Turm an?",
      "anchors": {
        "pieces": [
          "d5"
        ],
        "targets": [
          "c7",
          "e8",
          "a8"
        ]
      }
    },
    {
      "id": "fork-03",
      "category": "fork",
      "title": "Dame und König",
      "fen": "6k1/8/2N5/5q2/8/8/8/6K1 w - - 0 1",
      "line": [
        "c6e7"
      ],
      "prompt": "Finde den Doppelangriff.",
      "explanation": "Se7+ greift den König g8 und die Dame f5 zugleich an.",
      "hint": "Suche ein Springerschach in der Nähe der Dame.",
      "anchors": {
        "pieces": [
          "c6"
        ],
        "targets": [
          "e7",
          "g8",
          "f5"
        ]
      }
    },
    {
      "id": "fork-04",
      "category": "fork",
      "title": "Gabel auf h6",
      "fen": "6k1/5q2/8/5N2/8/8/8/6K1 w - - 0 1",
      "line": [
        "f5h6"
      ],
      "prompt": "Greife König und Dame an.",
      "explanation": "Sh6+ ist Schach und attackiert gleichzeitig die Dame f7.",
      "hint": "Der Springer kann am Brettrand besonders überraschend sein.",
      "anchors": {
        "pieces": [
          "f5"
        ],
        "targets": [
          "h6",
          "g8",
          "f7"
        ]
      }
    },
    {
      "id": "fork-05",
      "category": "fork",
      "title": "Gabel auf e6",
      "fen": "3q1k2/8/8/6N1/8/8/8/6K1 w - - 0 1",
      "line": [
        "g5e6"
      ],
      "prompt": "Nutze das Schachgebot.",
      "explanation": "Se6+ gabelt König f8 und Dame d8. Das Schach verschafft Weiß den nötigen Zug zum Damengewinn.",
      "hint": "Welche zentralen Felder erreicht der Springer mit Schach?",
      "anchors": {
        "pieces": [
          "g5"
        ],
        "targets": [
          "e6",
          "f8",
          "d8"
        ]
      }
    },
    {
      "id": "pin-01",
      "category": "pin",
      "title": "Fesselung auf der e-Linie",
      "fen": "4k3/4q3/8/8/8/8/8/4R1K1 w - - 0 1",
      "line": [
        "e1e7"
      ],
      "prompt": "Nutze die gefesselte Dame.",
      "explanation": "Txe7+ gewinnt die Dame. Sie steht vor ihrem König auf derselben offenen Linie.",
      "hint": "Schau auf die e-Linie zwischen Turm und König.",
      "anchors": {
        "pieces": [
          "e7"
        ],
        "targets": [
          "e1",
          "e8"
        ]
      }
    },
    {
      "id": "pin-02",
      "category": "pin",
      "title": "Fesselung auf der d-Linie",
      "fen": "3k4/3q4/8/8/8/8/8/3R2K1 w - - 0 1",
      "line": [
        "d1d7"
      ],
      "prompt": "Gewinne die gefesselte Figur.",
      "explanation": "Txd7+ gewinnt die Dame, die den König d8 verdeckt.",
      "hint": "Die Dame darf die Linie zum König nicht freigeben.",
      "anchors": {
        "pieces": [
          "d7"
        ],
        "targets": [
          "d1",
          "d8"
        ]
      }
    },
    {
      "id": "pin-03",
      "category": "pin",
      "title": "Fesselung am Brettrand",
      "fen": "7k/7q/8/8/8/8/8/6KR w - - 0 1",
      "line": [
        "h1h7"
      ],
      "prompt": "Nutze die h-Linie.",
      "explanation": "Txh7+ gewinnt die Dame, weil hinter ihr unmittelbar der König steht.",
      "hint": "Turm, Dame und König stehen auf einer Linie.",
      "anchors": {
        "pieces": [
          "h7"
        ],
        "targets": [
          "h1",
          "h8"
        ]
      }
    },
    {
      "id": "pin-04",
      "category": "pin",
      "title": "Fesselung auf der c-Linie",
      "fen": "2k5/2q5/8/8/8/8/8/2R3K1 w - - 0 1",
      "line": [
        "c1c7"
      ],
      "prompt": "Schlage die gefesselte Dame.",
      "explanation": "Txc7+ nutzt die absolute Fesselung auf der c-Linie.",
      "hint": "Eine absolut gefesselte Figur schützt sich nicht durch Wegziehen.",
      "anchors": {
        "pieces": [
          "c7"
        ],
        "targets": [
          "c1",
          "c8"
        ]
      }
    },
    {
      "id": "pin-05",
      "category": "pin",
      "title": "Fesselung auf der f-Linie",
      "fen": "5k2/5q2/8/8/8/8/8/5RK1 w - - 0 1",
      "line": [
        "f1f7"
      ],
      "prompt": "Finde den Gewinnzug.",
      "explanation": "Txf7+ gewinnt die vor dem König gefesselte Dame.",
      "hint": "Folge der offenen f-Linie bis zum König.",
      "anchors": {
        "pieces": [
          "f7"
        ],
        "targets": [
          "f1",
          "f8"
        ]
      }
    },
    {
      "id": "skewer-01",
      "category": "skewer",
      "title": "Läuferspieß",
      "fen": "8/8/4q3/3k4/8/1B6/8/6K1 w - - 0 1",
      "line": [
        "b3c4"
      ],
      "prompt": "Spieße König und Dame auf.",
      "explanation": "Lc4+ zwingt den König von d5 weg. Danach kann der Läufer die Dame e6 schlagen.",
      "hint": "Suche ein Läuferschach, hinter dem die Dame steht.",
      "anchors": {
        "pieces": [
          "b3"
        ],
        "targets": [
          "c4",
          "d5",
          "e6"
        ]
      }
    },
    {
      "id": "skewer-02",
      "category": "skewer",
      "title": "Diagonaler Spieß",
      "fen": "8/8/5q2/4k3/8/2B5/8/6K1 w - - 0 1",
      "line": [
        "c3d4"
      ],
      "prompt": "Vertreibe den König.",
      "explanation": "Ld4+ greift zuerst den König e5 an. Nach dessen Zug fällt die Dame f6.",
      "hint": "König und Dame stehen auf derselben Diagonale.",
      "anchors": {
        "pieces": [
          "c3"
        ],
        "targets": [
          "d4",
          "e5",
          "f6"
        ]
      }
    },
    {
      "id": "skewer-03",
      "category": "skewer",
      "title": "Spieß von rechts",
      "fen": "8/8/1q6/2k5/8/4B3/8/6K1 w - - 0 1",
      "line": [
        "e3d4"
      ],
      "prompt": "Gewinne die Dame hinter dem König.",
      "explanation": "Ld4+ zwingt den König c5 fort und legt anschließend die Dame b6 frei.",
      "hint": "Der wertvollere König steht vor der Dame.",
      "anchors": {
        "pieces": [
          "e3"
        ],
        "targets": [
          "d4",
          "c5",
          "b6"
        ]
      }
    },
    {
      "id": "skewer-04",
      "category": "skewer",
      "title": "Turmspieß auf der d-Linie",
      "fen": "8/8/3q4/3k4/R7/8/8/6K1 w - - 0 1",
      "line": [
        "a4d4"
      ],
      "prompt": "Gib Schach mit dem Turm.",
      "explanation": "Td4+ vertreibt den König d5; dahinter bleibt die Dame d6 stehen.",
      "hint": "Stelle den Turm unter König und Dame.",
      "anchors": {
        "pieces": [
          "a4"
        ],
        "targets": [
          "d4",
          "d5",
          "d6"
        ]
      }
    },
    {
      "id": "skewer-05",
      "category": "skewer",
      "title": "Turmspieß auf der f-Linie",
      "fen": "8/8/5q2/5k2/R7/8/8/6K1 w - - 0 1",
      "line": [
        "a4f4"
      ],
      "prompt": "Nutze die gemeinsame Linie.",
      "explanation": "Tf4+ zwingt den König f5 weg und gewinnt danach die Dame f6.",
      "hint": "Ein Turm braucht eine offene Linie.",
      "anchors": {
        "pieces": [
          "a4"
        ],
        "targets": [
          "f4",
          "f5",
          "f6"
        ]
      }
    },
    {
      "id": "discovered-01",
      "category": "discovered",
      "title": "Abzug mit Läuferschach",
      "fen": "6k1/4q2p/8/8/4B3/8/8/4R1K1 w - - 0 1",
      "line": [
        "e4h7"
      ],
      "prompt": "Ziehe mit Tempo aus der e-Linie.",
      "explanation": "Lxh7+ gibt Schach und öffnet gleichzeitig dem Turm den Angriff auf die Dame e7.",
      "hint": "Welche Figur blockiert momentan deinen Turm?",
      "anchors": {
        "pieces": [
          "e4"
        ],
        "targets": [
          "h7",
          "e7"
        ]
      }
    },
    {
      "id": "discovered-02",
      "category": "discovered",
      "title": "Abzug auf der d-Linie",
      "fen": "7k/3q2p1/8/8/3B4/8/8/3R2K1 w - - 0 1",
      "line": [
        "d4g7"
      ],
      "prompt": "Öffne die Turmlinie mit Schach.",
      "explanation": "Lxg7+ zieht mit Tempo ab und öffnet Td1 gegen die Dame d7.",
      "hint": "Der Läufer kann schlagen und zugleich die d-Linie räumen.",
      "anchors": {
        "pieces": [
          "d4"
        ],
        "targets": [
          "g7",
          "d7"
        ]
      }
    },
    {
      "id": "discovered-03",
      "category": "discovered",
      "title": "Abzug auf der c-Linie",
      "fen": "6k1/2q2p2/8/8/2B5/8/8/2R3K1 w - - 0 1",
      "line": [
        "c4f7"
      ],
      "prompt": "Gewinne die Dame durch Abzug.",
      "explanation": "Lxf7+ räumt die c-Linie und gibt Schach. Der Turm greift nun die Dame c7 an.",
      "hint": "Suche einen Läuferzug mit Schach.",
      "anchors": {
        "pieces": [
          "c4"
        ],
        "targets": [
          "f7",
          "c7"
        ]
      }
    },
    {
      "id": "discovered-04",
      "category": "discovered",
      "title": "Springer zieht mit Schach ab",
      "fen": "8/6q1/7k/8/3N4/8/1B6/K7 w - - 0 1",
      "line": [
        "d4f5"
      ],
      "prompt": "Öffne die Läuferdiagonale.",
      "explanation": "Sf5+ räumt die Diagonale b1–g7 und greift den König an; danach fällt die Dame g7.",
      "hint": "Der Springer blockiert den eigenen Läufer.",
      "anchors": {
        "pieces": [
          "d4"
        ],
        "targets": [
          "f5",
          "g7"
        ]
      }
    },
    {
      "id": "discovered-05",
      "category": "discovered",
      "title": "Abzug auf der langen Diagonale",
      "fen": "8/1q5k/8/8/4N3/8/6B1/6K1 w - - 0 1",
      "line": [
        "e4f6"
      ],
      "prompt": "Ziehe den Springer mit Schach weg.",
      "explanation": "Sf6+ öffnet dem Läufer g2 die lange Diagonale zur Dame b7.",
      "hint": "Welche eigene Figur steht zwischen Läufer und Dame?",
      "anchors": {
        "pieces": [
          "e4"
        ],
        "targets": [
          "f6",
          "b7"
        ]
      }
    }
  ],
  "openings": [
    {
      "id": "italian",
      "name": "Italienische Partie",
      "eco": "C50",
      "side": "w",
      "rating": 700,
      "line": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1c4",
        "f8c5",
        "c2c3",
        "g8f6",
        "d2d4",
        "e5d4",
        "c3d4",
        "c5b4"
      ],
      "ideas": [
        "Schnelle Entwicklung",
        "Druck gegen f7",
        "Zentrum mit d4 öffnen"
      ],
      "warning": "Greife f7 erst an, wenn genügend Figuren entwickelt sind."
    },
    {
      "id": "ruy-lopez",
      "name": "Spanische Partie",
      "eco": "C60",
      "side": "w",
      "rating": 800,
      "line": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1b5",
        "a7a6",
        "b5a4",
        "g8f6",
        "e1g1",
        "f8e7",
        "f1e1",
        "b7b5",
        "a4b3",
        "d7d6"
      ],
      "ideas": [
        "Druck auf den Springer c6",
        "Ruhiger Aufbau",
        "Zentralen Vorstoß d4 vorbereiten"
      ],
      "warning": "Lxc6 gewinnt den Bauern e5 nicht automatisch."
    },
    {
      "id": "scotch",
      "name": "Schottische Partie",
      "eco": "C45",
      "side": "w",
      "rating": 750,
      "line": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "d2d4",
        "e5d4",
        "f3d4",
        "g8f6",
        "b1c3",
        "f8b4"
      ],
      "ideas": [
        "Zentrum früh öffnen",
        "Freie Linien für die Figuren",
        "Aktives Figurenspiel"
      ],
      "warning": "Entwickle Figuren statt die Dame mehrfach zu ziehen."
    },
    {
      "id": "four-knights",
      "name": "Vierspringerspiel",
      "eco": "C47",
      "side": "w",
      "rating": 650,
      "line": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "b1c3",
        "g8f6",
        "f1b5",
        "f8b4",
        "e1g1",
        "e8g8"
      ],
      "ideas": [
        "Alle Leichtfiguren entwickeln",
        "Früh rochieren",
        "Solide Zentrumskontrolle"
      ],
      "warning": "Symmetrie ersetzt keinen Plan; bereite d4 vor."
    },
    {
      "id": "vienna",
      "name": "Wiener Partie",
      "eco": "C25",
      "side": "w",
      "rating": 800,
      "line": [
        "e2e4",
        "e7e5",
        "b1c3",
        "g8f6",
        "f2f4",
        "d7d5",
        "f4e5",
        "f6e4"
      ],
      "ideas": [
        "e5 kontrollieren",
        "Mit f4 Raum gewinnen",
        "Königsangriff vorbereiten"
      ],
      "warning": "Der frühe f-Bauernzug schwächt den eigenen König."
    },
    {
      "id": "kings-gambit",
      "name": "Königsgambit",
      "eco": "C30",
      "side": "w",
      "rating": 950,
      "line": [
        "e2e4",
        "e7e5",
        "f2f4",
        "e5f4",
        "g1f3",
        "g7g5",
        "h2h4",
        "g5g4",
        "f3e5"
      ],
      "ideas": [
        "Linien gegen den König öffnen",
        "Entwicklung vor Material",
        "Schwarzes Zentrum angreifen"
      ],
      "warning": "Das Gambit ist taktisch; rechne jeden Zug konkret."
    },
    {
      "id": "sicilian-open",
      "name": "Sizilianisch · Offene Variante",
      "eco": "B20",
      "side": "b",
      "rating": 900,
      "line": [
        "e2e4",
        "c7c5",
        "g1f3",
        "d7d6",
        "d2d4",
        "c5d4",
        "f3d4",
        "g8f6",
        "b1c3"
      ],
      "ideas": [
        "Asymmetrische Bauernstruktur",
        "Gegenspiel auf der c-Linie",
        "Druck gegen das Zentrum"
      ],
      "warning": "Vernachlässige trotz Gegenspiel nicht die Entwicklung."
    },
    {
      "id": "sicilian-alapin",
      "name": "Sizilianisch · Alapin",
      "eco": "B22",
      "side": "w",
      "rating": 850,
      "line": [
        "e2e4",
        "c7c5",
        "c2c3",
        "g8f6",
        "e4e5",
        "f6d5",
        "d2d4",
        "c5d4",
        "g1f3"
      ],
      "ideas": [
        "Starkes Bauernzentrum",
        "d4 vorbereiten",
        "Offene Linien nach Abtausch"
      ],
      "warning": "Das Zentrum muss durch schnelle Entwicklung gestützt werden."
    },
    {
      "id": "french",
      "name": "Französische Verteidigung",
      "eco": "C00",
      "side": "b",
      "rating": 750,
      "line": [
        "e2e4",
        "e7e6",
        "d2d4",
        "d7d5",
        "b1c3",
        "g8f6",
        "e4e5",
        "f6d7",
        "f2f4"
      ],
      "ideas": [
        "d5 fest kontrollieren",
        "Mit c5 das Zentrum angreifen",
        "Geschlossene Ketten verstehen"
      ],
      "warning": "Der Läufer c8 braucht später einen aktiven Plan."
    },
    {
      "id": "caro-kann",
      "name": "Caro-Kann-Verteidigung",
      "eco": "B10",
      "side": "b",
      "rating": 700,
      "line": [
        "e2e4",
        "c7c6",
        "d2d4",
        "d7d5",
        "b1c3",
        "d5e4",
        "c3e4",
        "c8f5"
      ],
      "ideas": [
        "Solides Zentrum",
        "Läufer vor e6 entwickeln",
        "Gesunde Bauernstruktur"
      ],
      "warning": "Spiele nicht zu passiv; entwickle den Damenläufer früh."
    },
    {
      "id": "scandinavian",
      "name": "Skandinavische Verteidigung",
      "eco": "B01",
      "side": "b",
      "rating": 650,
      "line": [
        "e2e4",
        "d7d5",
        "e4d5",
        "d8d5",
        "b1c3",
        "d5d8",
        "d2d4"
      ],
      "ideas": [
        "Zentrum sofort angreifen",
        "Klare Bauernstruktur",
        "Einfacher Aufbau"
      ],
      "warning": "Die Dame sollte nicht durch viele Tempi gejagt werden."
    },
    {
      "id": "pirc",
      "name": "Pirc-Verteidigung",
      "eco": "B07",
      "side": "b",
      "rating": 900,
      "line": [
        "e2e4",
        "d7d6",
        "d2d4",
        "g8f6",
        "b1c3",
        "g7g6",
        "f2f4",
        "f8g7"
      ],
      "ideas": [
        "Zentrum zunächst zulassen",
        "Später mit e5 oder c5 angreifen",
        "Fianchetto-Läufer nutzen"
      ],
      "warning": "Ohne rechtzeitigen Gegenschlag wird Schwarz eingeengt."
    },
    {
      "id": "queens-gambit",
      "name": "Damengambit",
      "eco": "D06",
      "side": "w",
      "rating": 700,
      "line": [
        "d2d4",
        "d7d5",
        "c2c4",
        "e7e6",
        "b1c3",
        "g8f6",
        "c1g5",
        "f8e7",
        "e2e3",
        "e8g8"
      ],
      "ideas": [
        "Druck gegen d5",
        "Raum im Zentrum",
        "Figuren natürlich entwickeln"
      ],
      "warning": "Der c-Bauer ist meist kein echtes Opfer."
    },
    {
      "id": "qgd",
      "name": "Abgelehntes Damengambit",
      "eco": "D30",
      "side": "b",
      "rating": 800,
      "line": [
        "d2d4",
        "d7d5",
        "c2c4",
        "e7e6",
        "b1c3",
        "g8f6",
        "c1g5",
        "f8e7",
        "e2e3",
        "e8g8"
      ],
      "ideas": [
        "d5 sicher halten",
        "Ruhige Entwicklung",
        "Später c5 als Befreiungsschlag"
      ],
      "warning": "Der Läufer c8 darf nicht dauerhaft eingeschlossen bleiben."
    },
    {
      "id": "qga",
      "name": "Angenommenes Damengambit",
      "eco": "D20",
      "side": "b",
      "rating": 850,
      "line": [
        "d2d4",
        "d7d5",
        "c2c4",
        "d5c4",
        "g1f3",
        "g8f6",
        "e2e3",
        "e7e6",
        "f1c4"
      ],
      "ideas": [
        "Bauern vorübergehend nehmen",
        "Schnell entwickeln",
        "Mit c5 das Zentrum angreifen"
      ],
      "warning": "Versuche nicht, den Mehrbauern um jeden Preis festzuhalten."
    },
    {
      "id": "london",
      "name": "Londoner System",
      "eco": "D02",
      "side": "w",
      "rating": 600,
      "line": [
        "d2d4",
        "d7d5",
        "g1f3",
        "g8f6",
        "c1f4",
        "e7e6",
        "e2e3",
        "c7c5",
        "c2c3"
      ],
      "ideas": [
        "Stabiler Aufbau",
        "Läufer außerhalb der Bauernkette",
        "e5 kontrollieren"
      ],
      "warning": "Spiele den Aufbau nicht automatisch; beobachte schwarze Gegenschläge."
    },
    {
      "id": "colle",
      "name": "Colle-System",
      "eco": "D04",
      "side": "w",
      "rating": 650,
      "line": [
        "d2d4",
        "d7d5",
        "g1f3",
        "g8f6",
        "e2e3",
        "e7e6",
        "f1d3",
        "c7c5",
        "e1g1"
      ],
      "ideas": [
        "Sicher entwickeln",
        "e4 vorbereiten",
        "Königsangriff nach Zentrumsvorstoß"
      ],
      "warning": "Ohne e4 bleibt der Aufbau oft zu passiv."
    },
    {
      "id": "catalan",
      "name": "Katalanische Eröffnung",
      "eco": "E00",
      "side": "w",
      "rating": 1000,
      "line": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "g2g3",
        "d7d5",
        "f1g2",
        "f8e7",
        "g1f3",
        "e8g8"
      ],
      "ideas": [
        "Druck auf der langen Diagonale",
        "Damengambit-Struktur",
        "Langfristiger Positionsdruck"
      ],
      "warning": "Ein geopferter c-Bauer verlangt aktives Figurenspiel."
    },
    {
      "id": "slav",
      "name": "Slawische Verteidigung",
      "eco": "D10",
      "side": "b",
      "rating": 800,
      "line": [
        "d2d4",
        "d7d5",
        "c2c4",
        "c7c6",
        "g1f3",
        "g8f6",
        "b1c3",
        "d5c4"
      ],
      "ideas": [
        "d5 solide stützen",
        "Damenläufer beweglich halten",
        "Gesunde Bauernstruktur"
      ],
      "warning": "Der Zug dxc4 sollte mit Entwicklung verbunden sein."
    },
    {
      "id": "kings-indian",
      "name": "Königsindische Verteidigung",
      "eco": "E60",
      "side": "b",
      "rating": 1000,
      "line": [
        "d2d4",
        "g8f6",
        "c2c4",
        "g7g6",
        "b1c3",
        "f8g7",
        "e2e4",
        "d7d6",
        "g1f3",
        "e8g8"
      ],
      "ideas": [
        "Königsflügelangriff",
        "Gegenschlag mit e5",
        "Geschlossenes Zentrum dynamisch behandeln"
      ],
      "warning": "Weiß besitzt Raum; Schwarz braucht aktives Gegenspiel."
    },
    {
      "id": "nimzo-indian",
      "name": "Nimzoindische Verteidigung",
      "eco": "E20",
      "side": "b",
      "rating": 1050,
      "line": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "b1c3",
        "f8b4",
        "e2e3",
        "e8g8",
        "f1d3",
        "d7d5"
      ],
      "ideas": [
        "Springer c3 fesseln",
        "e4 kontrollieren",
        "Bauernstruktur gezielt verändern"
      ],
      "warning": "Gib das Läuferpaar nur für einen konkreten strukturellen Vorteil auf."
    },
    {
      "id": "dutch",
      "name": "Holländische Verteidigung",
      "eco": "A80",
      "side": "b",
      "rating": 950,
      "line": [
        "d2d4",
        "f7f5",
        "g2g3",
        "g8f6",
        "f1g2",
        "g7g6",
        "g1f3",
        "f8g7",
        "e1g1"
      ],
      "ideas": [
        "e4 kontrollieren",
        "Königsflügelangriff",
        "Asymmetrische Stellung"
      ],
      "warning": "f5 schwächt den König; entwickle schnell und rochiere."
    },
    {
      "id": "english",
      "name": "Englische Eröffnung",
      "eco": "A20",
      "side": "w",
      "rating": 850,
      "line": [
        "c2c4",
        "e7e5",
        "b1c3",
        "g8f6",
        "g2g3",
        "d7d5",
        "c4d5",
        "f6d5",
        "f1g2"
      ],
      "ideas": [
        "d5 kontrollieren",
        "Flexibler Bauernaufbau",
        "Druck auf der langen Diagonale"
      ],
      "warning": "Auch Flankeneröffnungen brauchen Einfluss im Zentrum."
    },
    {
      "id": "reti",
      "name": "Réti-Eröffnung",
      "eco": "A09",
      "side": "w",
      "rating": 900,
      "line": [
        "g1f3",
        "d7d5",
        "c2c4",
        "e7e6",
        "g2g3",
        "g8f6",
        "f1g2",
        "f8e7",
        "e1g1"
      ],
      "ideas": [
        "Zentrum aus der Distanz kontrollieren",
        "Flexible Zugfolge",
        "Fianchetto entwickeln"
      ],
      "warning": "Überlasse Schwarz nicht dauerhaft das gesamte Zentrum."
    },
    {
      "id": "modern",
      "name": "Moderne Verteidigung",
      "eco": "B06",
      "side": "b",
      "rating": 950,
      "line": [
        "e2e4",
        "g7g6",
        "d2d4",
        "f8g7",
        "b1c3",
        "d7d6",
        "f2f4"
      ],
      "ideas": [
        "Flexibler Aufbau",
        "Zentrum später angreifen",
        "Läufer g7 aktivieren"
      ],
      "warning": "Der Gegner darf sein Zentrum nicht ungestört vorrollen lassen."
    }
  ],
  "endgames": [
    {
      "id": "ladder-mate",
      "title": "Treppenmatt",
      "fen": "8/8/3k4/8/8/8/7R/R3K3 w - - 0 1",
      "goal": "Dränge den König Reihe für Reihe mit den beiden Türmen an den Rand und setze matt.",
      "tips": [
        "Die Türme schneiden abwechselnd eine Reihe ab.",
        "Halte bedrohte Türme weit genug vom König entfernt.",
        "Vermeide Patt: Der gegnerische König braucht bis zum Matt einen legalen Zug."
      ]
    },
    {
      "id": "pawn-opposition",
      "title": "König, Bauer und Opposition",
      "fen": "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1",
      "goal": "Führe den Bauern zur Umwandlung. Nutze den König, um die Opposition zu gewinnen.",
      "tips": [
        "Der König gehört vor den Bauern.",
        "Stehen sich die Könige mit einem Feld Abstand gegenüber, hat die Seite ohne Zug die Opposition.",
        "Schiebe den Bauern erst, wenn dein König keinen Fortschritt mehr machen kann."
      ]
    }
  ],
  "masterclass": {
    "id": "opera-game",
    "title": "Morphys Opernpartie · 1858",
    "intro": "Spiele drei kritische Momente aus Paul Morphys berühmter Lehrpartie: Entwicklung, Initiative und offene Linien.",
    "steps": [
      {
        "fen": "rn1qkb1r/ppp2ppp/5n2/4p3/2B1P3/5Q2/PPP2PPP/RNB1K2R w KQkq - 2 7",
        "question": "7. Zug: Wie erhöht Morphy den Druck gegen f7?",
        "choices": [
          {
            "move": "c4f7",
            "label": "Lxf7+?",
            "kind": "blunder",
            "text": "Taktischer Fehler: Das voreilige Opfer gibt den Läufer ohne ausreichenden Angriff her."
          },
          {
            "move": "e1g1",
            "label": "O-O",
            "kind": "passive",
            "text": "Solide, aber zu ruhig: Schwarz erhält Zeit zur Entwicklung und Morphy lässt die konkrete Initiative verstreichen."
          },
          {
            "move": "f3b3",
            "label": "Db3!",
            "kind": "correct",
            "text": "Richtig: Db3 entwickelt die Dame mit Doppelangriff auf f7 und b7. Eine aktive Figur erzeugt sofort konkrete Drohungen."
          }
        ],
        "nextFen": "rn1qkb1r/ppp2ppp/5n2/4p3/2B1P3/1Q6/PPP2PPP/RNB1K2R b KQkq - 3 7"
      },
      {
        "fen": "rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq b6 0 10",
        "question": "10. Zug: Schwarz greift den Läufer an. Wie hält Weiß die Initiative?",
        "choices": [
          {
            "move": "g5f6",
            "label": "Lxf6?",
            "kind": "blunder",
            "text": "Taktischer Fehler: Der Abtausch nimmt dem Angriff eine wichtige Figur und lässt Schwarz konsolidieren."
          },
          {
            "move": "a2a3",
            "label": "a3",
            "kind": "passive",
            "text": "Zu langsam: Der Zug ignoriert den Moment, in dem der schwarze König noch im Zentrum steht."
          },
          {
            "move": "c3b5",
            "label": "Sxb5!",
            "kind": "correct",
            "text": "Richtig: Sxb5! öffnet Linien und opfert Material für Entwicklungsvorsprung und Angriff auf den unrochierten König."
          }
        ],
        "nextFen": "rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 10"
      },
      {
        "fen": "3rkb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR3R w k - 3 13",
        "question": "13. Zug: Welche Figur muss die offene d-Linie besetzen?",
        "choices": [
          {
            "move": "c1b1",
            "label": "Kb1?",
            "kind": "passive",
            "text": "Passiv: Der Königszug gibt Schwarz Zeit, die d-Linie zu stabilisieren und die Initiative zu übernehmen."
          },
          {
            "move": "h2h3",
            "label": "h3?",
            "kind": "blunder",
            "text": "Taktischer Fehler: Ein Randbauernzug ignoriert den Entwicklungsvorsprung; Schwarz kann sich nun konsolidieren."
          },
          {
            "move": "d1d7",
            "label": "Txd7!",
            "kind": "correct",
            "text": "Richtig: Txd7! öffnet die d-Linie mit Tempo. Alle weißen Figuren greifen an, während der schwarze König im Zentrum bleibt."
          }
        ],
        "nextFen": "3rkb1r/p2Rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2K4R b k - 0 13"
      }
    ]
  }
};
