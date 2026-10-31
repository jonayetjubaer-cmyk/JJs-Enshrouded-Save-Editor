# JJ edition changelog

## Unreleased

- Open compact character saves with zero to three equipped pieces, using extra mask/header checks and rejecting ambiguous layouts. This fixes the newly created character supplied in issue #2.
- Preserve the compact inventory header when removing the last equipped piece.
- Label the skill-point total as a validation-only budget and explain that it does not grant points in the game. Reject invalid stored budgets.
- Add short/empty equipment layout and skill-budget regression tests. The reported in-game skill reset remains under investigation; no new Nexus package has been released.

## 0.2.0 — 29 October 2026

- Added complete Italian, French and German editor translations.
- Added official localized names for 4,018 named items, 243 skill names/descriptions and 306 stat labels per language.
- Made language selection available before opening a save, with system-language detection and a remembered choice.
- Kept pending edits and Undo history when switching language.
- Localized sorting, dates, numbers, dialogs, validation and error messages.
- Added localization coverage and regression checks, plus packaged quick-start instructions.

## 0.1.1 — 27 October 2026

- Fixed the Windows close button and unsaved-change confirmation flow.
- Updated the product name to JJ's Enshrouded Save editor and the publisher to Jonaex LTD.
- Preserved Nicolas Ferreira's original MIT licence and attribution.

## 0.1.0 — 27 October 2026

- Introduced the compact JJ desktop interface with tabs, tables, item controls, Undo and backup workflows.
- Added system, light and dark themes and an explicit synthetic-data preview.

## Source repository and support — 31 October 2026

- Published the JJ edition source and documentation with a structured bug-report form and save-ZIP upload instructions.
- Added a level-only regression check and an optional read-only save diagnostic. No new app release or confirmed fix for the health/mana report is claimed.

The JJ edition is based on Nicolas Ferreira's v1.0.2. Earlier upstream history remains in Git; its version numbers and tags describe the original editor, not JJ releases. See [CREDITS.md](CREDITS.md).
