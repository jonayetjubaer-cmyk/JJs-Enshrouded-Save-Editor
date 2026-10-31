$ErrorActionPreference = 'Stop'
$taskCargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path -LiteralPath $taskCargoBin) { $env:PATH = $taskCargoBin + ';' + $env:PATH }
Set-Location -LiteralPath $PSScriptRoot
& npm.cmd run dist
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$taskOutput = Join-Path $PSScriptRoot 'release'
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'src-tauri\target\release\jjs-enshrouded-save-editor.exe') -Destination (Join-Path $taskOutput 'JJs-Enshrouded-Save-Editor.exe') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'LICENSE') -Destination $taskOutput -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'CREDITS.md') -Destination $taskOutput -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'RELEASE-README.txt') -Destination (Join-Path $taskOutput 'README.txt') -Force
Write-Output ('Built: ' + (Join-Path $taskOutput 'JJs-Enshrouded-Save-Editor.exe'))
