$ErrorActionPreference = 'Stop'
$env:PATH = (Join-Path $env:USERPROFILE '.cargo\bin') + ';' + $env:PATH
Set-Location -LiteralPath $PSScriptRoot
& node.exe scripts/make-test-save.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& cargo.exe test --manifest-path src-tauri/Cargo.toml --release jj_local_file_tests -- --test-threads=1
exit $LASTEXITCODE
