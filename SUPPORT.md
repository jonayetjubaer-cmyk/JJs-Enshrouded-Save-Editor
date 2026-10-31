# Support and save-file uploads

JJ's Enshrouded Save editor is maintained by **Jonaex LTD**.

- [Download the Windows editor on Nexus Mods](https://www.nexusmods.com/enshrouded/mods/249?tab=files).
- [Report a bug](https://github.com/jonayetjubaer-cmyk/JJs-Enshrouded-Save-Editor/issues/new?template=bug_report.yml).
- [Nexus discussion and private-sharing requests](https://www.nexusmods.com/enshrouded/mods/249?tab=posts).

## Send a save for investigation

1. Close Enshrouded and preserve your original files.
2. Copy the affected character's `.ksd` file into a folder named `affected`.
3. If available, copy that same character's backup from before the edit into a separate folder named `before-edit`. Editor backups are normally in `Documents/Enshrouded-Backups/jj-editor/`, in timestamped subfolders. Using separate folders keeps identically named saves distinguishable.
4. ZIP those two folders. Do not include your whole Steam folder, server configuration, passwords or unrelated saves.
5. Create a bug report and drag the ZIP into the save-files field. ZIP attachments may be up to 25 MB. See [GitHub's attachment instructions](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).
6. Include editor/game versions, steps to reproduce, play mode, other mods, and whether fully restarting the game and host/server helped.

GitHub issues and their attachments in this repository are public. If you prefer private sharing, contact **RurushEdward on Nexus Mods** first to agree on a private transfer; do not paste a private link into a public issue or comment. Saves supplied for support should not be committed to this repository.

## Unexpected health or mana on hit

An open investigation tracks [Nexus report 1162552, "Healing and Mana"](https://www.nexusmods.com/enshrouded/mods/249?tab=bugs). Other players have reported similar effects clearing after a host/server restart, but the cause of this particular report is not confirmed. First try a normal restart of the host/server and a full restart of all affected clients, then retest before making further edits.

The level-only writer check has passed against a local save, preserving every unrelated character byte and every other container block. This does not replace comparing the reporter's affected save and its pre-edit backup or reproducing the behaviour in game.
