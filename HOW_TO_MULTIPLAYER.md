# How To: Multiplayer starten

Diese Anleitung ist fuer den Online-Test mit einem Freund ueber Cloudflare Tunnel.

Wichtig: Du und dein Freund muessen beide denselben `trycloudflare.com` Link benutzen. Nicht lokal `127.0.0.1` mischen.

## 1. Alte Fenster stoppen

Falls noch Server, Dev-App oder Tunnel laufen:

```powershell
Strg + C
```

Wenn du unsicher bist: alte PowerShell-Fenster einfach schliessen.

## 2. Fenster 1: Online-Server starten

Neues PowerShell-Fenster oeffnen und genau das eingeben:

```powershell
cd "D:\CODEX_\online mp drug cardgame"
.\start-online-local.ps1
```

Dieses Fenster offen lassen.

## 3. Fenster 2: Tunnel starten

Zweites PowerShell-Fenster oeffnen und genau das eingeben:

```powershell
cd "D:\CODEX_\online mp drug cardgame"
.\start-tunnel.ps1
```

Dieses Fenster offen lassen.

Im Tunnel-Fenster erscheint ein Link wie:

```text
https://irgendwas.trycloudflare.com
```

Diesen Link kopieren.

## 4. Spiel oeffnen

Du oeffnest den Cloudflare-Link im Browser.

Dein Freund oeffnet denselben Cloudflare-Link im Browser.

Beide muessen wirklich denselben Link nutzen:

```text
https://irgendwas.trycloudflare.com
```

Nicht diesen Link verwenden:

```text
http://127.0.0.1:5173
```

Nicht diesen Link verwenden:

```text
http://127.0.0.1:3001
```

## 5. Raum erstellen

Spieler 1:

1. Klasse/Deck waehlen.
2. Raum erstellen.
3. Raumcode merken oder Link teilen.

Spieler 2:

1. Denselben Cloudflare-Link oeffnen.
2. Raumcode eingeben.
3. Raum beitreten.

## Wenn "Raum nicht gefunden" kommt

Fast immer bedeutet das:

- einer nutzt `127.0.0.1`
- einer nutzt einen alten Cloudflare-Link
- Server/Tunnel wurden mehrfach gestartet
- ein altes Fenster laeuft noch

Loesung:

1. Alle Server-/Tunnel-Fenster mit `Strg + C` stoppen.
2. Fenster schliessen.
3. Wieder bei Schritt 2 anfangen.
4. Neuen Cloudflare-Link an beide Spieler schicken.

## Wenn "Raum bereits voll" kommt

Dann haengt wahrscheinlich noch ein alter Spieler im Raum.

Loesung:

1. Beide Browser-Tabs schliessen.
2. Server und Tunnel stoppen.
3. Neu starten.
4. Neuen Raum erstellen.

## Kurzversion

Fenster 1:

```powershell
cd "D:\CODEX_\online mp drug cardgame"
.\start-online-local.ps1
```

Fenster 2:

```powershell
cd "D:\CODEX_\online mp drug cardgame"
.\start-tunnel.ps1
```

Dann beide Spieler:

```text
https://xxxxx.trycloudflare.com
```

oeffnen.
