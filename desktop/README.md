# Desktop / EXE Build

Dieser Ordner ist absichtlich vom laufenden Web-Spiel getrennt.

Hier sollen spaeter alle Dateien fuer die installierbare Windows-App liegen:

- Electron-Startdateien
- Build-Konfiguration fuer die `.exe`
- Desktop-spezifische Icons und Metadaten
- spaetere Installer-Ausgaben

Wichtig:

- Das aktuelle Spiel bleibt in `src`.
- Der Multiplayer-Server bleibt in `server`.
- Die Karten- und Board-Assets bleiben in `public/assets`.
- Bestehende Dateien werden fuer den Desktop-Build nicht verschoben oder geloescht.

Ziel:

Die Windows-App soll das Solo-Spiel offline starten koennen und sich fuer Online-1v1
mit einem extern gehosteten Socket.IO-Server verbinden.

## Befehle

Im Projektordner ausfuehren:

```powershell
cd "D:\CODEX_\online mp drug cardgame"
$env:PATH='D:\CODEX_\online mp drug cardgame\.vendor\node-v24.16.0-win-x64;' + $env:PATH
```

Desktop-App lokal testen:

```powershell
npm run desktop
```

Portable Windows-EXE bauen:

```powershell
npm run desktop:pack
```

Windows-Installer bauen:

```powershell
npm run desktop:installer
```

Die fertigen Dateien landen spaeter in:

```text
desktop/release
```

## Multiplayer-URL

Solo funktioniert offline direkt in der App.

Online-1v1 braucht spaeter einen gehosteten Socket.IO-Server. Dafuer kann beim Build
eine Vite-Variable gesetzt werden:

```powershell
$env:VITE_MULTIPLAYER_URL='https://dein-server.onrender.com'
npm run desktop:pack
```

Solange diese URL nicht gesetzt ist, nutzt die Desktop-App fuer Online-Tests lokal:

```text
http://127.0.0.1:3001
```
