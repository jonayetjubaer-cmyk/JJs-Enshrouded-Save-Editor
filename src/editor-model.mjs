import { t, localeAtual } from './i18n.js';
import { entryAt, replaceSlots } from '../shared/inventory.mjs';

export function duplicateItem(model, key, layout) {
  const entry = entryAt(model, key);
  const target = layout.all.find((slot) => !entryAt(model, slot));
  if (!entry) throw new Error(t("Select an item first."));
  if (!target) throw new Error(t("There are no free inventory slots."));
  return { model: replaceSlots(model, [[target, entry]]), key: target };
}

export function moveItem(model, from, to, layout) {
  if (!layout.all.includes(from) || !layout.all.includes(to)) throw new Error(t("That slot is outside this inventory."));
  if (from === to) return model;
  const entry = entryAt(model, from);
  if (!entry) throw new Error(t("Select an item first."));
  return replaceSlots(model, [[from, entryAt(model, to)], [to, entry]]);
}

export function removeEquipment(model, slot, catalog) {
  const entry = model.equipment.find((e) => e.slot === slot);
  if (catalog[entry?.itemId]?.slot === 'Backpack' && model.extra.some((e) => e.count > 0)) {
    throw new Error(t("Empty the equipped backpack in the game before removing it. Its contents would otherwise be lost."));
  }
  // Keep the original dense indices. The existing writer updates the bitmask and renumbers on save.
  return { ...model, equipment: model.equipment.filter((e) => e.slot !== slot) };
}

export function setUpgrades(entry, upgrades, rarity = entry.maxUpgrades) {
  const count = Math.max(0, Math.min(rarity, upgrades));
  const level = entry.level === undefined ? {} : { level: Math.min(255, Math.max(count, entry.level - (entry.upgrades ?? 0) + count)) };
  return { ...entry, upgrades: count, maxUpgrades: rarity, ...level };
}

export function readSocket(hex = '0000000000') {
  if (!/^[0-9a-f]{10}$/i.test(hex)) return { itemId: 0, level: 0 };
  const bytes = hex.match(/../g).map((v) => parseInt(v, 16));
  return { itemId: (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) >>> 0, level: bytes[4] };
}

export function writeSocket(itemId, level) {
  if (!itemId) return '0000000000';
  return [itemId & 255, itemId >>> 8 & 255, itemId >>> 16 & 255, itemId >>> 24 & 255, Math.max(1, Math.min(255, level))]
    .map((v) => v.toString(16).padStart(2, '0')).join('');
}

export const equipmentBits = (mask) => Array.from({ length: 32 }, (_, i) => i).filter((i) => mask & (1 << i));

export function compareRows(a, b, key, direction = 'asc') {
  const x = a[key] ?? '', y = b[key] ?? '';
  const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), localeAtual(), { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}
