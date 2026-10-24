// Bloco de atributos e melhorias do item, no formato do tooltip do jogo:
// as linhas de atributo primeiro, depois "Melhorias" com uma linha por nível de upgrade.
import React from 'react';
import { atributosDe, melhoriasDe, temEstatisticas } from './itemstats.js';
import { skillName, skills } from './gamedata.js';
import { t } from './i18n.js';

function Linha({ valor, nome }) {
  return (
    <div className="st-linha">
      <span className="st-valor">{valor ?? '—'}</span>
      <span className="st-nome">{nome}</span>
    </div>
  );
}

export default function ItemStats({ entry }) {
  if (!temEstatisticas(entry.itemId)) return null;
  const nivel = entry.level;
  const atributos = atributosDe(entry.itemId, nivel);
  const melhorias = melhoriasDe(entry.itemId, nivel, entry.upgrades ?? 0);
  if (!atributos.length && !melhorias.length) return null;

  // uma linha cujo valor depende do nível e cuja conta ainda não conhecemos aparece sem número,
  // com este aviso embaixo — em vez de um número inventado
  const temVariavel = [...atributos, ...melhorias.flatMap((m) => m.linhas)].some((l) => l.valor === null);

  return (
    <div className="ed-stats">
      {atributos.map((l, i) => <Linha key={i} {...l} />)}

      {melhorias.length > 0 && (
        <>
          <div className="st-titulo caps small">{t('Melhorias')}</div>
          {melhorias.map((m) => (
            <div key={m.nivel} className={`st-melhoria${m.aplicada ? ' aplicada' : ''}`}>
              <span className="st-nivel caps">{m.aplicada ? '✓ ' : ''}{t('nível {n}', { n: m.nivel })}</span>
              <span className="st-efeitos">
                {m.linhas.map((l, i) => <Linha key={i} {...l} />)}
                {m.no !== null && skills.nodes[m.no] && (
                  <span className="hint">{t('aumenta o nível de {no} na árvore', { no: skillName(m.no) })}</span>
                )}
              </span>
            </div>
          ))}
        </>
      )}

      {temVariavel && (
        <div className="hint warn">{t('As linhas sem número variam com o nível do item por uma conta que ainda não foi medida; o editor não mostra um valor que não pode garantir.')}</div>
      )}
    </div>
  );
}
