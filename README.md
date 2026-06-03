# Nebenwirkungen

Ein satirisch-ernstes Online-Multiplayer-Kartenspiel mit echten Substanznamen, cartoonhafter Darstellung und klaren Konsequenzmechaniken.

## Tech-Stack

- React + TypeScript für App, Menüs, Karten, Statuspanels und Deckbuilder
- PixiJS für das animierte Spielbrett und Kartenbewegungen
- Node.js + Socket.IO für späteren Multiplayer
- Gemeinsame TypeScript-Modelle für Karten, Statuswerte und Spielzustand

## Start

```bash
npm install
npm run dev
```

Da dieses Projekt eine lokale portable Node/npm-Version unter `.vendor/` verwenden kann, geht auf Windows auch:

```powershell
.\start-dev.ps1
```

Optionaler Multiplayer-Server:

```bash
npm run server
```

Oder mit lokaler Node-Version:

```powershell
.\start-server.ps1
```

Die App läuft danach standardmäßig unter:

```text
http://127.0.0.1:5173
```

## Sofort-Preview ohne npm

Falls auf dem System noch kein `npm` verfügbar ist, kann die statische Vorschau mit einem vorhandenen Node.js gestartet werden:

```bash
node tools/static-server.mjs
```

Dann öffnen:

```text
http://127.0.0.1:5173
```

## Aktueller Prototyp

- Deutsches UI mit `Gesundheit`, `Stabilität`, `Fahndungsdruck`, `Rausch`, `Cash`, `Kontrolle` und `Abhängigkeit`
- Erste Kartendaten für `Heroin`, `Kokain`, `MDMA`, `Cannabis`, `Benzodiazepine`, `Substanztest`, `Streetworker`, `Therapieplatz`, `Razzia`, `Craving` und `Entzug`
- PixiJS-Spielbrett mit animierter Kartenablage beim Klick auf eine Handkarte
- Socket.IO-Server als schlanker Startpunkt für Räume und Echtzeit-Events

## Design-Regel

Echte Substanznamen sind erlaubt, aber Effekte und Illustrationen sollen Risiken, Folgekosten und Gegenmaßnahmen zeigen. Keine detaillierten Konsum-Anleitungen, keine Dosierungen, keine Beschaffung, keine verherrlichende Darstellung.
