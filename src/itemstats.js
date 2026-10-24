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
import { campoDeNome } from './i18n.js';

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

/** Formata o número do jeito que o jogo formata. */
function formatar(valor, formato, temSinal) {
  const sinal = temSinal && valor >= 0 ? '+' : '';
  switch (formato) {
    case '%': return `${sinal}${valor}%`;
    case 's': return `${sinal}${valor}s`;
    case 'ms': return `${sinal}${valor} ms`;
    case 'f': return `${sinal}${Number(valor).toFixed(2).replace(/\.?0+$/, '')}`;
    default: return `${sinal}${valor}`;
  }
}

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
  return (reg?.a || []).map((l) => linha(l, nivel));
}

/**
 * Melhorias do item, uma por nível de upgrade.
 *
 * A posição no vetor É o nível ("LEVEL 3"), então as posições vazias são mantidas — tirá-las
 * deslocaria todas as seguintes. `aplicada` diz se o item já chegou naquele nível de melhoria.
 */
export function melhoriasDe(itemId, nivel, upgrades = 0) {
  const reg = itens[itemId];
  if (!reg?.p) return [];
  return reg.p.map((m, i) => (m ? {
    nivel: i,
    aplicada: i < upgrades,
    linhas: (m.v || []).map((l) => linha(l, nivel)),
    no: m.no ?? null, // id do nó da árvore de habilidades, quando a melhoria dá nível nele
  } : null)).filter(Boolean);
}

/** Se há algo a mostrar para este item. */
export const temEstatisticas = (itemId) => {
  const reg = itens[itemId];
  return Boolean(reg && (reg.a || reg.p));
};
