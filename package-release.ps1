$ErrorActionPreference = 'Stop'
$taskRelease = Join-Path $PSScriptRoot 'release'
$taskVersion = (Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'package.json') | ConvertFrom-Json).version
$taskExe = Join-Path $taskRelease 'JJs-Enshrouded-Save-Editor.exe'
if (-not (Test-Path -LiteralPath $taskExe)) { throw 'Run build-windows.ps1 first.' }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'RELEASE-README.txt') -Destination (Join-Path $taskRelease 'README.txt') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'CREDITS.md') -Destination $taskRelease -Force
$taskHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $taskExe).Hash.ToLowerInvariant()
($taskHash + '  JJs-Enshrouded-Save-Editor.exe') | Set-Content -Encoding ascii -LiteralPath (Join-Path $taskRelease 'SHA256SUMS.txt')
$taskZipPath = Join-Path $taskRelease ('JJs-Enshrouded-Save-Editor-' + $taskVersion + '.zip')
$taskZipStream = [IO.File]::Open($taskZipPath, [IO.FileMode]::Create)
$taskZip = [IO.Compression.ZipArchive]::new($taskZipStream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($taskName in @('JJs-Enshrouded-Save-Editor.exe', 'LICENSE', 'CREDITS.md', 'SHA256SUMS.txt', 'README.txt')) {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip, (Join-Path $taskRelease $taskName), $taskName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $taskZip.Dispose(); $taskZipStream.Dispose() }
Write-Output ('Package: ' + $taskZipPath)
Write-Output ('Executable SHA-256: ' + $taskHash)
