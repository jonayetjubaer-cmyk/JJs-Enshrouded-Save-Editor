// Tela "Personagem": boneco de equipamento (armadura à esquerda, acessórios à direita, ferramentas
// embaixo) em volta de um medalhão com nível e XP; o painel da direita edita a peça selecionada.
import React, { useState } from 'react';
import { skills, items, itemName } from './gamedata.js';
import { tex, ttex } from './ui.js';
import ItemEditor, { FancyPanel } from './ItemEditor.jsx';
import { SlotView, Stepper, Separator } from './components.jsx';
import { t } from './i18n.js';

// índice do espaço de equipamento no save -> textura do espaço vazio, nome e posição
// A lista de equipamento do save é densa e tem mais espaços que o boneco mostrava: no personagem
// medido são 16 (armadura, aparência, 2 anéis, protetor, gancho, planador e mochila). O rótulo vem
// da posição na lista; quando a peça não corresponde ao rótulo esperado, mostramos só o nome dela.
export const EQUIP_SLOTS = [
  { tex: 'equipmentslot_head', name: 'Cabeça', x: 170, y: 150 },
  { tex: 'equipmentslot_upperbody', name: 'Tronco', x: 170, y: 300 },
  { tex: 'equipmentslot_arms', name: 'Braços', x: 170, y: 450 },
  { tex: 'equipmentslot_legs', name: 'Pernas', x: 170, y: 600 },
  { tex: 'equipmentslot_feet', name: 'Pés', x: 170, y: 750 },
  { tex: 'equipmentslot_head', name: 'Cabeça (2)', x: 320, y: 150 },
  { tex: 'equipmentslot_upperbody', name: 'Tronco (2)', x: 320, y: 300 },
  { tex: 'equipmentslot_arms', name: 'Braços (2)', x: 320, y: 450 },
  { tex: 'equipmentslot_legs', name: 'Pernas (2)', x: 320, y: 600 },
  { tex: 'equipmentslot_feet', name: 'Pés (2)', x: 320, y: 750 },
  { tex: 'equipmentslot_ring', name: 'Anel', x: 1110, y: 150 },
  { tex: 'equipmentslot_ring', name: 'Anel', x: 1110, y: 300 },
  { tex: 'equipmentslot_shield', name: 'Protetor', x: 1110, y: 450 },
  { tex: 'equipmentslot_hookshot', name: 'Gancho', x: 1110, y: 600 },
  { tex: 'equipmentslot_glider', name: 'Planador', x: 1110, y: 750 },
  { tex: 'equipmentslot_backpack', name: 'Mochila', x: 1110, y: 900 },
];
const SLOT = 118;
// também são as chaves dos nós de atributo da árvore (campo `pt` de skills.json)
const ATTRS = ['Constituição', 'Espírito', 'Resistência', 'Força', 'Destreza', 'Inteligência'];

export default function Character({ model, setModel }) {
  const [sel, setSel] = useState(0);
  // a lista do save é densa: a peça de índice k ocupa o k-ésimo espaço aceso na máscara.
  // Sem isso, faltando um anel tudo o que vem depois aparece uma casa antes no boneco.
  const acesos = [];
  for (let i = 0; i < 32; i++) if (model.equipMask & (1 << i)) acesos.push(i);
  const bySlot = new Map(model.equipment.map((e) => [acesos[e.slot] ?? e.slot, e]));
  const entry = bySlot.get(sel);
  const update = (e) => setModel({ ...model, equipment: model.equipment.map((x) => (x.slot === e.slot ? e : x)) });
  // tirar a peça: a lista do save é densa, e o editor renumera e ajusta a máscara ao gravar
  const [aviso, setAviso] = useState(null);
  const remove = (e) => {
    // tirar a mochila vestida apaga o contêiner dela, e com ele tudo o que estava guardado
    if (items[e.itemId]?.slot === 'Backpack' && model.extra.length) {
      setAviso(t('Não vou tirar a {item}: isso apagaria o contêiner dela e os {n} espaços guardados. Esvazie-o no jogo primeiro.', { item: itemName(e.itemId), n: model.extra.length }));
      return;
    }
    setAviso(null);
    setModel({ ...model, equipment: model.equipment.filter((x) => x.slot !== e.slot) });
    setSel(0);
  };

  const attrs = Object.fromEntries(ATTRS.map((a) => [a, 2]));
  for (const s of model.skills) {
    const n = skills.nodes[s.id];
    if (n?.type === 'Attribute' && s.level > 0 && attrs[n.pt] !== undefined) attrs[n.pt] += 1;
  }

  return (
    <div className="screen character">
      {/* medalhão central */}
      <div className="doll-center">
        <img className="doll-orn" src={tex('levelup_ornament')} alt="" />
        <img className="doll-medal" src={tex('attribute_tabIllustration_basics')} alt="" />
        <div className="doll-badge">
          <img className="badge-shape" src={ttex('level_badge_gold')} alt="" />
          <span>{model.level}</span>
        </div>
        <div className="doll-name">{model.name}</div>
      </div>

      <div className="doll-stats">
        <div className="stat-row">
          <span className="caps small">{t('Nível')}</span>
          <Stepper value={model.level} min={1} max={50} onChange={(v) => setModel({ ...model, level: v })} />
        </div>
        <div className="stat-row">
          <span className="caps small">{t('XP no nível')}</span>
          <Stepper value={model.xp} min={0} max={1e9} steps={[100, 1000]} onChange={(v) => setModel({ ...model, xp: v })} />
        </div>
        <Separator />
        <div className="attr-grid">
          {ATTRS.map((a) => <div key={a}><span className="caps small">{t(a)}</span><b>{attrs[a]}</b></div>)}
        </div>
        <div className="hint">{t('Atributos calculados pelos nós da árvore (editáveis na aba Habilidades).')}</div>
      </div>

      {EQUIP_SLOTS.map((s, i) => (
        <div key={i} className="doll-slot" style={{ left: s.x, top: s.y, width: SLOT }}>
          <div style={{ width: SLOT, height: SLOT, position: 'relative' }}>
            <SlotView entry={bySlot.get(i)} empty={s.tex} selected={sel === i} onClick={() => setSel(i)} />
          </div>
          <span className="doll-label">{t(s.name)}</span>
        </div>
      ))}
      <div className="doll-line left" />
      <div className="doll-line right" />

      <FancyPanel>
        <div className="caps small">{EQUIP_SLOTS[sel] ? t(EQUIP_SLOTS[sel].name) : t('Espaço {n}', { n: sel })}</div>
        {aviso && <div className="hint error">{aviso}</div>}
        {entry ? (
          <ItemEditor entry={entry} onChange={update} onRemove={() => remove(entry)} />
        ) : (
          <div className="empty-slot">
            <img className="empty-big" src={tex(EQUIP_SLOTS[sel]?.tex ?? 'equipmentslot_head')} alt="" />
            <div className="detail-sub">{t('Espaço vazio. Vista a peça no jogo; aqui dá para editar ou tirar as peças vestidas.')}</div>
          </div>
        )}
      </FancyPanel>
    </div>
  );
}
