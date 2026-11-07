import React, { useEffect, useRef, useState } from 'react';
import { skills, skillName } from './gamedata.js';
import { t } from './i18n.js';
import { tex } from './ui.js';

const nodes = Object.entries(skills.nodes).map(([id, n]) => ({ ...n, id: Number(id) }));
const byId = new Map(nodes.map(n => [n.id, n]));
const roots = new Set(nodes.filter(n => n.type === 'Root').map(n => n.id));
const links = skills.links.filter(([a, b]) => byId.has(a) && byId.has(b));
const minX = Math.min(...nodes.map(n => n.x)) - 95, maxX = Math.max(...nodes.map(n => n.x)) + 95;
const minY = Math.min(...nodes.map(n => n.y)) - 95, maxY = Math.max(...nodes.map(n => n.y)) + 95;
const width = maxX - minX, height = maxY - minY;
const initial = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: 1 };
const zoomAt = (view, factor, anchor = view) => {
  const zoom = Math.max(0.6, Math.min(6, view.zoom * factor));
  const ratio = view.zoom / zoom;
  return { x: anchor.x + (view.x - anchor.x) * ratio, y: anchor.y + (view.y - anchor.y) * ratio, zoom };
};

export default function DesktopSkillTree({ levels, selected, onSelect }) {
  const [view, setView] = useState(initial);
  const drag = useRef(null);
  const svg = useRef(null);
  const active = id => roots.has(id) || levels.get(id) > 0;
  const reachable = new Set(links.flatMap(([a, b]) => [...(active(a) ? [b] : []), ...(active(b) ? [a] : [])]));
  const zoom = factor => setView(v => zoomAt(v, factor));
  useEffect(() => {
    const canvas = svg.current;
    const wheel = e => {
      const matrix = canvas.getScreenCTM();
      if (!matrix) return;
      e.preventDefault();
      const anchor = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      setView(v => zoomAt(v, e.deltaY < 0 ? 1.16 : 1 / 1.16, anchor));
    };
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => canvas.removeEventListener('wheel', wheel);
  }, []);
  const begin = e => {
    if (e.button !== 0 || e.target.closest('[data-skill-node]')) return;
    const scale = svg.current.getScreenCTM()?.a;
    if (!scale) return;
    svg.current.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, view, scale };
  };
  const move = e => {
    const d = drag.current;
    if (d) setView({ ...d.view, x: d.view.x - (e.clientX - d.x) / d.scale, y: d.view.y - (e.clientY - d.y) / d.scale });
  };
  const end = () => { drag.current = null; };
  return <div className="jj-skill-map">
    <div className="jj-map-controls">
      <button type="button" className="jj-button" onClick={() => zoom(1 / 1.35)} aria-label={t('Zoom out')}>−</button>
      <button type="button" className="jj-button" onClick={() => zoom(1.35)} aria-label={t('Zoom in')}>+</button>
      <button type="button" className="jj-button" onClick={() => setView(initial)}>{t('Fit tree')}</button>
      <span className="jj-muted">{t('Drag the background to pan. Select a node to change its rank.')}</span>
    </div>
    <svg ref={svg} aria-label={t('Interactive skill tree')} viewBox={`${view.x - width / (2 * view.zoom)} ${view.y - height / (2 * view.zoom)} ${width / view.zoom} ${height / view.zoom}`}
      onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      {links.map(([a, b], i) => <line key={i} x1={byId.get(a).x} y1={byId.get(a).y} x2={byId.get(b).x} y2={byId.get(b).y} className={active(a) && active(b) ? 'learned' : undefined} />)}
      {nodes.map(n => {
        const root = roots.has(n.id), label = skillName(n.id), rank = levels.get(n.id) || 0, max = n.maxLevel || 1;
        const radius = root ? 47 : n.icon ? 38 : 27;
        const pick = () => onSelect(String(n.id));
        return <g key={n.id} transform={`translate(${n.x}, ${n.y})`} data-skill-node={n.id} data-group={n.class}
          className={`jj-map-node ${active(n.id) ? 'learned' : reachable.has(n.id) ? 'reachable' : ''} ${selected === String(n.id) ? 'selected' : ''}`}
          role={root ? undefined : 'button'} tabIndex={root ? undefined : 0} aria-label={root ? undefined : `${label} · ${rank}/${max}`}
          aria-pressed={root ? undefined : selected === String(n.id)} onClick={root ? undefined : pick}
          onKeyDown={root ? undefined : e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}>
          <title>{label}{root ? '' : ` · ${rank}/${max}`}</title>
          <circle r={radius + 13} fill="transparent" stroke="none" />
          <circle className="jj-map-dot" r={radius} />
          {n.icon && <image href={tex(n.icon)} x={-radius + 3} y={-radius + 3} width={(radius - 3) * 2} height={(radius - 3) * 2} />}
          {rank > 0 && !root && <text textAnchor="middle" y={radius + 19}>{rank}/{max}</text>}
        </g>;
      })}
    </svg>
  </div>;
}
