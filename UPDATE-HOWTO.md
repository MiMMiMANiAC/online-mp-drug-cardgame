# Nebenwirkungen Update-System

## Was jetzt eingebaut ist

Die installierte Windows-App prueft beim Start automatisch auf Updates ueber GitHub Releases.

Wenn ein Update gefunden wird:

1. Die App laedt es im Hintergrund.
2. In der App erscheint eine Update-Meldung.
3. Im ESC-Menue unter `Optionen` kannst du ebenfalls nach Updates suchen.
4. Sobald das Update bereit ist, installiert `Update installieren` das Update per Neustart.

## Wichtig

Updates funktionieren nur in der installierten App, nicht im Browser und nicht im lokalen Dev-Modus.

## Neuen Installer bauen

In PowerShell im Projektordner:

```powershell
cd "D:\CODEX_\online mp drug cardgame"
$env:PATH="D:\CODEX_\online mp drug cardgame\.vendor\node-v24.16.0-win-x64;" + $env:PATH
& "D:\CODEX_\online mp drug cardgame\.vendor\node-v24.16.0-win-x64\npm.cmd" run desktop:installer
```

## Diese Dateien auf GitHub Releases hochladen

Aus diesem Ordner:

```text
D:\CODEX_\online mp drug cardgame\desktop\release
```

Immer diese drei Dateien hochladen:

```text
Nebenwirkungen-Setup-0.1.0.exe
Nebenwirkungen-Setup-0.1.0.exe.blockmap
latest.yml
```

## Ganz wichtig fuer echte Updates

Vor dem naechsten Update muss die Version in `package.json` hoeher sein.

Beispiel:

```json
"version": "0.1.1"
```

Danach wieder den Installer bauen und die neuen drei Dateien als GitHub Release hochladen.

Die installierte App erkennt nur Updates, wenn die Release-Version hoeher ist als die installierte Version.
