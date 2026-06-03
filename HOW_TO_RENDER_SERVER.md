# How To: Kostenlosen Online-Server starten

Diese Anleitung ist fuer Render Free.

Ziel:

- Der Multiplayer-Server laeuft online.
- Die EXE verbindet sich mit dieser URL.
- Solo bleibt offline spielbar.

## 1. Projekt zu GitHub hochladen

Render braucht Zugriff auf dein Projekt.

Wenn du ein GitHub-Repository hast, lade diesen Projektordner dort hoch.

## 2. Render oeffnen

Im Browser oeffnen:

```text
https://render.com
```

Dann anmelden.

## 3. Blueprint erstellen

In Render:

```text
New -> Blueprint
```

Dann dein GitHub-Repository auswaehlen.

Render findet die Datei:

```text
render.yaml
```

Danach erstellen.

## 4. URL kopieren

Nach dem Deployment bekommst du eine URL wie:

```text
https://nebenwirkungen-server.onrender.com
```

Diese URL kopieren.

## 5. In der EXE eintragen

Spiel starten.

In der Lobby bei `Online 1v1` in das Feld `Server URL` eintragen:

```text
https://nebenwirkungen-server.onrender.com
```

Danach:

1. Spieler 1 klickt `Raum erstellen`.
2. Spieler 1 gibt den Raumcode weiter.
3. Spieler 2 traegt dieselbe Server URL ein.
4. Spieler 2 gibt den Raumcode ein.
5. Spieler 2 klickt `Beitreten`.

## Wichtig

Render Free kann schlafen gehen. Der erste Verbindungsversuch kann deshalb langsam sein.

Wenn es nicht sofort klappt:

1. 30 Sekunden warten.
2. Nochmal `Raum erstellen` klicken.
3. Pruefen, ob beide exakt dieselbe Server URL nutzen.
