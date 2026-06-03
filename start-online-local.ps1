$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = Join-Path $root ".vendor\node-v24.16.0-win-x64"
$env:PATH = "$nodeDir;$env:PATH"
Set-Location $root

& (Join-Path $nodeDir "npm.cmd") run build
& (Join-Path $nodeDir "npm.cmd") run server
