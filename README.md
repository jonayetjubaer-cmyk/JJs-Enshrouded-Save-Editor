# JJ's Enshrouded Save editor

Windows save editor by **Jonaex LTD**. Version **0.2.0**.

[Download on Nexus Mods](https://www.nexusmods.com/enshrouded/mods/249?tab=files) | [Report a bug](https://github.com/jonayetjubaer-cmyk/JJs-Enshrouded-Save-Editor/issues/new?template=bug_report.yml) | [Upload a save for support](SUPPORT.md)

## Features

- Compact desktop interface with a character sidebar and searchable, sortable tables.
- Character, Inventory, Equipment, Skills, Knowledge and Server tabs.
- Edit character level and experience, item quantities and levels, upgrades, gem sockets and learned skills.
- Undo, discard changes, automatic backups and backup restoration.
- Full Italian, French and German interface translations, including official item, skill and stat text. English and the original Portuguese option are also available.
- Choose a language before opening a save. The choice applies immediately and is remembered between launches.
- System, light and dark themes.
- Optional dedicated-server integration through Enshrouded Server Guardian.

## Download and use

1. Download the Windows x64 ZIP from [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/249?tab=files).
2. Extract the ZIP and keep the executable, licence, credits, checksum and README together.
3. Start JJ's Enshrouded Save editor and choose your language.
4. Close Enshrouded before saving an edit. Keep an independent backup and test changes on a copy.

This is a preview release. See [TESTING.md](TESTING.md) for verification results and limitations. The current download remains on Nexus; imported upstream Git tags are historical and are not JJ edition releases.

## Bug reports and save uploads

[Open a bug report](https://github.com/jonayetjubaer-cmyk/JJs-Enshrouded-Save-Editor/issues/new?template=bug_report.yml) and include your editor/game versions, play mode and steps to reproduce.

For save-related problems, ZIP the affected character's .ksd and its backup from before editing in separate folders named affected/ and before-edit/. Attach the ZIP to the issue. GitHub ZIP attachments support up to 25 MB.

Public issues and attachments are visible to everyone. To request private sharing, contact **RurushEdward on Nexus Mods** before sending files. Read [SUPPORT.md](SUPPORT.md) for instructions and backup locations.

## Build from source

Requirements: Windows, Node.js 24, Rust stable MSVC and Microsoft C++ Build Tools.

```powershell
npm ci --ignore-scripts
npm test
pwsh -File build-windows.ps1
pwsh -File test-native.ps1
pwsh -File package-release.ps1
```

The executable is written to release/JJs-Enshrouded-Save-Editor.exe. The build includes the interface, game data and prepared assets. To run the browser preview, use npm run preview:jj and open http://127.0.0.1:5173/?preview=1. Preview edits use synthetic data in memory and do not change game files.

## Files and server settings

- Editor backups: Documents/Enshrouded-Backups/jj-editor/.
- Optional server settings: %APPDATA%/jjs-enshrouded-save-editor/servidor.json.
- The existing SFTP integration stores its configured password in plain text. Use a server-specific account with restricted access and verify the SSH fingerprint.
- Active interface: src/JJApp.jsx. The original interface files remain as development references.

## Licence and credits

JJ edition interface, branding and modifications: **Jonaex LTD**.

Based on Nicolas Ferreira's MIT-licensed Enshrouded Save Editor v1.0.2. The original copyright and permission notice are preserved in [LICENSE](LICENSE); detailed attribution is in [CREDITS.md](CREDITS.md). Game artwork, fonts and game data remain the property of Keen Games and their respective owners. The code licence does not relicense those assets.

This is an unofficial fan project, unaffiliated with Keen Games.
