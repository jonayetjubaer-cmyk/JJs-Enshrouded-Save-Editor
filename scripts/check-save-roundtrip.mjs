// Read-only check. This script never writes to the supplied save.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import * as container from '../shared/sv2c-web.mjs';
import { parseCharacter, buildCharacter } from '../shared/character.mjs';
import { parseBlock, buildBlock } from '../shared/knowledge.mjs';
const path = process.argv[2];
if (!path || !path.toLowerCase().endsWith('.ksd')) throw new Error('Usage: node scripts/check-save-roundtrip.mjs <character.ksd> [--level=5]');
const items = JSON.parse(await fs.readFile(new URL('../data/items.json', import.meta.url), 'utf8'));
const skills = JSON.parse(await fs.readFile(new URL('../data/skills.json', import.meta.url), 'utf8'));
const equipmentSlots = new Set(['Armour_Head', 'Armour_UpperBody', 'Armour_Arms', 'Armour_LowerBody', 'Armour_Feet', 'Armour_Ring', 'Shield', 'HookShot', 'Glider', 'Backpack']);
await container.init();
const original = await fs.readFile(path);
const save = await container.parse(original, async (b) => zstdDecompressSync(b), ['character_data', 'player_character', 'player_knowledge']);
const payload = save.blocks.find((b) => b.name === 'player_character').payload;
const character = parseCharacter(payload, (id) => !!items[id], (id) => !!skills.nodes[id], (id) => equipmentSlots.has(items[id]?.slot));
assert.deepEqual(buildCharacter(character), payload, 'Character block did not rebuild identically.');
const knowledge = save.blocks.find((b) => b.name === 'player_knowledge');
if (knowledge) assert.deepEqual(buildBlock(parseBlock(knowledge.payload)), knowledge.payload, 'Knowledge block did not rebuild identically.');
// Exercise the same character/container writers used by the desktop save path, in memory only.
// The expected bytes are patched independently: a level-only edit must change nothing else,
// including opaque character state and every other compressed block in the save.
const levelArg = process.argv.slice(3).find((arg) => arg.startsWith('--level='));
let levelEdit = null;
if (levelArg) {
  const level = Number(levelArg.slice('--level='.length));
  assert(Number.isInteger(level) && level >= 1 && level <= 50, 'Level must be an integer from 1 to 50.');
  const expected = Buffer.from(payload);
  expected.writeUInt32LE(level, 0x3a);
  const edited = buildCharacter({ ...character, level });
  assert.deepEqual(edited, expected, 'Level-only edit changed unrelated character bytes.');
  const blocks = save.blocks.map((b) => b.name === 'player_character' ? { ...b, payload: edited, changed: true } : b);
  const output = await container.build({ header: save.header, blocks }, async (b) => zstdCompressSync(b, { params: { [constants.ZSTD_c_compressionLevel]: 19 } }));
  const rebuilt = await container.parse(output, async (b) => zstdDecompressSync(b));
  for (const block of rebuilt.blocks) {
    const before = save.blocks.find((b) => b.name === block.name);
    if (block.name === 'player_character') assert.deepEqual(block.payload, expected);
    else assert.deepEqual(block.raw, before.raw, `Unrelated block changed: ${block.name}`);
  }
  const changedOffsets = [...payload.keys()].filter((i) => payload[i] !== edited[i]);
  levelEdit = { from: character.level, to: level, changedCharacterByteOffsets: changedOffsets.map((i) => `0x${i.toString(16)}`), allowedField: '0x3a..0x3d only', otherCharacterBytes: 'byte-identical', otherBlocks: 'raw byte-identical', output: 'memory only; not written' };
}
assert.deepEqual(await fs.readFile(path), original, 'Input file changed during the check.');
console.log(JSON.stringify({ result: 'PASS', character: container.characterName(save), level: character.level, characterBytes: payload.length, characterRoundTrip: 'byte-identical', knowledgeRoundTrip: knowledge ? 'byte-identical' : 'not present', levelEdit, inputFile: 'read only; unchanged' }));
