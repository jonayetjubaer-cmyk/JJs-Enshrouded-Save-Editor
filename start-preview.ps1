$ErrorActionPreference = 'Stop'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$vite = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
$taskLogDir = Join-Path $PSScriptRoot '.local'
New-Item -ItemType Directory -Path $taskLogDir -Force | Out-Null
$taskProcess = Start-Process -FilePath $node -ArgumentList @(('"' + $vite + '"'), '--host', '127.0.0.1', '--port', '5173') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogDir 'preview.log') -RedirectStandardError (Join-Path $taskLogDir 'preview-error.log') -PassThru
$taskProcess.Id | Set-Content -LiteralPath (Join-Path $taskLogDir 'preview.pid')
Write-Output 'Preview: http://127.0.0.1:5173/?preview=1'
Write-Output ('Process ID: ' + $taskProcess.Id)
