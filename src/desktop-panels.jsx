import React, { useEffect, useMemo, useRef, useState } from 'react';
import { items, skills, itemName, skillName, descricaoDe, newEntry, nomeConhecimento, ATRIBUTOS, atributosDaArvore } from './gamedata.js';
import capacities from '../data/backpack-capacities.json';
import knowledgeMap from '../data/conhecimento.json';
import { inventoryLayout, entryAt, replaceSlots } from '../shared/inventory.mjs';
import { estadoTexto } from '../shared/knowledge.mjs';
import { duplicateItem, moveItem, removeEquipment, setUpgrades, readSocket, writeSocket, equipmentBits, compareRows } from './editor-model.mjs';
import { checkTree, knownTotal, pointsUsed, totalKey } from './treecheck.js';
import { itemIcon } from './ui.js';
import { api, IS_PREVIEW } from './platform.js';
import { t, tn, idiomaAtual, localeAtual } from './i18n.js';
import ItemStats from './ItemStats.jsx';

export function Icon({ name, size = 16 }) {
  const paths = {
    open: 'M3 7h6l2 2h10l-3 11H3V5h6l2 2', save: 'M5 3h12l4 4v14H3V3h2m2 0v6h10V3M7 21v-8h10v8',
    undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12', refresh: 'M20 7a9 9 0 1 0 1 8M20 2v6h-6',
    backup: 'M3 7h18v14H3V7m2 0V3h14v4M9 11h6', plus: 'M12 5v14M5 12h14',
    search: 'M21 21l-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14', copy: 'M8 8h13v13H8V8M16 8V3H3v13h5',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7', person: 'M5 21v-3a7 7 0 0 1 14 0v3M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    inventory: 'M4 7h16v14H4V7m4 0V3h8v4M4 12h16M9 12v9m6-9v9', equipment: 'M12 3 21 7v6c0 5-9 9-9 9s-9-4-9-9V7l9-4',
    skills: 'M12 3v8M4 21v-7h16v7M12 14v7M9 3h6v5H9V3M1 18h6v5H1v-5m8 0h6v5H9v-5m8 0h6v5h-6v-5',
    knowledge: 'M12 5c-3-3-7-3-10-2v16c4-1 7-1 10 2 3-3 6-3 10-2V3c-3-1-7-1-10 2v16',
    server: 'M3 3h18v7H3V3m0 11h18v7H3v-7m4-7h1m-1 11h1', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 7v7m0-10v1',
    close: 'M5 5l14 14M19 5 5 19', check: 'M4 12l5 5L20 6', arrow: 'M4 12h16m-6-6 6 6-6 6',
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.info} /></svg>;
}

export function Button({ icon, children, primary, danger, className = '', ...props }) {
  return <button className={`jj-button ${primary ? 'primary' : ''} ${danger ? 'danger' : ''} ${className}`} {...props}>{icon && <Icon name={icon} />}{children}</button>;
}
export const Empty = ({ title, children, icon = 'inventory' }) => <div className="jj-empty"><Icon name={icon} size={36} /><h3>{t(title)}</h3><p>{children}</p></div>;
export function NumberField({ label, value, onChange, min = 0, max = 65535, ...props }) {
  return <label className="jj-field"><span>{t(label)}</span><input type="number" value={value ?? ''} min={min} max={max} step="1" onChange={(e) => {
    if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onChange(Math.max(min, Math.min(max, Math.floor(Number(e.target.value)))));
  }} {...props} /></label>;
}

export function Dialog({ title, children, onClose, wide = false }) {
  const root = useRef(null), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    const isTop = () => [...document.querySelectorAll('[role="dialog"]')].at(-1) === root.current;
    const handler = (e) => { if (e.key === 'Escape' && isTop()) { e.preventDefault(); close.current(); } };
    window.addEventListener('keydown', handler);
    const dialog = root.current;
    dialog?.querySelector('button,input,select')?.focus();
    const trap = (e) => {
      if (e.key !== 'Tab' || !isTop()) return;
      const all = [...(dialog?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]') ?? [])];
      const first = all[0], last = all.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    dialog?.addEventListener('keydown', trap);
    return () => { window.removeEventListener('keydown', handler); dialog?.removeEventListener('keydown', trap); prev?.focus(); };
  }, []);
  return <div className="jj-overlay"><section ref={root} className={`jj-dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
    <header><h2>{t(title)}</h2><button className="jj-icon-button" aria-label={t("Close dialog")} onClick={onClose}><Icon name="close" /></button></header>{children}
  </section></div>;
}

export function DataTable({ columns, rows, selected, onSelect, sort, onSort, rowKey = (r) => r.key, empty = t('No matching entries.'), onDoubleClick }) {
  return <div className="jj-table-scroll"><table className="jj-table"><thead><tr>{columns.map((c) => <th key={c.key} style={c.width ? { width: c.width } : undefined} aria-sort={sort?.key === c.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : undefined}>
    {onSort && !c.noSort ? <button onClick={() => onSort(c.key)}>{t(c.label)}<span>{sort?.key === c.key ? sort.direction === 'asc' ? '▴' : '▾' : ''}</span></button> : c.label}
  </th>)}</tr></thead><tbody>{rows.map((r) => <tr key={rowKey(r)} className={selected === rowKey(r) ? 'selected' : ''} aria-selected={onSelect ? selected === rowKey(r) : undefined} tabIndex={onSelect ? 0 : undefined}
    onClick={() => onSelect?.(r)} onDoubleClick={() => onDoubleClick?.(r)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(r); } }}>
    {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : ['category', 'rarity', 'container', 'position', 'group', 'type', 'kind'].includes(c.key) ? t(r[c.key]) : r[c.key]}</td>)}
  </tr>)}</tbody></table>{!rows.length && <Empty title={empty}>{t("Try changing the search or filters.")}</Empty>}</div>;
}
function useSort(defaultKey = 'name') {
  const [sort, setSort] = useState({ key: defaultKey, direction: 'asc' });
  return [sort, (key) => setSort((s) => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))];
}
const RARITY = ['—', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const EQUIPMENT = ['Head · vanity', 'Chest · vanity', 'Arms · vanity', 'Legs · vanity', 'Feet · vanity', 'Head', 'Chest', 'Arms', 'Legs', 'Feet', 'Ring 1', 'Ring 2', 'Shield', 'Grappling hook', 'Glider', 'Backpack'];
const category = (id) => items[id]?.category || 'Unknown';
const itemRarity = (entry) => entry?.maxUpgrades ?? ({ Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5 }[items[entry?.itemId]?.rarity] || 0);
const itemCell = (r) => <span className="jj-item-name"><img src={itemIcon(r.entry.itemId)} alt="" loading="lazy" /><span>{r.name}</span></span>;

function ItemDetails({ entry, onChange, onRemove, onDuplicate, notice }) {
  if (!entry) return <aside className="jj-inspector"><Empty title={t("Select an item")}>{t("Choose a row to inspect or edit its properties.")}</Empty></aside>;
  const item = items[entry.itemId];
  const set = (key, value) => onChange({ ...entry, [key]: value });
  const socket = entry.socket !== undefined ? readSocket(entry.socket) : null;
  const gems = Object.keys(items).filter((id) => items[id].category === 'WeaponGem').map(Number).sort((a, b) => itemName(a).localeCompare(itemName(b)));
  return <aside className="jj-inspector"><div className="jj-inspector-head"><img src={itemIcon(entry.itemId)} alt="" /><div><span className={`jj-rarity r${itemRarity(entry)}`}>{t(RARITY[itemRarity(entry)])}</span><h2>{itemName(entry.itemId)}</h2><span className="jj-muted">{t(category(entry.itemId))}</span></div></div>
    <div className="jj-properties">
      <NumberField label={t("Quantity")} value={entry.count} min={1} max={Math.max(item?.maxStack || 1, entry.count)} onChange={(v) => set('count', v)} />
      {entry.level !== undefined && <NumberField label={t("Item level")} value={entry.level} min={entry.upgrades ?? 0} max={255} onChange={(v) => set('level', v)} />}
      {entry.maxUpgrades !== undefined && <label className="jj-field"><span>{t("Rarity")}</span><select value={entry.maxUpgrades} onChange={(e) => onChange(setUpgrades(entry, entry.upgrades ?? 0, Number(e.target.value)))}>{RARITY.slice(1).map((r, i) => <option key={r} value={i + 1}>{t(r)}</option>)}</select></label>}
      {entry.upgrades !== undefined && <NumberField label={t("Upgrades")} value={entry.upgrades} max={entry.maxUpgrades} onChange={(v) => onChange(setUpgrades(entry, v))} />}
      {entry.durability !== undefined && <NumberField label={t("Durability")} value={entry.durability} max={entry.maxDurability} onChange={(v) => set('durability', v)} />}
      {entry.liquid !== undefined && <NumberField label={t("Liquid")} value={entry.liquid} max={entry.maxLiquid} onChange={(v) => set('liquid', v)} />}
      {socket && <><label className="jj-field jj-full"><span>{t("Socketed gem")}</span><select value={socket.itemId} onChange={(e) => set('socket', writeSocket(Number(e.target.value), socket.level || 1))}><option value={0}>{t("No gem")}</option>{socket.itemId > 0 && !items[socket.itemId] && <option value={socket.itemId}>{t("Unknown gem #{v0}", {v0: (socket.itemId)})}</option>}{gems.map((id) => <option key={id} value={id}>{itemName(id)}</option>)}</select></label>
        {socket.itemId > 0 && <NumberField label={t("Gem level")} min={1} max={255} value={socket.level} onChange={(v) => set('socket', writeSocket(socket.itemId, v))} />}</>}
    </div>
    {item?.maxLevel > 0 && entry.level > item.maxLevel && <p className="jj-note warning">{t("Above the normal item cap of {v0}. The game may reduce it when loading.", {v0: (item.maxLevel)})}</p>}
    <div className="jj-inline-actions">
      {entry.durability !== undefined && <Button onClick={() => set('durability', entry.maxDurability)}>{t("Repair")}</Button>}
      {item?.maxStack > 1 && <Button onClick={() => set('count', item.maxStack)}>{t("Max stack")}</Button>}
      {entry.liquid !== undefined && <Button onClick={() => set('liquid', entry.maxLiquid)}>{t("Fill")}</Button>}
      {onDuplicate && <Button icon="copy" onClick={onDuplicate}>{t("Duplicate")}</Button>}
      {onRemove && <Button danger icon="trash" onClick={onRemove}>{t("Remove")}</Button>}
    </div>
    {notice && <p className="jj-note">{t(notice)}</p>}
    <div className="jj-stats-section"><h3>{t("Attributes & enhancements")}</h3><ItemStats entry={entry} /></div>
    <p className="jj-debug">{t("ID {v0} · {v1}", {v0: (entry.itemId), v1: (item?.debug)})}</p>
  </aside>;
}

function AddItemDialog({ model, target, onAdd, onClose }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState('all'), [rar, setRar] = useState('all'), [selected, setSelected] = useState(null), [count, setCount] = useState(1), [page, setPage] = useState(0);
  const [sort, onSort] = useSort();
  const catalog = useMemo(() => Object.entries(items).filter(([, i]) => !['Customization', 'ColorPalette'].includes(i.category) && (i.en || i.pt)).map(([id, i]) => ({ key: id, id: Number(id), name: itemName(id), category: i.category, rarity: i.rarity, maxStack: i.maxStack, entry: { itemId: Number(id) }, search: `${id} ${itemName(id)} ${i.en} ${i.pt} ${i.debug}`.toLowerCase() })), [idiomaAtual()]);
  const rows = catalog.filter((r) => (cat === 'all' || r.category === cat) && (rar === 'all' || r.rarity === rar) && r.search.includes(q.toLowerCase())).sort((a, b) => compareRows(a, b, sort.key, sort.direction));
  useEffect(() => setPage(0), [q, cat, rar, sort]);
  const pick = (r) => { setSelected(r); setCount(Math.min(count, r.maxStack || 1)); };
  return <Dialog title={t("Add item from catalog")} onClose={onClose} wide><div className="jj-filterbar">
    <input autoFocus aria-label={t("Search item catalog")} placeholder={t("Search by name, item ID or internal name…")} value={q} onChange={(e) => setQ(e.target.value)} />
    <select aria-label={t("Catalog category")} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">{t("All categories")}</option>{[...new Set(catalog.map((r) => r.category))].sort().map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>
    <select aria-label={t("Catalog rarity")} value={rar} onChange={(e) => setRar(e.target.value)}><option value="all">{t("All rarities")}</option>{RARITY.slice(1).map((r) => <option key={r} value={r}>{t(r)}</option>)}</select>
  </div><DataTable rows={rows.slice(page * 80, (page + 1) * 80)} selected={selected?.key} onSelect={pick} sort={sort} onSort={onSort} columns={[{ key: 'name', label: t("Item"), render: itemCell }, { key: 'category', label: t("Category") }, { key: 'rarity', label: t("Rarity") }, { key: 'maxStack', label: t("Max stack"), width: 90 }]} />
    <div className="jj-dialog-actions"><span className="jj-muted">{tn("{v0} item · page {v1} of {v2}", "{v0} items · page {v1} of {v2}", rows.length, {v0: (rows.length.toLocaleString(localeAtual())), v1: (page + 1), v2: (Math.max(1, Math.ceil(rows.length / 80)))})}</span><Button disabled={page === 0} onClick={() => setPage(page - 1)}>{t("Previous")}</Button><Button disabled={(page + 1) * 80 >= rows.length} onClick={() => setPage(page + 1)}>{t("Next")}</Button><span className="jj-spacer" /><NumberField label={t("Quantity")} value={count} min={1} max={selected?.maxStack || 1} onChange={setCount} /><Button primary icon="plus" disabled={!selected || !target} onClick={() => { onAdd(newEntry(selected.id, Number(target.split(':')[1]), count, undefined, model.level)); onClose(); }}>{t("Add item")}</Button><Button onClick={onClose}>{t("Cancel")}</Button></div>
  </Dialog>;
}

export function InventoryPanel({ model, onChange, ask, report, equipment = false }) {
  const [filter, setFilter] = useState(''), [cat, setCat] = useState('all'), [container, setContainer] = useState('all'), [selected, setSelected] = useState(null), [add, setAdd] = useState(false), [moveTo, setMoveTo] = useState('');
  const [sort, onSort] = useSort(equipment ? 'position' : 'slotNumber');
  const layout = inventoryLayout(model, items, capacities);
  const bits = equipmentBits(model.equipMask);
  const rows = equipment ? model.equipment.map((entry) => ({ key: `equipment:${entry.slot}`, entry, name: itemName(entry.itemId), position: EQUIPMENT[bits[entry.slot]] || `Slot ${bits[entry.slot]}`, slotNumber: bits[entry.slot], category: category(entry.itemId), rarity: itemRarity(entry), count: entry.count, level: entry.level ?? '—' }))
    : ['main', 'extra'].flatMap((c) => model[c].filter((e) => e.count > 0).map((entry) => ({ key: `${c}:${entry.slot}`, entry, name: itemName(entry.itemId), container: c === 'extra' ? 'Backpack' : entry.slot >= 16 && entry.slot < 24 ? 'ALT bar' : entry.slot >= 24 && entry.slot < 32 ? 'Action bar' : 'Inventory', slotNumber: entry.slot + 1, category: category(entry.itemId), rarity: itemRarity(entry), count: entry.count, level: entry.level ?? '—' })));
  const visible = rows.filter((r) => `${r.name} ${r.entry.itemId} ${items[r.entry.itemId]?.debug}`.toLowerCase().includes(filter.toLowerCase()) && (cat === 'all' || r.category === cat) && (container === 'all' || r.container === container)).sort((a, b) => compareRows(a, b, sort.key, sort.direction));
  const picked = rows.find((r) => r.key === selected);
  const free = layout.all.find((key) => !entryAt(model, key));
  const update = (entry) => onChange(equipment ? { ...model, equipment: model.equipment.map((e) => e.slot === entry.slot ? entry : e) } : replaceSlots(model, [[selected, entry]]));
  const remove = async () => {
    if (!picked || !await ask(t("Remove item?"), t("Remove {v0} from this character? You can undo this before saving.", {v0: picked.name}), t("Remove"))) return;
    try { onChange(equipment ? removeEquipment(model, picked.entry.slot, items) : replaceSlots(model, [[selected, null]])); setSelected(null); } catch (e) { report(e); }
  };
  const duplicate = () => { try { const result = duplicateItem(model, selected, layout); onChange(result.model); setSelected(result.key); } catch (e) { report(e); } };
  return <><div className="jj-panel-toolbar"><div><h2>{equipment ? t("Equipped items") : t("Inventory")}</h2><span className="jj-muted">{equipment ? tn("{v0} equipped piece", "{v0} equipped pieces", rows.length, {v0: rows.length}) : t("{v0} occupied / {v1} available slots", {v0: rows.length, v1: layout.all.length})}</span></div><span className="jj-spacer" />{!equipment && <Button primary icon="plus" onClick={() => setAdd(true)} disabled={!free}>{t("Add item…")}</Button>}</div>
    <div className="jj-filterbar"><span className="jj-search"><Icon name="search" /><input aria-label={t("Filter inventory")} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("Filter by name or ID…")} /></span>
      <select aria-label={t("Item category")} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">{t("All categories")}</option>{[...new Set(rows.map((r) => r.category))].sort().map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>
      {!equipment && <select aria-label={t("Container")} value={container} onChange={(e) => setContainer(e.target.value)}><option value="all">{t("All containers")}</option>{['Inventory', 'Backpack', 'ALT bar', 'Action bar'].map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>}<span className="jj-muted">{t("{v0} shown · click a heading to sort", {v0: (visible.length)})}</span></div>
    <div className="jj-split"><div className="jj-table-pane"><DataTable rows={visible} selected={selected} onSelect={(r) => setSelected(r.key)} sort={sort} onSort={onSort} columns={[
      ...(equipment ? [{ key: 'position', label: t("Equipment slot"), width: 135 }] : [{ key: 'slotNumber', label: t("Slot"), width: 60 }]),
      { key: 'name', label: t("Item"), render: itemCell }, ...(!equipment ? [{ key: 'container', label: t("Container"), width: 100 }] : []),
      { key: 'count', label: t("Count"), width: 70 }, { key: 'level', label: t("Level"), width: 60 }, { key: 'rarity', label: t("Rarity"), width: 100, render: (r) => <span className={`jj-rarity r${r.rarity}`}>{t(RARITY[r.rarity])}</span> },
    ]} />{!equipment && <div className="jj-table-footer"><label>{t("Move selected to")} <select aria-label={t("Move item destination")} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}><option value="">{t("Choose slot…")}</option>{layout.all.filter((k) => k !== selected).map((key) => <option key={key} value={key}>{key.startsWith('extra') ? t("Backpack") : t("Main")} · {Number(key.split(':')[1]) + 1}{entryAt(model, key) ? t(" (swap)") : t(" (empty)")}</option>)}</select></label><Button icon="arrow" disabled={!picked || !moveTo} onClick={() => { try { onChange(moveItem(model, selected, moveTo, layout)); setSelected(moveTo); setMoveTo(''); } catch (e) { report(e); } }}>{t("Move / swap")}</Button></div>}</div>
      <ItemDetails entry={picked?.entry} onChange={update} onRemove={picked ? remove : null} onDuplicate={!equipment && free && picked ? duplicate : null} notice={equipment ? t("Equip new pieces in the game. This editor can change or remove the pieces already equipped.") : null} />
    </div>{add && <AddItemDialog model={model} target={free} onAdd={(entry) => { onChange(replaceSlots(model, [[free, entry]])); setSelected(free); }} onClose={() => setAdd(false)} />}</>;
}

export function CharacterPanel({ model, onChange }) {
  const { daArvore, porChama } = atributosDaArvore(model.skills);
  return <><div className="jj-panel-toolbar"><div><h2>{t("Character")}</h2><span className="jj-muted">{t("Progression and save information")}</span></div></div><div className="jj-character-grid"><section className="jj-card"><h3>{t("Progression")}</h3><dl><dt>{t("Character")}</dt><dd>{model.name}</dd><dt>{t("Source")}</dt><dd>{model.servidor ? t("Dedicated server") : t("Local save")}</dd></dl><div className="jj-properties"><NumberField label={t("Level")} value={model.level} min={1} max={50} onChange={(v) => onChange({ ...model, level: v })} /><NumberField label={t("XP in level")} value={model.xp} max={0xffffffff} onChange={(v) => onChange({ ...model, xp: v })} /></div><p className="jj-note">{t("Edits stay in memory until you save. A backup is created before every write.")}</p></section>
    <section className="jj-card"><h3>{t("Attributes from learned skills")}</h3><dl>{ATRIBUTOS.map((a) => <React.Fragment key={a}><dt>{t(a)}</dt><dd>{10 + daArvore[a]}</dd></React.Fragment>)}</dl><p className="jj-note">{t("Base 10 + learned skill nodes. Equipment and Flame-level bonuses are calculated by the game{v0}.", {v0: (Object.values(porChama).some(Boolean) ? t("; this character has Flame-dependent nodes") : '')})}</p></section>
    <section className="jj-card jj-full"><h3>{t("Save details")}</h3><dl><dt>{t("Path")}</dt><dd className="jj-path">{model.path}</dd><dt>{t("Inventory entries")}</dt><dd>{model.main.length + model.extra.length}</dd><dt>{t("Equipped pieces")}</dt><dd>{model.equipment.length}</dd><dt>{t("Learned skill nodes")}</dt><dd>{model.skills.filter((s) => s.level > 0).length}</dd><dt>{t("Knowledge entries")}</dt><dd>{model.knowledge?.length ?? (t("Unavailable"))}</dd></dl></section></div></>;
}

export function SkillsPanel({ model, onChange, ask }) {
  const [q, setQ] = useState(''), [group, setGroup] = useState('all'), [learned, setLearned] = useState(false), [selected, setSelected] = useState(null), [total, setTotal] = useState(() => knownTotal(model));
  const [sort, onSort] = useSort();
  const levels = new Map(model.skills.map((s) => [s.id, s.level]));
  const all = Object.entries(skills.nodes).filter(([, n]) => n.type !== 'Root').map(([id, n]) => ({ key: id, id: Number(id), name: skillName(id), group: n.class, type: n.type.replace(/Skill$/, ''), cost: n.cost, rank: levels.get(Number(id)) || 0, maxRank: n.maxLevel || 1, node: n }));
  const rows = all.filter((r) => `${r.name} ${r.id}`.toLowerCase().includes(q.toLowerCase()) && (group === 'all' || r.group === group) && (!learned || r.rank > 0)).sort((a, b) => compareRows(a, b, sort.key, sort.direction));
  const picked = all.find((r) => r.key === selected), validation = checkTree(model), used = pointsUsed(model.skills);
  const setRank = (rank) => {
    const list = model.skills.some((s) => s.id === picked.id) ? model.skills.map((s) => s.id === picked.id ? { ...s, level: rank } : s) : [...model.skills, { id: picked.id, level: rank }];
    onChange({ ...model, skills: list });
  };
  return <><div className="jj-panel-toolbar"><div><h2>{t("Skills")}</h2><span className="jj-muted">{tn("{v0} point used{v1}", "{v0} points used{v1}", used, {v0: (used), v1: (total !== null ? tn(" · {v0} point available", " · {v0} available", total - used, {v0: total - used}) : t(" · total not set"))})}</span></div><span className="jj-spacer" /><label className="jj-inline-label">{t("Total points shown in game")} <input aria-label={t("Total skill points")} type="number" min="0" value={total ?? ''} placeholder={t("Unknown")} onChange={(e) => { const v = e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value)) || 0); setTotal(v); try { v === null ? localStorage.removeItem(totalKey(model)) : localStorage.setItem(totalKey(model), String(v)); } catch {} }} /></label><Button danger onClick={async () => { if (await ask(t("Refund all skills?"), t("All learned skill ranks will be set to zero. The change is reversible with Undo before saving."), t("Refund all"))) onChange({ ...model, skills: model.skills.map((s) => ({ ...s, level: 0 })) }); }}>{t("Refund all")}</Button></div>
    <div className="jj-filterbar"><input aria-label={t("Filter skills")} placeholder={t("Search skills…")} value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label={t("Skill class")} value={group} onChange={(e) => setGroup(e.target.value)}><option value="all">{t("All classes")}</option>{[...new Set(all.map((r) => r.group))].sort().map((g) => <option key={g} value={g}>{t(g)}</option>)}</select><label className="jj-check"><input type="checkbox" checked={learned} onChange={(e) => setLearned(e.target.checked)} />{t("Learned only")}</label></div>
    <div className="jj-split"><DataTable rows={rows} selected={selected} onSelect={(r) => setSelected(r.key)} sort={sort} onSort={onSort} columns={[{ key: 'name', label: t("Skill") }, { key: 'group', label: t("Class"), width: 95 }, { key: 'type', label: t("Type"), width: 95 }, { key: 'cost', label: t("Cost"), width: 55 }, { key: 'rank', label: t("Rank"), width: 65, render: (r) => `${r.rank}/${r.maxRank}` }]} />
      <aside className="jj-inspector">{picked ? <><span className="jj-eyebrow">{t(picked.group)} · {t(picked.type)}</span><h2>{picked.name}</h2><p className="jj-description">{descricaoDe(picked.node)}</p><NumberField label={t("Learned rank")} min={0} max={picked.maxRank} value={picked.rank} onChange={setRank} /><p className="jj-note">{tn("{v0} point per rank. Prerequisite paths and the point budget are checked before saving.", "{v0} points per rank. Prerequisite paths and the point budget are checked before saving.", picked.cost, {v0: (picked.cost)})}</p></> : <Empty icon="skills" title={t("Select a skill")}>{t("Inspect its description and change its learned rank.")}</Empty>}
        <div className="jj-stats-section"><h3>{t("Tree validation")}</h3>{validation.problems.length ? <ul className="jj-validation">{validation.problems.map((p) => <li key={p}>{p}</li>)}</ul> : <p className="jj-note success">{t("Connected paths and rank limits pass.")}</p>}<p className="jj-note">{t("Enter the total points your game shows before increasing the points in use. The save does not contain the complete world-dependent budget.")}</p></div>
      </aside></div></>;
}

export function KnowledgePanel({ model, onChange, ask }) {
  const [q, setQ] = useState(''), [kind, setKind] = useState('all'), [selected, setSelected] = useState(new Set()), [page, setPage] = useState(0);
  const [sort, onSort] = useSort();
  const rows = (model.knowledge || []).map((entry) => ({ key: entry.id, name: nomeConhecimento(knowledgeMap[entry.id], entry.id), kind: { i: 'Item', r: 'Recipe' }[knowledgeMap[entry.id]?.t] || 'Other', level: knowledgeMap[entry.id]?.l || 0, state: estadoTexto(entry.value, knowledgeMap[entry.id]?.t).split('+').map(t).join(' + '), value: entry.value }));
  const filtered = rows.filter((r) => `${r.name} ${r.key}`.toLowerCase().includes(q.toLowerCase()) && (kind === 'all' || r.kind === kind)).sort((a, b) => compareRows(a, b, sort.key, sort.direction));
  useEffect(() => setPage(0), [q, kind, sort]);
  if (!model.knowledge) return <Empty icon="knowledge" title={t("Knowledge unavailable")}>{t("This save does not contain a readable knowledge block.")}</Empty>;
  return <><div className="jj-panel-toolbar"><div><h2>{t("Knowledge")}</h2><span className="jj-muted">{t("Discoveries and recipe knowledge")}</span></div><span className="jj-spacer" /><Button icon="trash" danger disabled={!selected.size} onClick={async () => { if (await ask(t("Remove knowledge?"), t("Remove {v0} selected entries? Dependent recipes may become unavailable in the game.", {v0: selected.size}), t("Remove entries"))) { onChange({ ...model, knowledge: model.knowledge.filter((k) => !selected.has(k.id)) }); setSelected(new Set()); } }}>{t("Remove selected ({v0})", {v0: (selected.size)})}</Button></div>
    <div className="jj-filterbar"><input aria-label={t("Filter knowledge")} placeholder={t("Search discoveries by name or ID…")} value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label={t("Knowledge type")} value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">{t("All types")}</option>{['Item', 'Recipe', 'Other'].map((k) => <option key={k} value={k}>{t(k)}</option>)}</select><span className="jj-muted">{tn("{v0} of {v1} entry", "{v0} of {v1} entries", rows.length, {v0: (filtered.length.toLocaleString(localeAtual())), v1: (rows.length.toLocaleString(localeAtual()))})}</span></div>
    <DataTable rows={filtered.slice(page * 100, (page + 1) * 100)} onSelect={(r) => setSelected((s) => { const n = new Set(s); n.has(r.key) ? n.delete(r.key) : n.add(r.key); return n; })} sort={sort} onSort={onSort} columns={[{ key: 'checked', label: '', noSort: true, width: 38, render: (r) => <input aria-label={t("Select {v0}", {v0: r.name})} type="checkbox" checked={selected.has(r.key)} onClick={(e) => e.stopPropagation()} onChange={() => setSelected((s) => { const n = new Set(s); n.has(r.key) ? n.delete(r.key) : n.add(r.key); return n; })} /> }, { key: 'name', label: t("Discovery") }, { key: 'kind', label: t("Type"), width: 95 }, { key: 'level', label: t("Level"), width: 65 }, { key: 'state', label: t("State"), width: 170 }, { key: 'key', label: 'ID', width: 110 }]} />
    <div className="jj-table-footer"><span className="jj-muted">{t("Page {v0} / {v1}", {v0: (page + 1), v1: (Math.max(1, Math.ceil(filtered.length / 100)))})}</span><Button disabled={page === 0} onClick={() => setPage(page - 1)}>{t("Previous")}</Button><Button disabled={(page + 1) * 100 >= filtered.length} onClick={() => setPage(page + 1)}>{t("Next")}</Button><span className="jj-spacer" /><span className="jj-muted">{t("Recipe availability is recalculated by the game.")}</span></div></>;
}

export function ServerPanel({ refresh, report }) {
  const [cfg, setCfg] = useState(null), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { api?.serverConfig().then(setCfg).catch(report); }, []);
  useEffect(() => setMessage(''), [idiomaAtual()]);
  const action = async (fn) => { setBusy(true); try { await fn(); } catch (e) { report(e); } finally { setBusy(false); } };
  if (!cfg) return <Empty icon="server" title={t("Server configuration")}>{t("Open the desktop editor to configure server access.")}</Empty>;
  return <><div className="jj-panel-toolbar"><div><h2>{t("Dedicated server")}</h2><span className="jj-muted">{t("Optional · Enshrouded Server Guardian integration")}</span></div></div><div className="jj-server-content"><section className="jj-card"><h3>{t("SFTP connection")}</h3><p className="jj-note">{t("Use the SFTP details from your host. Server characters appear alongside your local characters after connecting.")}</p><fieldset disabled={busy || IS_PREVIEW}><div className="jj-properties">
    {[['Host', 'host'], ['Port', 'porta'], ['Username', 'usuario'], ['Guardian folder', 'pasta'], ['Pinned server key', 'hostkey']].map(([label, key]) => <label key={key} className={`jj-field ${key === 'hostkey' ? 'jj-full' : ''}`}><span>{t(label)}</span><input type={key === 'porta' ? 'number' : 'text'} value={cfg[key] ?? ''} onChange={(e) => setCfg({ ...cfg, [key]: key === 'porta' ? Number(e.target.value) : e.target.value })} /></label>)}
    <label className="jj-field jj-full"><span>{t("Password")}</span><input type="password" autoComplete="off" value={password} placeholder={cfg.tem_senha ? t("Saved — leave blank to keep") : t("SFTP password")} onChange={(e) => setPassword(e.target.value)} /></label></div>
    <p className="jj-note warning">{t("The upstream backend stores this password in plain text on this PC. Use a server-specific account. Verify the SSH fingerprint with your host before pinning it.")}</p>
    <div className="jj-inline-actions"><Button primary icon="save" onClick={() => action(async () => { await api.setServerConfig({ host: cfg.host, porta: Number(cfg.porta) || 2022, usuario: cfg.usuario, senha: password, hostkey: cfg.hostkey || '', pasta: cfg.pasta }); setPassword(''); setCfg(await api.serverConfig()); setMessage(t("Connection settings saved.")); })}>{t("Save connection")}</Button>
      <Button disabled={!cfg.host || !cfg.usuario} onClick={() => action(async () => { const mode = await api.serverMode(); setMessage(t("Connected · Guardian mode: {v0}", {v0: t(mode === 'observar' ? 'observe' : 'enforce')})); await refresh(); })}>{t("Test saved connection")}</Button>
      <Button onClick={() => action(async () => { const key = await api.serverHostKey(); if (!key) throw new Error(t("Test the saved connection first.")); setCfg({ ...cfg, hostkey: key }); setMessage(t("Fingerprint filled. Verify it with your host, then save the connection.")); })}>{t("Use seen fingerprint")}</Button></div></fieldset>{message && <p role="status" className="jj-note success">{message}</p>}
    {IS_PREVIEW && <p className="jj-note">{t("Server connections are disabled in this sample preview.")}</p>}</section><section className="jj-card"><h3>{t("Editing server copies")}</h3><ol className="jj-instructions"><li>{t("Install Enshrouded Server Guardian on your dedicated server.")}</li><li>{t("Have each player join once so the Guardian records their character.")}</li><li>{t("Save and test the SFTP connection here, then refresh the character list.")}</li><li>{t("Edit while that player is offline. A connected player can overwrite the copy.")}</li><li>{t("Save the edit. The Guardian applies it on the player's next join.")}</li></ol><p className="jj-note">{t("Server backups are stored in Documents\\Enshrouded-Backups\\servidor.")}</p></section></div></>;
}

export function BackupsDialog({ model, ask, onClose, onRestored, report }) {
  const [rows, setRows] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { api.listBackups(model.path).then(setRows).catch((e) => { report(e); setRows([]); }); }, []);
  const restore = async (r) => {
    if (!await ask(t("Restore backup?"), t("Restore {v0}? A backup of the current on-disk save is created first. Any unsaved edits will be replaced.", {v0: r.label}), t("Restore backup"))) return;
    setBusy(true); try { await api.restoreBackup(r.path, model.path); await onRestored(); onClose(); } catch (e) { report(e); } finally { setBusy(false); }
  };
  return <Dialog title={t("Backups · {v0}", {v0: model.name})} onClose={() => { if (!busy) onClose(); }} wide><p className="jj-dialog-note">{t("The editor backs up before every save. Restore a previous version here.")}</p>{rows === null ? <p>{t("Loading backups…")}</p> : <DataTable rows={rows.map((r) => ({ ...r, key: r.path, date: new Date(r.modified).toLocaleString(localeAtual()) }))} columns={[{ key: 'date', label: t("Created"), width: 190 }, { key: 'label', label: t("Backup") }, { key: 'action', label: '', noSort: true, width: 95, render: (r) => <Button disabled={busy} onClick={() => restore(r)}>{t("Restore")}</Button> }]} empty={t("No backups found")} />}<div className="jj-dialog-actions"><Button icon="open" onClick={() => api.openBackups().catch(report)}>{t("Open backup folder")}</Button><span className="jj-spacer" /><Button disabled={busy} onClick={onClose}>{t("Close")}</Button></div></Dialog>;
}
