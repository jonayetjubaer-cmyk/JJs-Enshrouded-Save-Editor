// As linhas de atributo e as melhorias têm de sair iguais às do jogo.
//
// A referência é a captura de tela que acompanha a issue #2: o Gemini Ring, lendário, com as
// cinco melhorias aplicadas. O que o jogo mostra ali está transcrito abaixo, linha por linha, nos
// dois idiomas. Se o formato do arquivo de dados ou a montagem mudarem, isto reprova.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// carrega o itemstats.js com o idioma fixado, do mesmo jeito que os outros testes fazem com o
// gamedata.js: o módulo real depende de localStorage e navigator, que não existem aqui
async function carregar(campo) {
  const fonte = fs.readFileSync(path.join(RAIZ, 'src', 'itemstats.js'), 'utf8')
    .replace(/^import\s+\{[^}]*\}\s+from\s+'\.\/i18n\.js';$/gm, `const campoDeNome = () => '${campo}';`)
    .replace(/^import\s+(\w+)\s+from\s+'\.\.\/data\/([\w.-]+)\.json';$/gm,
      (_, nome, arq) => `const ${nome} = ${fs.readFileSync(path.join(RAIZ, 'data', `${arq}.json`), 'utf8')};`);
  const tmp = path.join(RAIZ, `.itemstats-${campo}-${process.pid}.mjs`);
  fs.writeFileSync(tmp, fonte);
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    fs.unlinkSync(tmp);
  }
}

const ANEL = 1234854024; // Gemini Ring / Anel de Gêmeos — o item da captura da issue #2

const ESPERADO = {
  en: {
    atributos: [
      ['+20', 'Health'],
      ['+4', 'Stamina Regeneration'],
      ['+5%', 'Damage against Fell'],
    ],
    melhorias: [
      [0, '+1', 'Backstab Mastery', 1311628529],
      [1, '+1', 'Thrust', 2506510512],
      [2, '+1', 'Dagger Mastery', 770186136],
      [3, '+3', 'Health Leech', null],
      [4, '+1', 'Fatal Precision', 3005573120],
    ],
  },
  pt: {
    atributos: [
      ['+20', 'Saúde'],
      ['+4', 'Regeneração de Vigor'],
      ['+5%', 'Dano contra Caído'],
    ],
    melhorias: [
      [0, '+1', 'Golpe nas Costas Magistral', 1311628529],
      [1, '+1', 'Ímpeto', 2506510512],
      [2, '+1', 'Domínio de Adagas', 770186136],
      [3, '+3', 'Roubo de vida', null],
      [4, '+1', 'Precisão Fatal', 3005573120],
    ],
  },
};

let ok = 0;
let ruim = 0;
const conferir = (certo, descricao) => {
  if (certo) ok += 1; else ruim += 1;
  console.log(`${certo ? 'ok  ' : 'ERRO'} ${descricao}`);
};

for (const campo of ['pt', 'en']) {
  const m = await carregar(campo);
  const esperado = ESPERADO[campo];

  const atributos = m.atributosDe(ANEL, 4);
  conferir(atributos.length === esperado.atributos.length,
    `${campo}: ${atributos.length} linhas de atributo`);
  esperado.atributos.forEach(([valor, nome], i) => {
    const veio = atributos[i] || {};
    conferir(veio.valor === valor && veio.nome === nome,
      `${campo}: atributo ${i} = ${veio.valor} ${veio.nome}`);
  });

  // as cinco melhorias, com o item em 5/5 upgrades como na captura
  const melhorias = m.melhoriasDe(ANEL, 4, 5);
  conferir(melhorias.length === esperado.melhorias.length,
    `${campo}: ${melhorias.length} melhorias`);
  esperado.melhorias.forEach(([nivel, valor, nome, no], i) => {
    const veio = melhorias[i] || {};
    const l = (veio.linhas || [])[0] || {};
    conferir(veio.nivel === nivel && l.valor === valor && l.nome === nome && veio.no === no && veio.aplicada,
      `${campo}: nível ${veio.nivel} = ${l.valor} ${l.nome}${veio.no ? ` (nó ${veio.no})` : ''}`);
  });
}

// com menos upgrades, só as melhorias até ali contam como aplicadas
const m = await carregar('en');
const parciais = m.melhoriasDe(ANEL, 2, 2);
conferir(parciais.filter((x) => x.aplicada).length === 2,
  `com 2 melhorias aplicadas, ${parciais.filter((x) => x.aplicada).length} marcadas`);

// item sem nada a mostrar não inventa seção
conferir(m.temEstatisticas(999999999) === false, 'id desconhecido não tem estatísticas');
conferir(m.atributosDe(999999999, 1).length === 0, 'id desconhecido não produz linhas');

// nenhuma linha pode sair com número inventado: valor null é o que marca "depende do nível"
const escaladas = Object.entries(JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'item-stats.json'), 'utf8')).itens)
  .filter(([, v]) => (v.a || []).some((l) => l.e));
conferir(escaladas.every(([id]) => m.atributosDe(Number(id), 40).some((l) => l.valor === null || !l.variaComNivel)),
  `${escaladas.length} itens com linha que escala, nenhum com número inventado`);

console.log(`estatísticas: ${ok} certos, ${ruim} errados`);
process.exit(ruim ? 1 : 0);
