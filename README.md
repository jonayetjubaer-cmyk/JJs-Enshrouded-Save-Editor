# Enshrouded Save Editor

Reads and edits Enshrouded character saves, with the interface drawn from the game's own screens.
It works on your **local saves**, and — if the server runs the companion
[Enshrouded Server Guardian](https://github.com/nicolasferreiraxn/Enshrouded-Server-Guardian) — on the **character copies stored on a
dedicated server**.

*Leia em [português](README.pt-BR.md).*

> **No support.** This is published so the community can use it, read it and improve it. There is no
> help desk, no guaranteed fixes and no roadmap. Fork it, change it, ship it — the license lets you.
> Issues and pull requests may sit unanswered.

## Features

**Character**

- Level and xp
- The skill tree — the real one, drawn with the game's own layout and node positions
- It refuses to save a tree the game would reject, because an invalid tree makes the game refund
  every point on load

**Backpack**

- The 40 main slots, the ALT bar and the action bar, each in its place
- The worn backpack's container, sized from the backpack you actually have equipped
- Add from a searchable catalogue of every item in the game, remove, drag to move, duplicate
- Filters by category, rarity and tier; search by name in Portuguese or English

**Worn equipment**

- The doll with all 16 slots: armour, appearance, rings, shield, grappling hook, glider, backpack
- Remove a worn piece
- It blocks removing a worn backpack that still has things inside, because that would delete the
  container and everything in it

**Any item in detail**

- Level, quantity, durability, upgrade pips, rarity
- **The gem socketed in a weapon:** swap it, remove it, or change the gem's level
- New items are created with the extra fields that item type actually stores, measured from real
  saves — creating one with the wrong fields produces a broken item in the game

**Knowledge**

- Discoveries and recipes, searchable by name or id, filterable by level
- Shows what each entry is (item, recipe, other) and its state

**Dedicated server** (needs [Enshrouded Server Guardian](https://github.com/nicolasferreiraxn/Enshrouded-Server-Guardian))

- The stored character copies appear in the same list as your local saves
- Edit a copy, kick the player, and they come back with your version
- Reads the guardian's log and explains, in plain words, why a save was rejected
- Live refresh while a player is connected, and it refuses to overwrite your pending edit

**General**

- **Portuguese and English**, switchable in the bottom bar, remembered between sessions.
  Adding a language is one JSON file — see [Translating](#translating)
- Backups before every write, restorable from inside the app
- Local saves and server copies in one list

## Works with or without a server

**Without the guardian** it opens the `.ksd` saves your game writes locally. Backups are made before
every write, and you can restore them from inside the app.

**With the guardian** the stored server copies show up in the same list as the local saves. The flow
is:

1. Edit a player's copy and save
2. Kick the player (or ask them to relog)
3. On the next join the guardian enforces the stored copy — so the player comes back with your
   version

The editor also reads the guardian's `recusados/` folder and explains, in plain words, what a
rejected save contained: level and xp differences, items the client had more or fewer of, items that
merely moved between containers, and discoveries that differ. When the guardian did not keep the
reference copy for that moment, it says so instead of producing a misleading comparison.

Server access is over **SFTP**, configured inside the app (address, user, password, and the folder
the guardian writes to). The host key is pinned on the first connection, so a different key later
breaks the connection instead of silently trusting it.

## Install

Download `enshrouded-save-editor.exe` from the [Releases](../../releases) page and run it. Nothing to
install: the interface resources travel inside the executable.

Every release is **built by GitHub Actions from this repository** and the build log is public — see
[`.github/workflows/build.yml`](.github/workflows/build.yml).

## Setting it up with the guardian

To edit the character copies of a dedicated server, the server needs
[Enshrouded Server Guardian](https://github.com/nicolasferreiraxn/Enshrouded-Server-Guardian) running, and the editor needs SFTP
access to the server's folder. Nothing is installed on the players' machines — only on the server.

### 1. On the server

Install the guardian: stop the server, drop its `dbghelp.dll` next to `enshrouded_server.exe`, start
the server. **Ask each player to join once.** The guardian only has a copy of someone after it has
seen that player's save, and until then there is nothing for the editor to show.

You can confirm it is working by looking for `guardiao-dados/` in the server folder. It should
contain one folder per player, named with their Steam ID.

### 2. Get the SFTP details

From your host's panel. Managed hosts usually list them under *File Manager → SFTP Details*, or
similar. You need the address, the port, the user and the password. The port is **not** 22 on most
game hosts — Nodecraft uses 2022, for example.

If you host the server yourself, this is whatever SSH/SFTP you already have on that machine.

### 3. In the editor

Open the **Server** tab and click **Set up server**, then fill in:

| field | what goes in it |
|---|---|
| **Address** | the server's address, without `sftp://` |
| **Port (SFTP)** | from the panel; 2022 on many game hosts |
| **User** | the SFTP user, which is often not your panel login |
| **Password** | the SFTP password. It is stored on your machine only |
| **Server key** | leave empty the first time |
| **Guardian folder** | `guardiao-dados`, unless you changed it |

Click **Save**, then **Test connection**. It should report the guardian's mode — `aplicar` means it
is enforcing, `observar` means it is only recording.

Then click **Pin seen key** and **Save** again. That stores the fingerprint of the server's SSH key,
so a different key later stops the connection instead of being trusted silently. Do this once,
after a connection you know worked.

### 4. Editing a player

The players now show up in the **Server** tab, and in the save list with a `server` tag.

1. Pick a player and edit whatever you need
2. **Ctrl+S** to write the copy
3. **Kick the player**, or ask them to leave and rejoin

On the next join the guardian replaces what the client sends with the copy you edited. Until the
player rejoins, nothing changes for them.

### Things worth knowing before you rely on it

- **A connected player keeps overwriting the copy.** The server saves roughly every 30 seconds, and
  the guardian stores each save. The editor warns you when the copy changes under you, and refuses
  to discard a pending edit. The reliable moment to edit is with the player offline.
- **Knowledge edits** (discoveries and recipes) take effect the same way — on the next join.
- **Backups** of every write go to `Documents\Enshrouded-Backups\servidor\`, one folder per write.
- **The password is stored in plain text** in the editor's config file
  (`%APPDATA%\enshrouded-save-editor\servidor.json`), like most desktop tools do. If that matters to
  you, use an SFTP account scoped to that server rather than your main one.

## Build it yourself

Two things: Node 20+ and the Rust toolchain for `x86_64-pc-windows-msvc`.

```
npm ci
npm run dist
```

The result is `src-tauri/target/release/enshrouded-save-editor.exe`.

That is the whole build. There is no asset pipeline to run, no Python, no extra tooling: the
interface resources are committed ready-to-use in `build-assets/`, and the Rust side embeds that
folder at compile time.

For development, `npm run dev` opens it with hot reload.

### Tests

```
npm test
```

Three self-contained suites: the gem socket encoding, the extra fields each item type stores, and a
parse-and-rebuild round trip. The round trip can also run against real saves:

```
node tests/ida-e-volta.mjs <folder with A.bin files>
```

It requires the rebuilt block to be **byte for byte identical** to the original, which is what keeps
editing one field from quietly rewriting another.

## Translating

The interface ships in Portuguese and English. Adding a language is one file, and you do not need to
understand the rest of the code.

The translation key **is the Portuguese text**. So a key you do not translate shows up in
Portuguese instead of showing up as `menu.button.save`, and nothing breaks while a translation is
incomplete.

1. Copy `src/i18n/en.json` to `src/i18n/<code>.json` — `es.json`, `de.json`, `fr.json`…
2. Translate the **values**, leaving the Portuguese keys untouched
3. Keep the `{placeholders}` exactly as they are: they get replaced with numbers and names, and the
   app looks for them by name, so you can move them around the sentence
4. Register it in `IDIOMAS`, at the top of [`src/i18n.js`](src/i18n.js):

```js
import es from './i18n/es.json';

export const IDIOMAS = [
  { codigo: 'pt-BR', nome: 'Português', locale: 'pt-BR', dicionario: null },
  { codigo: 'en', nome: 'English', locale: 'en-US', dicionario: en },
  { codigo: 'es', nome: 'Español', locale: 'es-ES', dicionario: es },
];
```

`nome` is what shows in the language picker — write it in the language itself. `locale` is what
formats dates and sorts names.

Item and skill names are not part of this: they come from the game's own localisation, stored in
`data/items.json`, which carries Portuguese and English. A third language would show a translated
interface with item names still in one of those two, because it would need the game's localisation
for that language — and regenerating `data/` is outside this repository.

If you change a Portuguese string in the source, the key changes with it. Update the key in every
`src/i18n/*.json`, or that string silently falls back to Portuguese.

## Save format notes

The format is not documented anywhere; everything here came from measurement. The parts that cost
the most:

- **The equipment list is dense and indexed through a bit mask.** Piece `k` occupies the k-th bit
  set in a 32-bit mask, followed by a u16 of free slots. Ignore the mask and, with one ring missing,
  everything after it shows up one slot early on the doll.
- **Flag `0x08` is appearance (4 bytes).** Not knowing it made the equipment list unreadable, and the
  parser then "found" equipment in the middle of the backpack and wrote a broken save.
- **An item's level already includes its upgrades.** A ring whose range is 30–30 appears at 30 with
  no upgrades, 34 with four, 35 with five. Changing upgrades without changing level makes the game
  discard the edit.
- **The gem socketed in a weapon is 5 bytes:** the gem's itemId (u32) followed by its level (u8).
- **The worn backpack sets the size of the extra container**, and it has to be found by the item's
  type, not by its index in the dense list — that index changes with the mask.
- **Knowledge** is an 8-byte header (`containerState`, `n`), then `n` ids and `n` values. A recipe is
  not stored as "unlocked": the game recomputes it from discoveries, so removing the material locks
  it again.

## Game data

Two folders, both committed, so a clone builds with nothing else installed:

| folder | what it is |
|---|---|
| `data/*.json` | the item table, the skill tree, the knowledge map, and which extra fields each item type stores — about 2 MB, imported by the source |
| `build-assets/game/` | the icons, interface textures and fonts the app draws with, already trimmed to what is actually referenced — about 26 MB, embedded in the executable |

These were prepared from an installed copy of the game. **Regenerating them is not part of this
repository**: the extraction scripts live outside it, so after a game update that changes item ids or
names, the data here goes stale until someone regenerates and commits it. If you need that and it has
not happened, open an issue — but see the no-support note at the top.

Item names come from the game's own localisation and are stored with Portuguese and English side by
side, which is why the catalogue search accepts either.

## Credits and third parties

For reading game resources we used
[kfc-parser / Enshrouded Mod Loader](https://github.com/Brabb3l/kfc-parser) by brabb3l.

## License

MIT — see [LICENSE](LICENSE). Not affiliated with or endorsed by Keen Games.
