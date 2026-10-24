// O que o jogo mostra no tooltip de um item: as linhas de atributo e as melhorias.
//
// `data/item-stats.json` sai dos recursos do próprio jogo e tem três partes:
//
//   nomes          id de localização -> [português, inglês]
//   itens          por itemId: `a` linhas de atributo, `p` melhorias (5 posições, uma por nível
//                  de upgrade, com null onde não há), `d` proporções de dano, `r` de armadura
//   balanceamento  as constantes do cálculo de dano e armadura
//
// Uma linha é `{t: idDeTexto, v: valor, f: formato, s: tem sinal, e: [função, fator] se escala}`.
import stats from '../data/item-stats.json';
import { campoDeNome, localeAtual } from './i18n.js';

const { nomes, itens, balanceamento } = stats;

export const BALANCEAMENTO = balanceamento;

const nomeDoTexto = (id) => {
  const par = nomes[id];
  if (!par) return `#${id}`;
  return (campoDeNome() === 'pt' ? par[0] : par[1]) || par[1] || par[0] || `#${id}`;
};

/**
 * Valor de uma linha que escala com o nível do item.
 *
 * Devolve null enquanto a função não for conhecida — e o que devolve null não vira número na
 * tela. Mostrar um valor errado aqui é pior que não mostrar: quem lê decide o que editar por ele.
 *
 * Só a função `WeaponPowerCreep` aparece nos dados (60 linhas, todas de joia).
 */
export function valorEscalado(funcao, fator, base, nivel) {
  void funcao; void fator; void base; void nivel;
  return null;
}

// Decimal no separador do idioma: "0,77s" em português e "0.77s" em inglês. Os zeros à direita
// saem, para 60000 ms virar "60s" e não "60,00s".
const semZeros = (n, casas) => Number(n.toFixed(casas)).toLocaleString(localeAtual(), { maximumFractionDigits: casas });

/**
 * Formata o número do jeito que o jogo formata.
 *
 * Tempo vem em MILISSEGUNDOS nos dois formatos de duração, e o jogo escolhe a unidade pelo
 * tamanho: abaixo de um minuto mostra segundos com uma casa, de um minuto para cima mostra
 * minuto:segundo. Conferido nas Botas de Andarilho do Vento, que trazem -500 e 90000 e aparecem
 * no jogo como "-0.5s" e "1:30 m".
 */
function tempo(ms, temSinal) {
  const sinal = temSinal && ms >= 0 ? '+' : '';
  if (Math.abs(ms) < 60000) return `${sinal}${semZeros(ms / 1000, 1)}s`;
  const neg = ms < 0 ? '-' : sinal;
  const total = Math.round(Math.abs(ms) / 1000);
  const min = Math.floor(total / 60);
  const seg = String(total % 60).padStart(2, '0');
  return `${neg}${min}:${seg} m`;
}

function formatar(valor, formato, temSinal) {
  const sinal = temSinal && valor >= 0 ? '+' : '';
  switch (formato) {
    case '%': return `${sinal}${valor}%`;
    case 's': case 'ms': return tempo(valor, temSinal);
    case 'f': return `${sinal}${semZeros(Number(valor), 2)}`;
    default: return `${sinal}${valor}`;
  }
}

// A linha "Nível do Item" não vai para a lista: o jogo a consome no cabeçalho do tooltip
// ("NÍVEL 255 / 255") e não a repete entre os atributos — conferido nas Botas de Andarilho do
// Vento, que a trazem nos dados e não a mostram na tela. O editor já tem a sua própria linha de
// nível. Além disso o valor gravado é o nível NOMINAL (nos 604 itens que a têm é sempre o
// `minLevel`), então mostrá-lo faria um machado de nível 11 anunciar 40.
const NIVEL_DO_ITEM = 2298204525;

function linha(l, nivel) {
  const escala = l.e ? valorEscalado(l.e[0], l.e[1], l.v, nivel) : null;
  const valor = l.e ? escala : l.v;
  return {
    nome: nomeDoTexto(l.t),
    // null quando o valor depende do nível e ainda não sabemos a conta: quem mostra avisa
    valor: valor === null ? null : formatar(valor, l.f, l.s),
    variaComNivel: Boolean(l.e),
  };
}

/** Linhas de atributo do item, como no tooltip do jogo. */
export function atributosDe(itemId, nivel) {
  const reg = itens[itemId];
  return (reg?.a || []).filter((l) => l.t !== NIVEL_DO_ITEM).map((l) => linha(l, nivel));
}

/** Armadura bruta de um nível, antes de repartir por tipo. */
const baseArmadura = (nivel) => {
  const { offset, gradient } = balanceamento.armorSetup || {};
  return offset === undefined ? null : offset + gradient * nivel;
};

/**
 * Melhorias do item, uma por nível de upgrade.
 *
 * O rótulo de cada linha é o NÍVEL DO ITEM naquele passo, não o índice: as botas de nível 255 com
 * 5 melhorias mostram 251 a 255, e um anel de nível 4 mostra 0 a 4. É o nível base (o do item sem
 * as melhorias) mais a posição, somando um.
 *
 * As posições vazias são mantidas — tirá-las deslocaria as seguintes. `aplicada` diz se o item já
 * chegou naquele nível.
 */
export function melhoriasDe(itemId, nivel, upgrades = 0) {
  const reg = itens[itemId];
  if (!reg?.p) return [];
  const base = (nivel ?? 0) - upgrades;
  const dist = reg.r;
  return reg.p.map((m, i) => {
    if (!m) return null;
    const nivelLinha = base + 1 + i;
    const bruta = baseArmadura(nivelLinha);
    const anterior = baseArmadura(nivelLinha - 1);

    // armadura que ESTE nível acrescenta à peça (a coluna "Armadura" do jogo)
    let ganho = null;
    if (dist && bruta !== null) {
      const sobe = (fr) => Math.round(bruta * fr) - Math.round(anterior * fr);
      ganho = { fisica: sobe(dist.physical || 0), magica: sobe(dist.magical || 0) };
    }

    // melhoria que dá armadura de um tipo: vale no nível desta linha, não no nível final
    let armadura = null;
    if (m.ra && bruta !== null) {
      const fr = Object.values(m.ra)[0] || 0;
      armadura = { valor: Math.round(bruta * fr), nome: m.rn ? nomeDoTexto(m.rn) : '' };
    }

    return {
      // a posição no vetor do jogo; as vazias são descartadas no fim, então quem precisa contar
      // melhorias (a raridade limita quantas o item aceita) tem de usar isto, não o índice da
      // lista devolvida
      pos: i,
      nivel: nivelLinha,
      aplicada: i < upgrades,
      linhas: (m.v || []).map((l) => linha(l, nivel)),
      no: m.no ?? null, // id do nó da árvore de habilidades, quando a melhoria dá nível nele
      ganho,
      armadura,
    };
  }).filter(Boolean);
}

/**
 * Armadura da peça, no nível em que ela está.
 *
 * `baseArmor = offset + gradient × nível` vem do comentário que o próprio estúdio compilou no
 * jogo: em `keen::BalancingTable`, o campo `armorSetup` carrega o texto
 * "Base Armor = offset + ( gradient * item level )". Os valores (23 e 15) saem da mesma tabela.
 *
 * A repartição por tipo é a `distribution` da peça, e é a parte que não está provada: sabemos que
 * existem os nove atributos `ArmorPoints_<tipo>_Base` na mesma ordem dos nove campos da
 * distribuição, mas a multiplicação em si não foi lida no binário. Apoia a hipótese a soma
 * `physical + magical` dar 0,60 em todo conjunto de cinco peças, repartida conforme a classe
 * (0,40/0,20 guerreiro, 0,30/0,30 caçador, 0,24/0,36 mago).
 */
export function armaduraDe(itemId, nivel) {
  const reg = itens[itemId];
  if (!reg?.r || nivel === undefined) return null;
  const { offset, gradient } = balanceamento.armorSetup || {};
  if (offset === undefined || gradient === undefined) return null;
  // inteiro, como o jogo mostra: nas Botas de Andarilho do Vento em 255 a conta dá 230,88 e o
  // jogo escreve 231
  const base = offset + gradient * nivel;
  return {
    base: Math.round(base),
    fisica: Math.round(base * (reg.r.physical || 0)),
    magica: Math.round(base * (reg.r.magical || 0)),
  };
}

/** Se há algo a mostrar para este item. */
export const temEstatisticas = (itemId) => {
  const reg = itens[itemId];
  return Boolean(reg && (reg.a || reg.p || reg.r));
};
