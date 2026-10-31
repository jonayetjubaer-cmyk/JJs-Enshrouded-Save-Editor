import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCharacter, parseCharacter } from '../shared/character.mjs';
import { duplicateItem, moveItem, removeEquipment, setUpgrades, readSocket, writeSocket, equipmentBits, compareRows } from '../src/editor-model.mjs';

const sample = () => ({ name: 'Fixture', level: 35, equipMask: (1 << 5) | (1 << 15),
  equipment: [{ slot: 0, itemId: 10, count: 1 }, { slot: 1, itemId: 20, count: 1 }],
  main: [{ slot: 0, itemId: 30, count: 2, level: 35, upgrades: 3, maxUpgrades: 5, socket: 'c2be5cda37', unknown: 'preserve' }],
  extra: [{ slot: 0, itemId: 40, count: 11 }], skills: [{ id: 50, level: 1 }], knowledge: [{ id: 60, value: 7 }] });
const layout = { all: ['main:0', 'main:1', 'extra:0', 'extra:1'] };

test('duplicating an inventory item preserves its socket, extras and both containers', () => {
  const before = sample(), snapshot = structuredClone(before);
  const result = duplicateItem(before, 'main:0', layout);
  assert.equal(result.key, 'main:1');
  assert.deepEqual(result.model.main[1], { ...before.main[0], slot: 1 });
  assert.notEqual(result.model.main[1], before.main[0]);
  assert.deepEqual(result.model.extra, before.extra);
  assert.deepEqual(result.model.knowledge, before.knowledge);
  assert.deepEqual(before, snapshot);
});
test('moving into an occupied slot swaps containers without losing either item', () => {
  const before = sample(), snapshot = structuredClone(before);
  const after = moveItem(before, 'main:0', 'extra:0', layout);
  assert.deepEqual(after.main[0], { ...before.extra[0], slot: 0 });
  assert.deepEqual(after.extra[0], { ...before.main[0], slot: 0 });
  assert.deepEqual(before, snapshot);
  assert.throws(() => moveItem(before, 'main:0', 'extra:99', layout), /outside/);
  assert.throws(() => duplicateItem(before, 'main:0', { all: ['main:0', 'extra:0'] }), /no free/);
});
test('equipped backpack removal is refused until its contents are empty', () => {
  const before = sample();
  const catalog = { 20: { slot: 'Backpack' } };
  assert.throws(() => removeEquipment(before, 1, catalog), /contents would otherwise be lost/);
  const empty = { ...before, extra: [] };
  assert.equal(removeEquipment(empty, 1, catalog).equipment.length, 1);
});
test('removing equipment keeps original dense indices for the upstream serializer', () => {
  const before = sample(), after = removeEquipment(before, 0, {});
  assert.deepEqual(equipmentBits(after.equipMask), [5, 15]);
  assert.equal(after.equipment[0].slot, 1);
  assert.equal(before.equipment.length, 2);
});
test('changing upgrades or rarity adjusts effective level without wrapping a byte', () => {
  const entry = sample().main[0];
  assert.equal(setUpgrades(entry, 4).level, 36);
  const lower = setUpgrades(entry, 3, 2);
  assert.equal(lower.level, 34);
  assert.equal(lower.upgrades, 2);
  assert.equal(lower.maxUpgrades, 2);
  assert.equal(setUpgrades({ ...entry, level: 255 }, 5).level, 255);
});
test('editing a real gem socket preserves the little-endian ID and clamps its byte level', () => {
  assert.deepEqual(readSocket('c2be5cda37'), { itemId: 3663511234, level: 55 });
  assert.equal(writeSocket(3663511234, 55), 'c2be5cda37');
  assert.equal(writeSocket(3663511234, 999), 'c2be5cdaff');
  assert.equal(writeSocket(0, 55), '0000000000');
});
test('table sorting compares counts numerically and names naturally in both directions', () => {
  const rows = [{ name: 'Item 10', count: 10 }, { name: 'Item 2', count: 2 }];
  assert.equal([...rows].sort((a, b) => compareRows(a, b, 'name'))[0].name, 'Item 2');
  assert.equal([...rows].sort((a, b) => compareRows(a, b, 'count', 'desc'))[0].count, 10);
});

test('level-only edits preserve every unrelated byte, including opaque state, for separate characters', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
  const slots = new Set(['Armour_Head', 'Armour_UpperBody', 'Armour_Arms', 'Armour_LowerBody', 'Armour_Feet', 'Armour_Ring', 'Shield', 'HookShot', 'Glider', 'Backpack']);
  const equippedIds = Object.keys(catalog).filter((id) => slots.has(catalog[id].slot)).slice(0, 6).map(Number);
  const fixture = (level, marker) => {
    const mid = Buffer.alloc(20, marker);
    mid.writeUInt32LE(0xff, mid.length - 4);
    return buildCharacter({ level, xp: 0, skills: [],
      equipment: equippedIds.map((itemId, slot) => ({ slot, itemId, count: 1 })),
      main: [], extra: [], _equipCount: 6, _equipMask: 0xff, _equipFree: 1,
      _raw: { head: Buffer.alloc(0x3a, marker), mid,
        between: Buffer.from([1, 0, marker, marker, 5, 0, 0, 0]), tail: Buffer.alloc(64, marker) },
    });
  };
  const firstBytes = fixture(35, 0xa7), secondBytes = fixture(1, 0x6b);
  const read = (bytes) => parseCharacter(bytes, (id) => !!catalog[id], () => false, (id) => slots.has(catalog[id]?.slot));
  const first = read(firstBytes), second = read(secondBytes);
  for (const [character, original] of [[first, firstBytes], [second, secondBytes]]) {
    const expected = Buffer.from(original);
    expected.writeUInt32LE(5, 0x3a);
    const edited = buildCharacter({ ...character, level: 5 });
    assert.deepEqual(edited, expected, 'Bytes outside the four-byte level field changed');
    assert.deepEqual(read(edited)._raw, character._raw, 'Opaque state changed');
    assert.deepEqual(buildCharacter(character), original, 'Source character was mutated');
  }
  assert.notDeepEqual(first._raw, second._raw, 'Fixtures must contain distinct opaque character data');
});
