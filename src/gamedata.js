import items from '../data/items.json';
import skills from '../data/skills.json';
import extras from '../data/item-extras.json';
import { campoDeNome, localeAtual } from './i18n.js';

export { items, skills };

// O jogo traz cada nome em português e em inglês, os dois da localização oficial dele, e
// `data/items.json` guarda os dois por item. Então não traduzimos nome de item à mão: lemos o campo
// do idioma escolhido. O outro idioma serve de reserva para as entradas sem nome.
// Exportado porque quem já tem o objeto em mãos (uma lista de catálogo, o nó sob o cursor) não
// deve voltar à tabela pelo id só para ler o nome — e nunca deve ler `.pt` direto: foi assim que
// a árvore de habilidades e o catálogo continuaram em português com a interface em inglês.
export const nomeDe = (o, reserva) => {
  if (!o) return reserva;
  const campo = campoDeNome();
  return o[campo] || o[campo === 'pt' ? 'en' : 'pt'] || reserva;
};

export const itemName = (id) => nomeDe(items[id], items[id]?.debug || `#${id}`);
export const skillName = (id) => nomeDe(skills.nodes[id], `#${id}`);

// os valores são chaves de tradução: quem mostra passa por t()
export const CATEGORY_PT = {
  Weapons: 'Arma', Equipment: 'Equipamento', Materials: 'Material', Consumables: 'Consumível',
  Ammunition: 'Munição', Tools: 'Ferramenta', BuildTools: 'Construção', Blueprints: 'Projeto',
  Collectibles: 'Coleção', Vanity: 'Visual', Gems: 'Gema',
};

const HIDDEN = new Set(['Customization', 'ColorPalette']); // aparência, não vai para o inventário
const itemList = Object.entries(items).filter(([, it]) => !HIDDEN.has(it.category)).map(([id, it]) => ({
  id: Number(id), ...it,
  search: `${it.pt || ''} ${it.en || ''} ${it.debug}`.toLowerCase(),
}));

export function searchItems(q, limit = 60) {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  return itemList.filter((it) => it.search.includes(t)).slice(0, limit);
}

const skillList = Object.entries(skills.nodes)
  .filter(([, n]) => n.type !== 'Root')
  .map(([id, n]) => ({ id: Number(id), ...n, search: `${n.pt || ''} ${n.en || ''}`.toLowerCase() }));

export function searchSkills(q) {
  const t = q.trim().toLowerCase();
  // a ordem alfabética é a do idioma escolhido, senão a lista em inglês sai ordenada por português
  return skillList.filter((n) => !t || n.search.includes(t))
    .sort((a, b) => nomeDe(a, '').localeCompare(nomeDe(b, ''), localeAtual()));
}

// Entrada nova para o inventário.
//
// O jogo grava campos extras conforme o item, e as flags da entrada dizem quais estão ali. Criar
// um item com os campos errados dá um item quebrado no jogo: era o que acontecia com as joias,
// que caíam na regra final e saíam sem nível (flags 0x00 em vez de 0x01).
//
// `data/item-extras.json` traz a forma observada em saves reais, item por item, e tem a palavra
// final quando o item está lá. Para o resto valem as regras por categoria, conferidas contra os
// mesmos saves. O arquivo foi extraído de saves reais; regerá-lo não faz parte deste repositório,
// como o resto de `data/` (ver a seção de dados do jogo no README).
const RARIDADE = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5 };
const SEM_EXTRAS = new Set(['Glider', 'HookShot', 'Invalid']); // planador, arpéu e chaves

export function newEntry(itemId, slot, count, template, nivelPersonagem) {
  if (template) {
    const { slot: _s, count: _c, ...rest } = template;
    return { ...rest, slot, count: 1, itemId };
  }
  const it = items[itemId];
  const base = { slot, itemId, count: Math.max(1, Math.min(count, it.maxStack || 1)) };
  if (it.maxStack > 1) return base;
  // O nível gravado no item é o que o jogo usa para escalar o efeito (as joias, por exemplo, têm
  // uiValues com isScaled e function WeaponPowerCreep). Itens que caem no jogo vêm no nível da
  // zona, então o padrão é o nível do personagem, preso à faixa que o item aceita; sem ele,
  // sobra o mínimo do item.
  const faixa = (n) => Math.min(Math.max(n, it.minLevel || 1), it.maxLevel || 105);
  const level = faixa(nivelPersonagem || it.minLevel || 1);
  const rarity = RARIDADE[it.rarity] || 1;

  // a forma vista em save real, quando existe para este item
  const visto = extras[itemId];
  if (visto) {
    const e = { ...base, count: 1 };
    if (visto.flags & 0x01) e.level = level;
    if (visto.flags & 0x02) { e.maxDurability = visto.maxDurability ?? 300; e.durability = e.maxDurability; }
    if (visto.flags & 0x04) { e.maxLiquid = visto.maxLiquid ?? 1280; e.liquid = 0; }
    if (visto.flags & 0x10) { e.maxUpgrades = visto.maxUpgrades ?? rarity; e.upgrades = 0; }
    if (visto.flags & 0x20) e.socket = '0000000000';
    return e;
  }

  if (it.category === 'Weapons') {
    return { ...base, count: 1, level, durability: 300, maxDurability: 300, maxUpgrades: rarity, upgrades: 0, socket: '0000000000' };
  }
  // joia de arma: só o nível, como nas 35 observadas
  if (it.category === 'WeaponGem') return { ...base, count: 1, level };
  // munição de pilha 1 é a "eterna": nível e melhorias, sem durabilidade
  if (it.category === 'Ammunition') return { ...base, count: 1, level, maxUpgrades: rarity, upgrades: 0 };
  // consumível de pilha 1 é recipiente de líquido, como a Bolsa d'Água
  if (it.category === 'Consumables') return { ...base, count: 1, maxLiquid: 1280, liquid: 0 };
  // planador, arpéu e chaves não guardam nada; machado e picareta (slot Tool) guardam
  if (it.category === 'Tools') {
    if (SEM_EXTRAS.has(it.slot)) return { ...base, count: 1 };
    return { ...base, count: 1, level, durability: 200, maxDurability: 200, maxUpgrades: rarity, upgrades: 0 };
  }
  // em BuildTools convivem ferramentas (com durabilidade) e coisas de colocar (sem nada): fora da
  // tabela vale o caso comum, que é não guardar extras
  if (it.category === 'BuildTools') return { ...base, count: 1 };
  if (it.category === 'Equipment' && it.slot === 'Shield') {
    return { ...base, count: 1, level, durability: 100, maxDurability: 100, maxUpgrades: rarity, upgrades: 0 };
  }
  if (it.category === 'Equipment' && it.slot !== 'Backpack') return { ...base, count: 1, level, maxUpgrades: rarity, upgrades: 0 };
  return { ...base, count: 1 };
}
