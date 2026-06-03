$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cloudflared = Join-Path $root ".tools\cloudflared.exe"

if (!(Test-Path $cloudflared)) {
  throw "cloudflared.exe fehlt. Lade es zuerst nach .tools\cloudflared.exe."
}

& $cloudflared tunnel --url http://127.0.0.1:3001
