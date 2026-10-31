// Read-only extraction of the game's official names/descriptions. Run kfc-parser
// v0.2.0 unpack with filter tkeen::LocaTagCollectionResource first, then pass its JSON.
// Layouts were checked against kfc-parser's public KFC4 and reflection definitions.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const [game, collectionPath] = process.argv.slice(2);
if (!game || !collectionPath) throw new Error('Usage: node scripts/extract-game-locales.mjs <game-directory> <collection.json>');
const kfc = fs.readFileSync(path.join(game, 'enshrouded.kfc'));
assert.equal(kfc.subarray(0, 4).toString(), 'KFC4');
const location = (index) => { const p = 16 + index * 8; return { offset: p + kfc.readUInt32LE(p), count: kfc.readUInt32LE(p + 4) }; };
const keys = location(7), values = location(8);
assert.equal(keys.count, values.count);
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const official = {};
for (const { language, data: { hash } } of collection.languages.filter((l) => ['En_Us', 'Pt_Br', 'It_It', 'Fr_Fr', 'De_De'].includes(l.language))) {
  const wanted = Buffer.alloc(16);
  [hash.size, hash.hash0, hash.hash1, hash.hash2].forEach((x, i) => wanted.writeUInt32LE(x, i * 4));
  let found = -1;
  for (let i = 0; i < keys.count; i++) if (kfc.subarray(keys.offset + i * 16, keys.offset + (i + 1) * 16).equals(wanted)) { found = i; break; }
  assert.ok(found >= 0, `Missing ${language} content`);
  const entry = values.offset + found * 16, offset = kfc.readUInt32LE(entry), container = kfc.readUInt16LE(entry + 6);
  const fd = fs.openSync(path.join(game, `enshrouded_${String(container).padStart(3, '0')}.dat`), 'r');
  const bytes = Buffer.alloc(hash.size);
  try { assert.equal(fs.readSync(fd, bytes, 0, bytes.length, offset), bytes.length); } finally { fs.closeSync(fd); }
  const start = bytes.readUInt32LE(0), count = bytes.readUInt32LE(4), strings = {};
  assert.ok(start + count * 24 <= bytes.length);
  for (let i = 0; i < count; i++) {
    const p = start + i * 24, id = bytes.readUInt32LE(p), s = p + 4 + bytes.readUInt32LE(p + 4), n = bytes.readUInt32LE(p + 8);
    assert.ok(s + n <= bytes.length);
    strings[id] = bytes.subarray(s, s + n).toString('utf8').replace(/<[^>]*>/g, '');
  }
  official[language] = strings;
}
const normalize = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const index = (map) => {
  const result = new Map();
  for (const [id, text] of Object.entries(map)) { const k = normalize(text); if (k) result.set(k, [...(result.get(k) || []), id]); }
  return result;
};
const english = index(official.En_Us), portuguese = index(official.Pt_Br);
const lookup = (en, pt) => {
  const a = english.get(normalize(en)) || [], b = portuguese.get(normalize(pt)) || [];
  return a.find((id) => b.includes(id)) || a[0] || b[0];
};
const read = (name) => JSON.parse(fs.readFileSync(`data/${name}.json`, 'utf8'));
const items = read('items'), skills = read('skills'), knowledge = read('conhecimento'), stats = read('item-stats');
const languages = [['it', 'It_It'], ['fr', 'Fr_Fr'], ['de', 'De_De']];
const counters = {};
for (const [code, language] of languages) {
  let names = 0, descriptions = 0, discoveries = 0;
  for (const [id, item] of Object.entries(items)) {
    if (!item.en && !item.pt) continue; // Unnamed developer identifiers are not localized game text.
    const key = lookup(item.en, item.pt), value = official[language][key];
    assert.ok(value, `Missing ${code} item ${id}: ${item.en}`); item[code] = value; names++;
  }
  for (const [id, skill] of Object.entries(skills.nodes)) {
    for (const [en, pt, field] of [[skill.en, skill.pt, code], [skill.descEn, skill.desc, `desc${code[0].toUpperCase()}${code.slice(1)}`]]) {
      if (!en && !pt) { skill[field] = ''; continue; }
      const key = lookup(en, pt), value = official[language][key];
      assert.ok(value, `Missing ${code} skill ${id}: ${field}`); skill[field] = value; if (field !== code) descriptions++;
    }
  }
  for (const entry of Object.values(knowledge)) {
    if (entry.i !== undefined || !entry.n) continue;
    const key = lookup(null, entry.n);
    if (key && official[language][key]) { entry[code] = official[language][key]; discoveries++; }
  }
  const slot = { it: 2, fr: 3, de: 4 }[code];
  for (const [id, pair] of Object.entries(stats.nomes)) {
    const key = official[language][id] ? id : lookup(pair[1], pair[0]);
    assert.ok(official[language][key], `Missing ${code} stat ${id}`); pair[slot] = official[language][key];
  }
  counters[code] = { items: names, skillDescriptions: descriptions, knowledgeNames: discoveries, statLabels: Object.keys(stats.nomes).length };
}
for (const [name, data] of Object.entries({ items, skills, conhecimento: knowledge, 'item-stats': stats })) fs.writeFileSync(`data/${name}.json`, JSON.stringify(data) + '\n');
fs.writeFileSync('data/localization-source.json', JSON.stringify({ source: 'Installed Enshrouded 1.0 official localization', extractor: 'kfc-parser v0.2.0 + scripts/extract-game-locales.mjs', languages: counters }, null, 2) + '\n');
console.log(counters);
