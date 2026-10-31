# JJ edition validation

Tested on Windows on 27 October 2026.

## Nexus issue 1162552: Healing and Mana — 31 October 2026

- Report: <https://www.nexusmods.com/enshrouded/mods/249?tab=bugs>. The reporter changed a new character to level 5 and then observed health/mana on hit even with equipment and learned skills removed; another character also appeared affected.
- Reviewed the active Tauri save path. Character sessions are keyed by save path, and a level edit changes the model's level field. The save writer preserves the selected character's opaque state and reuses untouched container blocks. No cause for cross-character bonuses was identified in this review.
- Added a regression test using two characters with distinct opaque state. Setting either to level 5 produces exactly the independently patched four-byte level field; all other character bytes and the original inputs remain unchanged.
- Extended the read-only round-trip diagnostic with `--level=5`. It assembles the edited save in memory, checks the character payload against an independent byte patch, validates the rebuilt container, and requires every other block to retain its original raw bytes. It never writes the supplied save.
- The diagnostic passed against the existing local level-50 character: only byte `0x3a` changed for the in-memory level-5 edit. Every other character byte and every other raw container block remained identical. The input file remained unchanged. This is not the reporter's save and is not an in-game reproduction.
- Full `npm test` passes: 21 JJ regression tests plus all upstream checks. `git diff --check` passes. Production app code/version and the published package were not changed for this investigation.
- Independent first-hand player reports describe closely matching effects without equipment/skills and say restarting the host/server clears them: [health and mana on hit](https://www.reddit.com/r/Enshrouded/comments/1xeyazl/help_please_where_does_this_healing_and_mana/) and [unexpected co-op lifesteal](https://www.reddit.com/r/Enshrouded/comments/1x9em2v/possible_bug_or_am_i_blind/). These are community reports, not developer confirmation of the cause in this case.
- Working hypothesis: a game-session perk/state issue. First troubleshooting step is a normal host/server restart and full restart of both clients, then retest before further edits. If it persists, compare the affected `.ksd` with its editor backup from before the level edit. No reporter saves or restart results are available yet, so the issue remains unconfirmed; it was not closed or publicly replied to.

## Version 0.2.0 localization checks — 29 October 2026

- Italian, French and German dictionaries cover 404 editor messages, including menus, tabs, placeholders, dialogs, validation and application errors. Placeholder parity is checked automatically.
- Official game localization covers all 4,018 named catalog items, all 243 skill names/descriptions and all 306 stat labels in each new language. Technical game identifiers, player names, paths and the authoritative MIT text remain unchanged.
- Eight localization regression tests pass, together with the existing editing, close-handler, format and game-data tests (20 JJ tests plus the upstream checks).
- Startup locale detection handles regional variants, remembers the user's choice, and selects English for unsupported system languages. The selector is available with no save open.
- Browser checks: all three opening screens change immediately and survive reload; all six tabs render in each language with no untranslated known editor strings or unresolved placeholders; German-to-French switching preserves an in-memory edit and Undo restores it; the French removal confirmation can be canceled; Italian catalog search and category filtering work with localized names; official Italian skill descriptions render correctly.
- Localization changes do not alter item IDs, parser/serializer logic or saved item fields. All game save checks use synthetic or read-only inputs.
- Native 0.2.0 build launched with no save open. The language menu exposes English, Português, Italiano, Français and Deutsch; the German opening screen was observed in the Windows executable before opening a character.
- Windows product metadata confirms version 0.2.0 and company Jonaex LTD. Microsoft Defender custom scan of the compiled executable found no threats.
- Executable SHA-256: `58cc6d34ac3f06668d956900c01ce65777e9531209dfd5d0521816c80b731b94`.
- `release/JJs-Enshrouded-Save-Editor-0.2.0.zip` includes the executable, LICENSE, CREDITS.md, SHA256SUMS.txt and README.txt. The original legal MIT text is retained verbatim.

## Version 0.1.1 close and branding fix

- Fixed missing `core:window:allow-destroy`, required by the installed Tauri `onCloseRequested` wrapper to finish closing the window.
- Removed the recursive close request after confirming discard; Tauri now completes the original close request. Cancel keeps edits open. The browser unload guard runs only in the browser.
- Five regression tests exercise the real Tauri JavaScript wrapper with mocked IPC and check the shipped capability: clean close, cancel/confirm discard, repeated requests during confirmation, active-operation protection, and confirmation errors.
- Full JavaScript test suite passes.
- Native Windows X button was clicked on the rebuilt app; the editor window disappeared normally.
- Updated display name to JJ’s Enshrouded Save editor. Jonaex LTD is the JJ edition author/publisher in About, package metadata, Windows company metadata, LICENSE, and CREDITS.md. Original Nicolas Ferreira attribution remains.

## Automated checks

- `npm test`: all upstream game-data, gem, item-extra-field, item-statistics, translation, and synthetic character-format checks pass, together with seven JJ edition regression tests.
- JJ regression coverage: duplication without losing item fields; swapping occupied slots across containers; preventing removal of a populated equipped backpack; preserving dense equipment indices for serialization; upgrade/rarity effective-level semantics; gem byte layout; numeric/natural sorting.
- `npm audit`: zero known vulnerabilities in the installed JavaScript dependencies after updating Vite and pruning stale legacy build dependencies from the lockfile.
- Production frontend build succeeds. The production bundle includes the full MIT notice and excludes the sample fixture.
- Native release build succeeds using Rust stable MSVC and Microsoft C++ Build Tools.

## Browser workflow checks

Sample preview only; no game files were accessed:

- Selecting inventory rows shows the correct item inspector.
- Editing an item enables Save and Undo; Undo restores the prior value and clears pending changes when appropriate.
- Changing upgrades adjusts effective item level.
- Saving the sample creates an in-memory backup; canceling restore keeps the backup dialog open; confirming restores the prior item values.
- Catalog search finds Gem of Burning; adding it creates an inventory entry; Undo removes that addition.
- Dark and Light themes render, and the theme preference is saved.
- Increasing skill spending without a known point budget is blocked before save.
- Browser console reports no errors during these checks.

## Limits

The preview release has not been validated by loading an edited real character in Enshrouded. The existing server SFTP integration was retained, but no live server credentials or live server were used for these checks. Its optional password storage remains unencrypted, as documented in the UI and credits.

## Native filesystem checks

`test-native.ps1`: three tests pass against the Rust functions used by the Windows app:

- Backup, write, and restore preserve the expected bytes, with a backup of the version being replaced during restore.
- Rapid consecutive backups have distinct directories and do not overwrite one another.
- Invalid content and a non-save target extension are rejected without changing the existing file.

These tests use synthetic saves created under `.local/native-tests/`. No original game save was written. Live-server tests were explicitly filtered out.

The initial 0.1.0 Windows application launched and discovered the local character, but native UI save/restore clicks could not be verified because automation input failed (`SendInput`, error 87). Those UI workflows were exercised in the sample browser preview, and file operations were exercised through the native tests above. Version 0.1.1 native close-button verification is recorded above.

## Existing-save read-only check

`scripts/check-save-roundtrip.mjs` was run against the existing local level-26 character. Both the character and knowledge blocks rebuilt byte-for-byte identically. Section checksums passed, and the input file was read only and remained unchanged. This verifies compatibility with that existing save's format; it does not replace loading an edited copy in the game.

## Previous artifact (0.1.1)

- `release/JJs-Enshrouded-Save-Editor.exe`: 22,604,800 bytes.
- SHA-256: `1181529470101abde7353be9616c411c4ff9493bcd6c75c51b4d54ca21364743`.
- The JJ icon images are embedded in the executable; the full MIT notice is embedded in About & credits.
- Microsoft Defender custom scan of the final executable found no threats. No antivirus settings were changed.
- `release/JJs-Enshrouded-Save-Editor-0.1.1.zip` contains the executable, LICENSE, CREDITS.md, and SHA256SUMS.txt.
