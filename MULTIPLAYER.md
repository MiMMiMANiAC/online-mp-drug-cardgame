# Multiplayer

## Lokal testen

Fuer den lokalen Online-1v1-Test muessen zwei Fenster laufen:

```powershell
.\start-server.ps1
.\start-dev.ps1
```

Dann in der App ein Deck bauen, `Raum erstellen` klicken und den angezeigten Link oder Code an den zweiten Spieler geben.

Lokal funktioniert dieser Link nur auf demselben Rechner oder im selben Netzwerk mit passender Host-Adresse. Fuer echtes Spielen mit einem Freund ueber das Internet muss der Socket.IO-Server spaeter z. B. kostenlos auf Render, Fly.io, Railway-Free-Tier oder ueber einen Tunnel bereitgestellt werden.

## Mit Cloudflare Tunnel testen

Wenn `cloudflared.exe` in `.tools` vorhanden ist, laufen drei Schritte:

```powershell
.\start-online-local.ps1
.\start-tunnel.ps1
```

`start-online-local.ps1` baut die App und startet den kombinierten Websocket/Webserver auf `http://127.0.0.1:3001`.

`start-tunnel.ps1` erzeugt einen oeffentlichen `https://...trycloudflare.com` Link. Fuer einen echten Freund-Test sollten beide Spieler diesen Cloudflare-Link oeffnen. Danach erstellt einer im Spiel einen Raum und teilt den Raumcode oder den Raumlink.

## Aktueller Stand

- Socket.IO-Server verwaltet Raeume mit zwei Spielern.
- Der Server haelt den Spielzustand und fuehrt Aktionen aus.
- Beide Clients bekommen denselben Zustand aus ihrer eigenen Perspektive.
- Online-Zuege wechseln zwischen Spieler 1 und Spieler 2, ohne Bot-Automatik.
- Der Online-Prototyp startet aktuell direkt ins Spiel; Online-Mulligan und Online-Deck-Sync sind die naechsten Ausbaustufen.
