// Interpreta cada bloco de personagem e o remonta, exigindo que o resultado seja byte a byte igual
// ao original. É o que garante que editar um campo não reescreve nada por acidente.
//
// uso: node tests/ida-e-volta.mjs <pasta ou arquivo>...
//
// Procura por `A.bin` (as cópias que o Enshrouded Server Guardian guarda) nas pastas passadas. Sem
// argumento não há o que comparar e o teste passa sem fazer nada — é assim que ele roda na
// integração contínua, onde não existe save de ninguém.
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { parseCharacter, buildCharacter } = await import(pathToFileURL(path.join(RAIZ, 'shared', 'character.mjs')).href);
const items = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'items.json'), 'utf8'));
const skills = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'skills.json'), 'utf8'));

const CAB = 14; // cabeçalho S2BH de um bloco
const isItem = (id) => Object.prototype.hasOwnProperty.call(items, id);
const isSkill = (id) => Object.prototype.hasOwnProperty.call(skills.nodes, id);
const ESPACOS = new Set(['Armour_Head', 'Armour_UpperBody', 'Armour_Arms', 'Armour_LowerBody',
  'Armour_Feet', 'Armour_Ring', 'Shield', 'HookShot', 'Glider', 'Backpack']);
const ehEquipavel = (id) => ESPACOS.has(items[id]?.slot);

function* acha(alvo, profundidade = 0) {
  let st;
  try { st = fs.statSync(alvo); } catch { return; }
  if (st.isFile()) {
    yield alvo;
    return;
  }
  if (profundidade > 5) return;
  for (const e of fs.readdirSync(alvo, { withFileTypes: true })) {
    const p = path.join(alvo, e.name);
    if (e.isDirectory()) yield* acha(p, profundidade + 1);
    else if (e.name === 'A.bin') yield p;
  }
}

const arquivos = [...new Set(process.argv.slice(2).flatMap((a) => [...acha(a)]))];
if (arquivos.length === 0) {
  console.log('ida e volta: nenhum A.bin informado; nada a comparar');
  process.exit(0);
}

let ok = 0;
let ruim = 0;
for (const f of arquivos) {
  const A = Buffer.from(fs.readFileSync(f));
  if (A.length < CAB || A.toString('latin1', 0, 4) !== 'S2BH') {
    console.log(`pula ${f}: nao e um bloco de personagem`);
    continue;
  }
  try {
    const c = parseCharacter(A.subarray(CAB), isItem, isSkill, ehEquipavel);
    const refeito = buildCharacter(c);
    if (Buffer.compare(refeito, A.subarray(CAB)) === 0) ok += 1;
    else {
      ruim += 1;
      console.log(`ERRO ${f}: remontou com ${refeito.length} bytes, original tem ${A.length - CAB}`);
    }
  } catch (e) {
    ruim += 1;
    console.log(`ERRO ${f}: ${e.message}`);
  }
}

console.log(`ida e volta: ${ok} identicos, ${ruim} com problema`);
process.exit(ruim ? 1 : 0);
