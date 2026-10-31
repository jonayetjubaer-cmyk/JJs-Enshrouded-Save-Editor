import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from '@babel/parser';
import { detectLanguage, definirIdioma, idiomaAtual, campoDeNome, localeAtual, assinarIdioma, t, tn, displayError, LANGUAGE_STORAGE_KEY } from '../src/i18n.js';

const read = (file) => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const json = (file) => JSON.parse(read(file));
const dictionaries = Object.fromEntries(['it', 'fr', 'de'].map((code) => [code, json(`src/i18n/${code}.json`)]));
const en = json('src/i18n/en.json'), errors = json('src/i18n/errors.json');
const placeholders = (text) => [...text.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]).sort();
const canonical = (text) => en[text] || errors[text] || text;
function walk(node, callback, parents = []) {
  if (!node || typeof node !== 'object' || !node.type) return;
  callback(node, parents);
  for (const [key, value] of Object.entries(node)) if (!['loc', 'extra', 'comments'].includes(key)) {
    if (Array.isArray(value)) value.forEach((n) => walk(n, callback, [...parents, node]));
    else walk(value, callback, [...parents, node]);
  }
}

test('first-launch locale detection and saved choice cover regional language codes', () => {
  for (const [system, expected] of [['it-IT', 'it'], ['fr-CA', 'fr'], ['de-AT', 'de'], ['de_CH', 'de'], ['en-GB', 'en'], ['pt-PT', 'pt-BR'], ['ja-JP', 'en']]) assert.equal(detectLanguage(null, system), expected);
  assert.equal(detectLanguage('fr', 'de-DE'), 'fr');
  assert.equal(detectLanguage('invalid', 'it-IT'), 'it');
});

test('switching immediately updates language, screen-reader locale and persisted preference', () => {
  const saved = new Map(), seen = [];
  globalThis.localStorage = { getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  globalThis.document = { documentElement: {} };
  const stop = assinarIdioma((code) => seen.push(code));
  try {
    for (const [code, word, locale] of [['it', 'Salva', 'it-IT'], ['fr', 'Enregistrer', 'fr-FR'], ['de', 'Speichern', 'de-DE']]) {
      definirIdioma(code); assert.equal(idiomaAtual(), code); assert.equal(campoDeNome(), code);
      assert.equal(localeAtual(), locale); assert.equal(document.documentElement.lang, locale);
      assert.equal(saved.get(LANGUAGE_STORAGE_KEY), code); assert.equal(t('Save'), word);
      assert.equal(t('Salvar'), word, 'legacy messages use the same translation');
    }
    assert.deepEqual(seen, ['it', 'fr', 'de']);
    definirIdioma('not-a-language'); assert.equal(idiomaAtual(), 'de');
  } finally { stop(); definirIdioma('en'); delete globalThis.localStorage; delete globalThis.document; }
});

test('every interface, validation and dynamic label has all three translations', () => {
  const keys = new Set(Object.values(errors));
  const files = ['src/JJApp.jsx', 'src/desktop-panels.jsx', 'src/close-handler.mjs', 'src/editor-model.mjs', 'src/tauri-api.js', 'src/treecheck.js', 'src/ItemStats.jsx'];
  for (const file of files) walk(parse(read(file), { sourceType: 'module', plugins: ['jsx'] }), (node) => {
    if (node.type === 'CallExpression' && ['t', 'tn'].includes(node.callee.name)) for (const argument of node.arguments.slice(0, node.callee.name === 'tn' ? 2 : 1)) if (argument.type === 'StringLiteral') keys.add(canonical(argument.value));
    if (node.type === 'VariableDeclarator' && ['TABS', 'RARITY', 'EQUIPMENT'].includes(node.id.name)) walk(node.init, (n) => {
      if (n.type === 'StringLiteral' && /[A-Z]/.test(n.value[0])) keys.add(n.value);
    });
  });
  for (const name of ['LOCAL SAVES', 'SERVER CHARACTERS', 'Host', 'Port', 'Username', 'Guardian folder', 'Pinned server key', 'observe', 'enforce', 'Item', 'Recipe', 'Other']) keys.add(name);
  for (const word of ['Constituição', 'Espírito', 'Resistência', 'Força', 'Destreza', 'Inteligência', 'pegou', 'usou', 'inspecionou', 'vista', 'fabricada']) keys.add(canonical(word));
  for (const item of Object.values(json('data/items.json'))) keys.add(item.category);
  for (const node of Object.values(json('data/skills.json').nodes)) { keys.add(node.class); keys.add(node.type.replace(/Skill$/, '')); }
  for (const [language, dict] of Object.entries(dictionaries)) for (const key of keys) assert.ok(dict[key]?.trim(), `${language} is missing: ${key}`);
});

test('translations preserve placeholders and do not reinterpret player names or paths', () => {
  for (const [code, dict] of Object.entries(dictionaries)) for (const [key, value] of Object.entries(dict)) assert.deepEqual(placeholders(value), placeholders(key), `${code}: ${key}`);
  try {
    definirIdioma('de');
    assert.equal(t('Saved. Backup: {v0}', { v0: 'C:\\{v0}\\Müller' }), 'Gespeichert. Sicherung: C:\\{v0}\\Müller');
    assert.equal(t('Jonaex LTD'), 'Jonaex LTD');
    assert.equal(displayError('Dados inválidos'), 'Ungültige Spielstanddaten.');
    assert.equal(displayError('Hash do bloco player_character não confere'), 'Die Prüfsumme von Block player_character stimmt nicht überein.');
  } finally { definirIdioma('en'); }
});

test('singular and plural labels use the selected language grammar', () => {
  try {
    definirIdioma('it'); assert.equal(tn('{v0} equipped piece', '{v0} equipped pieces', 1), '1 pezzo equipaggiato');
    assert.equal(tn('{v0} equipped piece', '{v0} equipped pieces', 2), '2 pezzi equipaggiati');
    definirIdioma('fr'); assert.equal(tn('{v0} inventory entry', '{v0} inventory entries', 1), "1 entrée d'inventaire");
    definirIdioma('de'); assert.equal(tn('{v0} inventory entry', '{v0} inventory entries', 2), '2 Inventareinträge');
  } finally { definirIdioma('en'); }
});

test('startup language selector is outside the disabled editing fieldset', () => {
  let found = 0;
  walk(parse(read('src/JJApp.jsx'), { sourceType: 'module', plugins: ['jsx'] }), (node, parents) => {
    if (node.type !== 'JSXElement' || node.openingElement.name.name !== 'select') return;
    if (!node.openingElement.attributes.some((a) => a.name?.name === 'data-testid' && a.value?.value === 'app-language')) return;
    found++;
    assert.ok(!node.openingElement.attributes.some((a) => a.name?.name === 'disabled'));
    assert.ok(!parents.some((p) => p.type === 'JSXElement' && p.openingElement.name.name === 'fieldset'));
  });
  assert.equal(found, 1);
});

test('game localization covers every named item, skill description and stat label', () => {
  for (const code of ['it', 'fr', 'de']) {
    for (const [id, item] of Object.entries(json('data/items.json'))) if (item.en || item.pt) assert.ok(item[code]?.trim(), `${code} item ${id}`);
    for (const [id, skill] of Object.entries(json('data/skills.json').nodes)) {
      assert.ok(skill[code]?.trim(), `${code} skill ${id}`);
      if (skill.descEn) assert.ok(skill[`desc${code[0].toUpperCase()}${code.slice(1)}`]?.trim(), `${code} skill description ${id}`);
    }
    for (const [id, labels] of Object.entries(json('data/item-stats.json').nomes)) assert.ok(labels[{ it: 2, fr: 3, de: 4 }[code]]?.trim(), `${code} stat ${id}`);
  }
});

async function gameModule(code) {
  const source = read('src/gamedata.js')
    .replace(/^import (\w+) from '\.\.\/data\/([^']+)\.json';$/gm, (_, name, file) => `const ${name} = ${JSON.stringify(json(`data/${file}.json`))};`)
    .replace(/^import \{[^}]+\} from '\.\/i18n\.js';$/m, `const campoDeNome = () => '${code}'; const localeAtual = () => '${code}';`);
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
test('actual item, skill, description and recipe lookups use the selected game language', async () => {
  const itemData = json('data/items.json'), skillData = json('data/skills.json').nodes, knowledge = json('data/conhecimento.json');
  for (const code of ['it', 'fr', 'de']) {
    const game = await gameModule(code), skillId = Object.keys(skillData).find((id) => skillData[id].en === 'Double Jump');
    assert.equal(game.itemName(1457307757), itemData[1457307757][code]);
    assert.equal(game.skillName(skillId), skillData[skillId][code]);
    assert.equal(game.descricaoDe(skillData[skillId]), skillData[skillId][`desc${code[0].toUpperCase()}${code.slice(1)}`]);
    assert.equal(game.nomeConhecimento(knowledge[40769], 40769), itemData[knowledge[40769].i][code]);
    assert.equal(game.nomeConhecimento({ n: 'LocationReached' }, 1), 'LocationReached', 'technical IDs remain unchanged');
    assert.deepEqual(game.newEntry(1457307757, 1, 1, undefined, 35), (await gameModule('en')).newEntry(1457307757, 1, 1, undefined, 35), 'language cannot change the saved item');
  }
});
