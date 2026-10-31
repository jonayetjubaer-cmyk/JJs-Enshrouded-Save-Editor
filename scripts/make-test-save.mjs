// Synthetic fixture for testing the desktop file workflow. Never put this file in a game's saves.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import { buildCharacter, parseCharacter } from '../shared/character.mjs';
import * as container from '../shared/sv2c-web.mjs';
import { buildBlock } from '../shared/knowledge.mjs';

const items = JSON.parse(await fs.readFile(new URL('../data/items.json', import.meta.url), 'utf8'));
const equipped = new Set(['Armour_Head', 'Armour_UpperBody', 'Armour_Arms', 'Armour_LowerBody', 'Armour_Feet', 'Armour_Ring', 'Shield', 'HookShot', 'Glider', 'Backpack']);
const equipment = Object.keys(items).filter((id) => equipped.has(items[id].slot)).slice(0, 6).map((id, slot) => ({ slot, itemId: Number(id), count: 1, level: 35 }));
const main = [{ slot: 0, itemId: 1457307757, count: 1, level: 35, durability: 450, maxDurability: 450, upgrades: 0, maxUpgrades: 5, socket: '0000000000' }, { slot: 1, itemId: 2818493303, count: 5 }];
const mask = 0xff;
const middle = Buffer.alloc(4); middle.writeUInt32LE(mask);
const character = { level: 35, xp: 12540, skills: [], equipment, main, extra: [], _equipCount: equipment.length, _equipMask: mask, _equipFree: 1,
  _raw: { head: Buffer.alloc(0x3a, 0xa7), mid: middle, between: Buffer.from([1, 0, 5, main.length, 4, 0]), tail: Buffer.alloc(16, 0x5c) } };
const payload = buildCharacter(character);
parseCharacter(payload, (id) => !!items[id], () => false, (id) => equipped.has(items[id]?.slot));
const name = Buffer.from('JJ Test Fixture — Not a game save', 'utf8');
const cd = Buffer.alloc(9 + name.length); cd.writeUInt32LE(name.length, 5); name.copy(cd, 9);
const header = Buffer.alloc(0x30); header.write('SV2C'); header.writeUInt16LE(2, 4);
const section = (name, payload, version) => { const head = Buffer.alloc(14); head.write('S2BH'); head.writeUInt32LE(version, 4); head[9] = 1; return { name, payload, head, compressed: true, changed: true }; };
await container.init();
const bytes = await container.build({ header, blocks: [section('character_data', cd, 3), section('player_character', payload, 5), section('player_knowledge', buildBlock({ containerState: 1, entries: [] }), 100), section('jj_test_preserved', Buffer.from('Keep this section byte-for-byte unchanged.'), 1)] }, async (b) => zstdCompressSync(b));
await container.parse(bytes, async (b) => zstdDecompressSync(b));
const output = new URL('../.local/', import.meta.url); await fs.mkdir(output, { recursive: true });
await fs.writeFile(new URL('character-test.ksd', output), bytes);
await fs.writeFile(new URL('character-test.original.ksd', output), bytes);
console.log(fileURLToPath(new URL('character-test.ksd', output)));
