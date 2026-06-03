# Nebenwirkungen V0.1 Card Set Plan

Ziel: Ein kleiner, testbarer Kartenpool mit klaren Klassenidentitaeten, stabiler Startkurve und echter Deckbau-Auswahl. Dieses Set ist bewusst kleiner als ein fertiges Sammelkartenspiel, aber gross genug, damit Spieler vor dem Match sinnvolle Entscheidungen treffen koennen.

## V0.1 Regeln

- 3 Klassen: Raver, Awareness, Dealer
- 12 Klassenkarten pro Klasse
- 18 neutrale Karten
- 54 Karten im ersten Pool
- Deckgroesse fuer Tests: 20 Karten
- Maximal 2 Kopien pro Karte
- 1 Klasse pro Deck plus neutrale Karten
- Mindestens 8 Klassenkarten pro Deck
- Mindestens 8 Personen pro Deck
- Mindestens 6 Karten mit Kosten 1 bis 3
- Start-Cash bleibt bei 2, damit Runde 1 nicht tot ist
- Mulligan und Starthand-Sicherheit bleiben aktiv

Damit hat jede Klasse beim Deckbau 30 verschiedene Karten zur Auswahl:

```text
12 Klassenkarten + 18 neutrale Karten = 30 waehlbare Karten
```

Aus diesen 30 Karten baut der Spieler ein 20-Karten-Deck. Durch maximal 2 Kopien pro Karte entstehen echte Entscheidungen, ohne dass der erste Pool zu gross wird.

## Kartentypen

V0.1 nutzt nur drei technische Typen:

- Person: bleibt auf dem Board und kann angreifen.
- Aktion: einmaliger Effekt, verschwindet danach.
- Ort: dauerhafter Effekt, aber erstmal maximal ein einfacher wiederkehrender Trigger.

Substanznamen koennen als Kartenname oder Tag vorkommen, muessen aber immer einen Nachteil haben. Keine Karte soll Konsum belohnen, ohne Kosten zu zeigen.

## Risiko-Grundregeln

Diese Regeln sollten in V0.1 einfach bleiben:

- Rausch 6+: Am Ende deines Zuges verlierst du 1 Stabilitaet.
- Fahndung 6+: Am Anfang deines Zuges verlierst du 1 Cash fuer diesen Zug.
- Abhaengigkeit: Wird zuerst nur durch Karten erhoeht oder reduziert. Kein globaler Trigger in V0.1.
- Kontrolle: Defensive Ressource gegen Nachteile. In V0.1 lieber sparsam nutzen.

## Klassenidentitaet

### Raver

Raver ist Tempo, Buffs und Burst. Die Klasse gewinnt ueber fruehen Druck und starke Angriffszuege. Der Preis ist steigender Rausch und Stabilitaetsverlust.

Heldenskill:

```text
Afterhour
2 Cash: Eine eigene Person erhaelt +1 Angriff bis zum Ende des Zuges. +1 Rausch.
```

Staerken:

- schnelle Personen
- Angriffsbuffs
- Sofortdruck
- starke Finisher

Schwaechen:

- Rausch eskaliert
- verliert Stabilitaet
- wenig Verteidigung
- schlecht in langen Spielen

### Awareness

Awareness ist Schutz, Stabilitaet und Kontrolle. Die Klasse gewinnt ueber lange Spiele, gute Trades und Risikosenkung.

Heldenskill:

```text
Klarer Kopf
2 Cash: Reduziere Rausch oder Fahndung um 1.
```

Staerken:

- Heilung und Stabilitaet
- Risikowerte senken
- gegnerische Angriffe abschwaechen
- gute defensive Personen

Schwaechen:

- wenig Burst
- langsamer Start
- braucht Board-Praesenz
- kann von Tempo ueberrannt werden

### Dealer

Dealer ist Cash-Vorteil, Tempo und riskante Power-Zuege. Die Klasse kann mehr in einem Zug machen, bezahlt aber mit Fahndung.

Heldenskill:

```text
Deal einfaedeln
2 Cash: Erhalte +1 Cash in diesem Zug. +1 Fahndung.
```

Staerken:

- zusaetzliches Cash
- starke Midgame-Zuege
- direkter Schaden
- gute Tempo-Swings

Schwaechen:

- Fahndung eskaliert
- anfaellig fuer Razzia-Effekte
- Karten haben Rueckschlaege
- kann sich selbst ueberziehen

## Raver-Karten

### 1. Auf Anschlag

```text
Kosten: 1
Typ: Person
Werte: 2/1
Effekt: Wenn du mindestens 1 Rausch hast, erhaelt diese Person +1 Angriff in diesem Zug.
Nachteil: +1 Rausch.
```

Rolle: frueher Druck, aber fragil.

### 2. Anreissen

```text
Kosten: 1
Typ: Aktion
Effekt: Eine eigene Person erhaelt +2 Angriff bis zum Ende des Zuges.
Nachteil: +1 Rausch.
```

Rolle: einfacher Buff-Zauber.

### 3. Clubgaenger

```text
Kosten: 2
Typ: Person
Werte: 2/2
Effekt: Wenn dein Rausch 3 oder hoeher ist, hat diese Person +1 Angriff.
```

Rolle: solide Kurvenkarte, skaliert mit Risiko.

### 4. Druckwelle

```text
Kosten: 2
Typ: Aktion
Effekt: Eine gegnerische Person erhaelt -2 Angriff bis zu deinem naechsten Zug.
Nachteil: +1 Rausch.
```

Rolle: Tempo-Kontrolle ohne echten Removal.

### 5. Nachlegen

```text
Kosten: 3
Typ: Person
Werte: 3/2
Effekt: Kann sofort angreifen, wenn du 2 oder mehr Rausch hast.
Nachteil: Wenn diese Person angreift, +1 Rausch.
```

Rolle: aggressiver Angreifer.

### 6. Kieferkrampf

```text
Kosten: 3
Typ: Aktion
Effekt: Eine eigene Person erhaelt +1/+1. Ziehe 1 Karte.
Nachteil: +1 Rausch.
```

Rolle: Buff plus Nachschub.

### 7. Filmriss

```text
Kosten: 4
Typ: Person
Werte: 4/3
Effekt: Wenn dein Rausch steigt, erhaelt diese Person +1 Angriff bis zum Ende des Zuges.
Nachteil: Bei Rausch 5+ verliert sie am Ende deines Zuges 1 Gesundheit.
```

Rolle: gefaehrliche Snowball-Karte.

### 8. Kein Morgen

```text
Kosten: 5
Typ: Aktion
Effekt: Fuege dem Gegner 4 Schaden zu. Bei Rausch 5+ fuege stattdessen 6 Schaden zu.
Nachteil: Verliere 2 Stabilitaet.
```

Rolle: Finisher, aber nicht kostenlos.

### 9. Bassdruck

```text
Kosten: 2
Typ: Aktion
Effekt: Fuege einer gegnerischen Person 2 Schaden zu. Wenn du 3 oder mehr Rausch hast, fuege stattdessen 3 Schaden zu.
Nachteil: +1 Rausch.
```

Rolle: frueher Schadenszauber.

### 10. Durchballern

```text
Kosten: 4
Typ: Aktion
Effekt: Alle eigenen Personen erhalten +1 Angriff bis zum Ende des Zuges. Eine eigene Person kann in diesem Zug sofort angreifen.
Nachteil: +2 Rausch. Verliere 1 Stabilitaet.
```

Rolle: grosser Tempo-Zug, aber riskant.

### 11. Ueberdreht

```text
Kosten: 4
Typ: Person
Werte: 3/4
Effekt: Am Anfang deines Zuges erhaelt eine andere eigene Person +1 Angriff bis zum Ende des Zuges.
Nachteil: Wenn du 5 oder mehr Rausch hast, erhaeltst du stattdessen +1 Rausch.
```

Rolle: Midgame-Druck mit Kipppunkt.

### 12. Zusammenbruch

```text
Kosten: 6
Typ: Aktion
Effekt: Fuege allen gegnerischen Personen 1 Schaden zu. Setze deinen Rausch auf 0.
Nachteil: Verliere fuer bis zu 4 entfernte Rauschpunkte je 1 Stabilitaet.
```

Rolle: Notbremse und thematischer Rueckschlag.

## Awareness-Karten

### 1. Wasser

```text
Kosten: 1
Typ: Aktion
Effekt: Heile 2 Stabilitaet. Reduziere Rausch um 1.
```

Rolle: fruehe Stabilisierung.

### 2. Aufsicht

```text
Kosten: 1
Typ: Person
Werte: 1/3
Effekt: Am Ende deines Zuges heile 1 Stabilitaet, falls deine Stabilitaet 5 oder niedriger ist.
```

Rolle: frueher Blocker.

### 3. Substanztest

```text
Kosten: 2
Typ: Aktion
Effekt: Reduziere Rausch oder Abhaengigkeit um 2. Wenn du dadurch auf 0 reduzierst, ziehe 1 Karte.
```

Rolle: Risiko-Management.

### 4. Krisenhelferin

```text
Kosten: 2
Typ: Person
Werte: 1/4
Effekt: Wenn eine eigene Person Schaden erhaelt, heile 1 Stabilitaet. Maximal einmal pro Zug.
```

Rolle: defensive Synergie.

### 5. Schadensbegrenzung

```text
Kosten: 2
Typ: Aktion
Effekt: Eine gegnerische Person verliert alle Angriffsbuffs. Reduziere deine Fahndung um 1.
```

Rolle: Anti-Burst.

### 6. Streetworker

```text
Kosten: 3
Typ: Person
Werte: 2/4
Effekt: Am Ende deines Zuges reduziere deinen hoechsten Risikowert um 1: Rausch, Fahndung oder Abhaengigkeit.
```

Rolle: Klassenanker.

### 7. Deeskalation

```text
Kosten: 3
Typ: Aktion
Effekt: Eine gegnerische Person erhaelt -2 Angriff bis zu deinem naechsten Zug. Reduziere Fahndung beider Spieler um 1.
```

Rolle: Kontrolle mit thematischem Preis.

### 8. Therapieplatz

```text
Kosten: 4
Typ: Ort
Effekt: Am Anfang deines Zuges heile 2 Stabilitaet. Wenn deine Stabilitaet voll ist, reduziere stattdessen Abhaengigkeit um 1.
```

Rolle: langsamer Value.

### 9. Rueckzugsraum

```text
Kosten: 2
Typ: Ort
Effekt: Am Ende deines Zuges reduziere deinen Rausch um 1.
```

Rolle: Anti-Rausch-Setup.

### 10. Abschirmen

```text
Kosten: 3
Typ: Aktion
Effekt: Alle eigenen Personen erhalten +2 Gesundheit. Heile 2 Stabilitaet.
```

Rolle: Board schuetzen.

### 11. Intervention

```text
Kosten: 4
Typ: Aktion
Effekt: Eine gegnerische Person verliert alle Buffs und kann im naechsten Zug nicht angreifen. Wenn der Gegner 4 oder mehr Rausch hat, ziehe 1 Karte.
```

Rolle: starke Kontrollaktion gegen Eskalation.

### 12. Klarer Kopf

```text
Kosten: 6
Typ: Aktion
Effekt: Setze deinen Rausch auf 0. Reduziere Abhaengigkeit um 2. Heile 4 Stabilitaet.
```

Rolle: spaete Stabilisierung.

## Dealer-Karten

### 1. Laeufer

```text
Kosten: 1
Typ: Person
Werte: 1/2
Effekt: Beim Ausspielen erhaeltst du +1 Cash in diesem Zug.
Nachteil: Wenn diese Person stirbt, +1 Fahndung.
```

Rolle: fruehe Cash-Kurve.

### 2. Kleiner Lauf

```text
Kosten: 1
Typ: Aktion
Effekt: Erhalte +2 Cash in diesem Zug.
Nachteil: +1 Fahndung.
```

Rolle: Ramp-Zauber.

### 3. Stammkunde

```text
Kosten: 2
Typ: Person
Werte: 2/3
Effekt: Wenn du in diesem Zug zusaetzliches Cash erhalten hast, erhaelt diese Person +1 Angriff bis zum Ende des Zuges.
```

Rolle: stabile Tempo-Person.

### 4. Schnelles Geld

```text
Kosten: 2
Typ: Aktion
Effekt: Ziehe 1 Karte. Erhalte +1 Cash in diesem Zug.
Nachteil: +1 Fahndung.
```

Rolle: Nachschub plus Tempo.

### 5. Bunkern

```text
Kosten: 2
Typ: Aktion
Effekt: Reduziere deine Fahndung um 1. Die naechste Karte, die du in diesem Zug spielst, kostet 1 weniger.
```

Rolle: Risiko glätten, Combo vorbereiten.

### 6. Druckmittel

```text
Kosten: 3
Typ: Aktion
Effekt: Fuege einer gegnerischen Person 3 Schaden zu. Wenn du in diesem Zug zusaetzliches Cash erhalten hast, fuege 5 Schaden zu.
Nachteil: +1 Fahndung.
```

Rolle: Klassen-Removal.

### 7. Mittelsmann

```text
Kosten: 3
Typ: Person
Werte: 3/3
Effekt: Am Anfang deines Zuges erhaeltst du +1 Cash in diesem Zug.
Nachteil: Wenn du dieses Cash nutzt, +1 Fahndung am Ende des Zuges.
```

Rolle: wiederkehrender Cash-Vorteil.

### 8. Abziehen

```text
Kosten: 5
Typ: Aktion
Effekt: Gib dein aktuelles Cash aus. Fuege dem Gegner Schaden in Hoehe des ausgegebenen Cash zu, maximal 6.
Nachteil: +2 Fahndung. Bei Fahndung 6+ verlierst du 2 Stabilitaet.
```

Rolle: riskanter Finisher.

### 9. Schuldenbuch

```text
Kosten: 2
Typ: Ort
Effekt: Immer wenn du durch eine Karte zusaetzliches Cash erhaeltst, fuege dem Gegner 1 Schaden zu.
Nachteil: Bei Fahndung 5+ verlierst du am Ende deines Zuges 1 Gesundheit.
```

Rolle: Combo-Motor.

### 10. Falscher Freund

```text
Kosten: 3
Typ: Person
Werte: 2/5
Effekt: Wenn der Gegner eine Person ausspielt, erhaeltst du +1 Cash in deinem naechsten Zug.
Nachteil: Bei Fahndung 6+ verliert diese Person am Ende deines Zuges 2 Gesundheit.
```

Rolle: gierige Value-Person mit Risiko.

### 11. Grosse Lieferung

```text
Kosten: 4
Typ: Aktion
Effekt: Erhalte +4 Cash in diesem Zug. Ziehe 1 Karte.
Nachteil: +3 Fahndung.
```

Rolle: explosiver Power-Zug.

### 12. Netzwerk

```text
Kosten: 6
Typ: Ort
Effekt: Am Anfang deines Zuges erhaeltst du +2 Cash in diesem Zug. Deine Dealer-Personen erhalten +1 Angriff.
Nachteil: Am Ende deines Zuges +1 Fahndung. Bei Fahndung 7+ zerstoere Netzwerk.
```

Rolle: spaeter Engine-Ort.

## Neutrale Karten

### 1. Verpeilter Gast

```text
Kosten: 1
Typ: Person
Werte: 1/2
Effekt: Wenn diese Person stirbt, verliert ihr Besitzer 1 Stabilitaet.
```

Rolle: neutraler 1-Drop mit Risiko.

### 2. Wasserflasche

```text
Kosten: 1
Typ: Aktion
Effekt: Heile 1 Stabilitaet. Reduziere Rausch um 1.
```

Rolle: kleine Stabilisierung.

### 3. Kontaktperson

```text
Kosten: 2
Typ: Person
Werte: 2/2
Effekt: Wenn du keine andere Person kontrollierst, ziehe 1 Karte.
```

Rolle: Comeback-Kurve.

### 4. Schlechter Einfluss

```text
Kosten: 2
Typ: Person
Werte: 2/2
Effekt: Eine andere eigene Person erhaelt +1 Angriff bis zum Ende des Zuges.
Nachteil: +1 Rausch.
```

Rolle: neutraler Buff-Koerper.

### 5. Erste Hilfe

```text
Kosten: 2
Typ: Aktion
Effekt: Heile 4 Gesundheit.
```

Rolle: einfache Defensive.

### 6. Panikmoment

```text
Kosten: 2
Typ: Aktion
Effekt: Fuege einer zufaelligen Person 2 Schaden zu. Beide Spieler verlieren 1 Stabilitaet.
```

Rolle: chaotisches, aber riskantes Board-Tool.

### 7. Taxi nach Hause

```text
Kosten: 2
Typ: Aktion
Effekt: Entferne eine eigene Person vom Board. Heile 3 Stabilitaet. Reduziere Rausch um 1.
```

Rolle: Notausgang.

### 8. Gruppendruck

```text
Kosten: 3
Typ: Aktion
Effekt: Alle Personen erhalten +1 Angriff bis zum Ende des Zuges.
Nachteil: Beide Spieler erhalten +1 Rausch.
```

Rolle: symmetrischer Angriffspush.

### 9. Razzia-Geruecht

```text
Kosten: 3
Typ: Aktion
Effekt: Beide Spieler erhalten +1 Fahndung. Ziehe 1 Karte.
```

Rolle: Druckmittel gegen gierige Decks.

### 10. Ruhiger Rueckzugsort

```text
Kosten: 3
Typ: Ort
Effekt: Am Ende deines Zuges heile 1 Stabilitaet.
```

Rolle: langsame Stabilisierung fuer alle.

### 11. Ueberforderung

```text
Kosten: 3
Typ: Aktion
Effekt: Eine Person erhaelt -2 Angriff bis zu deinem naechsten Zug. Ihr Besitzer verliert 1 Stabilitaet.
```

Rolle: neutrales Tempo-Tool.

### 12. Razzia

```text
Kosten: 5
Typ: Aktion
Effekt: Fuege allen Personen mit Fahndungs- oder Deal-Tag 3 Schaden zu. Setze die Fahndung beider Spieler auf mindestens 4.
```

Rolle: Anti-Dealer und Anti-Risiko-Swing, aber nicht kompletter Board-Clear.

### 13. Frische Luft

```text
Kosten: 1
Typ: Aktion
Effekt: Reduziere Rausch um 1. Wenn du vorher 3 oder mehr Rausch hattest, heile 1 Stabilitaet.
```

Rolle: guenstiges Anti-Rausch-Tool.

### 14. Leerer Akku

```text
Kosten: 2
Typ: Aktion
Effekt: Der Gegner kann seinen Heldenskill im naechsten Zug nicht benutzen. Ziehe 1 Karte.
```

Rolle: universelles Tempo gegen Klassenplaene.

### 15. Kaputter Schlaf

```text
Kosten: 4
Typ: Aktion
Effekt: Heile 4 Gesundheit.
Nachteil: Verliere 2 Stabilitaet.
```

Rolle: Health-Rettung mit mentalem Preis.

### 16. Offene Rechnung

```text
Kosten: 4
Typ: Ort
Effekt: Beim Ausspielen fuege dem Gegner 2 Schaden zu. Am Anfang deines Zuges verlierst du 1 Cash fuer diesen Zug.
Nachteil: Wenn du kein Cash verlieren kannst, verliere 2 Stabilitaet.
```

Rolle: langsamer Druck mit Schulden-Nachteil.

### 17. Morgen Danach

```text
Kosten: 5
Typ: Aktion
Effekt: Entferne alle Angriffsbuffs von allen Personen. Setze den Rausch beider Spieler auf 0.
Nachteil: Beide Spieler verlieren 2 Stabilitaet.
```

Rolle: neutraler Reset gegen Rausch-Burst.

### 18. Szenekenner

```text
Kosten: 3
Typ: Person
Werte: 2/4
Effekt: Wenn du eine neutrale Aktion spielst, erhaelt diese Person +1 Angriff bis zum Ende des Zuges.
```

Rolle: neutrale Midgame-Person fuer gemischte Decks.

## Starterdecks und Deckbuilder

Die folgenden Starterdecks sind nur Vorschlaege fuer schnelle Tests. Der Deckbuilder soll trotzdem alle 12 Klassenkarten der gewaehlten Klasse plus alle 18 neutralen Karten anzeigen.

### Raver Starterdeck: Druck von Anfang an

Klassenkarten:

```text
2x Auf Anschlag
2x Anreissen
2x Clubgaenger
2x Druckwelle
2x Nachlegen
2x Kieferkrampf
2x Filmriss
2x Kein Morgen
```

Neutrale Karten:

```text
2x Verpeilter Gast
2x Schlechter Einfluss
```

Spielplan: Frueh angreifen, Rausch fuer Tempo nutzen, mit Kein Morgen beenden.

Alternative Raver-Karten fuer den Deckbuilder:

```text
Bassdruck
Durchballern
Ueberdreht
Zusammenbruch
```

### Awareness Starterdeck: Bleib stabil

Klassenkarten:

```text
2x Wasser
2x Aufsicht
2x Substanztest
2x Krisenhelferin
2x Schadensbegrenzung
2x Streetworker
2x Deeskalation
2x Therapieplatz
```

Neutrale Karten:

```text
2x Kontaktperson
2x Erste Hilfe
```

Spielplan: Ueberleben, Risiken reduzieren, Board langsam stabilisieren.

Alternative Awareness-Karten fuer den Deckbuilder:

```text
Rueckzugsraum
Abschirmen
Intervention
Klarer Kopf
```

### Dealer Starterdeck: Schnelles Geld, schneller Druck

Klassenkarten:

```text
2x Laeufer
2x Kleiner Lauf
2x Stammkunde
2x Schnelles Geld
2x Bunkern
2x Druckmittel
2x Mittelsmann
2x Abziehen
```

Neutrale Karten:

```text
2x Kontaktperson
2x Razzia-Geruecht
```

Spielplan: Cash-Vorteil erzeugen, frueh Tempo machen, mit Abziehen finishen.

Alternative Dealer-Karten fuer den Deckbuilder:

```text
Schuldenbuch
Falscher Freund
Grosse Lieferung
Netzwerk
```

## Deckbuilder-Auswahl

Beim Bauen eines Decks soll der Spieler sehen:

```text
Alle Klassenkarten der gewaehlten Klasse: 12
Alle neutralen Karten: 18
Gesamt waehlbar: 30
Deckziel: 20 Karten
```

Validierung:

```text
20 Karten exakt
maximal 2 Kopien pro Karte
mindestens 8 Klassenkarten
mindestens 8 Personen
mindestens 6 Karten mit Kosten 1 bis 3
```

Wenn eine Regel nicht erfuellt ist, soll der Startbutton erklaeren, was fehlt.

## Umsetzungsschritte

1. Kartendatenmodell pruefen: faction, kind, cost, attack, health, effect, drawback, tags.
2. Kartenpool in `src/game/cards.ts` auf 54 Karten erweitern.
3. Starterdecks in `src/game/state.ts` als 20-Karten-Vorschlaege umstellen.
4. Deckbuilder filtern: gewaehlte Klasse plus neutral.
5. Deckbuilder-Validierung einbauen: 20 Karten, Kopienlimit, Klassenkarten, Personen, Kostenkurve.
6. Grundeffekte implementieren, aber Sonderfaelle markieren, wenn sie zu komplex fuer V0.1 sind.
7. Logiktests fuer jede Klasse und Deckbau-Regeln ergaenzen.
8. Erst danach Kartenassets planen.

## Bewusst spaeter

- 30-Karten-Decks
- freie Decks mit vollem Kartenpool
- Psychonauten, Junkies, Bullen, Aerzte
- komplexe Zustandsketten
- mehrere Orte gleichzeitig
- echte Online-Matches
- finale Kartenillustrationen
