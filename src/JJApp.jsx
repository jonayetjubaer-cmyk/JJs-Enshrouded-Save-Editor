import { t, tn, IDIOMAS, displayError } from './i18n.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createCloseHandler } from './close-handler.mjs';
import { api, IS_PREVIEW, IS_TAURI } from './platform.js';
import { checkTree, pointsUsed } from './treecheck.js';
import { assinarIdioma, definirIdioma, idiomaAtual } from './i18n.js';
import licenseText from '../LICENSE?raw';
import { Icon, Button, Dialog, Empty, InventoryPanel, CharacterPanel, SkillsPanel, KnowledgePanel, ServerPanel, BackupsDialog } from './desktop-panels.jsx';

const VERSION = '0.2.0';
const TABS = [['character', 'Character', 'person'], ['inventory', 'Inventory', 'inventory'], ['equipment', 'Equipment', 'equipment'], ['skills', 'Skills', 'skills'], ['knowledge', 'Knowledge', 'knowledge'], ['server', 'Server', 'server']];
const clone = (value) => structuredClone(value);
const readTheme = () => { try { return localStorage.getItem('jj.enshrouded.theme') || 'system'; } catch { return 'system'; } };

export default function JJApp() {
  const [saves, setSaves] = useState([]), [model, setModel] = useState(null), [original, setOriginal] = useState(null), [history, setHistory] = useState([]);
  const [tab, setTab] = useState('inventory'), [busy, setBusy] = useState(false), [running, setRunning] = useState(false), [notice, setNotice] = useState(null);
  const [theme, setTheme] = useState(readTheme), [saveFilter, setSaveFilter] = useState(''), [modal, setModal] = useState(null), [confirmation, setConfirmation] = useState(null);
  const [, setLanguageTick] = useState(0);
  const question = useRef(null), actionLock = useRef(false), live = useRef(null);
  const dirty = !!model && JSON.stringify(model) !== JSON.stringify(original);
  live.current = { model, dirty, busy };
  const ask = useCallback((title, body, confirm = t('Discard changes')) => new Promise((resolve) => {
    if (question.current) { resolve(false); return; }
    question.current = resolve; setConfirmation({ title, body, confirm });
  }), []);
  const answer = (value) => { const resolve = question.current; question.current = null; setConfirmation(null); resolve?.(value); };
  const report = useCallback((error) => setNotice({ kind: 'error', text: displayError(error) }), []);

  useEffect(() => assinarIdioma(() => { setLanguageTick((n) => n + 1); setNotice(null); }), []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme; };
    apply(); media.addEventListener('change', apply);
    try { localStorage.setItem('jj.enshrouded.theme', theme); } catch {}
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { document.title = `${dirty ? '• ' : ''}JJ's Enshrouded Save editor${model ? ` — ${model.name}` : ''}`; }, [dirty, model?.name]);

  const guarded = async (fn) => {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true);
    try { await fn(); } catch (e) { report(e); } finally { actionLock.current = false; setBusy(false); }
  };
  const refresh = async () => { if (api) { const list = await api.listSaves(); setSaves(list); return list; } return []; };
  const installModel = (next) => { setModel(next); setOriginal(clone(next)); setHistory([]); };
  const open = async (path) => {
    if (dirty && !await ask(t("Unsaved changes"), t("Discard the unsaved changes to {v0} and open another save?", {v0: model.name}))) return;
    await guarded(async () => { const next = await api.openSave(path); installModel(next); setNotice(next.error ? { kind: 'warning', text: t("Read-only: {v0}", {v0: displayError(next.error)}) } : { kind: 'success', text: t("Opened {v0}.", {v0: next.name}) }); });
  };
  const browse = async () => {
    if (!api || busy) return;
    if (dirty && !await ask(t("Unsaved changes"), t("Discard changes to {v0} if another file is opened?", {v0: model.name}))) return;
    await guarded(async () => { const path = await api.browseSave(); if (path) { const next = await api.openSave(path); installModel(next); await refresh(); setNotice(next.error ? { kind: 'warning', text: displayError(next.error) } : { kind: 'success', text: t("Opened {v0}.", {v0: next.name}) }); } });
  };
  const change = (next) => {
    if (!model || model.readOnly || busy || JSON.stringify(next) === JSON.stringify(model)) return;
    setHistory((h) => [...h.slice(-49), clone(model)]); setModel(next); setNotice(null);
  };
  const undo = () => { if (history.length && !busy) { setModel(history.at(-1)); setHistory((h) => h.slice(0, -1)); setNotice(null); } };
  const discard = async () => { if (dirty && await ask(t("Discard changes?"), t("Restore {v0} to the version last opened or saved?", {v0: model.name}))) { setModel(clone(original)); setHistory([]); setNotice(null); } };
  const save = async () => {
    if (!model || !dirty || model.readOnly || busy || (running && !model.servidor)) return;
    if (JSON.stringify(model.skills) !== JSON.stringify(original.skills)) {
      const validation = checkTree(model);
      if (validation.total === null && validation.used > pointsUsed(original.skills)) validation.problems.push(t('Enter the total skill points shown in the game before increasing the points in use.'));
      if (validation.problems.length) { setTab('skills'); report(new Error(t("Save blocked: {v0}", {v0: validation.problems.join(' · ')}))); return; }
    }
    await guarded(async () => { const result = await api.writeSave(model.path, model); installModel(result.model); setNotice({ kind: 'success', text: IS_PREVIEW ? t('Sample saved in memory. No game files were changed.') : t('Saved. Backup: {v0}', {v0: result.backupDir}) }); await refresh(); });
  };

  useEffect(() => {
    let active = true;
    if (!api) return;
    api.listSaves().then(async (list) => { if (!active) return; setSaves(list); if (IS_PREVIEW && list[0]) { const next = await api.openSave(list[0].path); if (active) installModel(next); } }).catch(report);
    const poll = () => api.gameRunning().then((value) => { if (active) setRunning(value); }).catch(report);
    poll(); const timer = setInterval(poll, 4000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!model?.servidor) return;
    let stopped = false, stamp = null;
    const poll = async () => {
      try { const next = await api.serverStamp(model.path); if (stopped || !next) return; if (stamp !== null && next !== stamp) setNotice({ kind: 'warning', text: t("The server copy changed. Reload it before saving; a connected player may overwrite edits.") }); stamp = next; }
      catch (e) { if (!stopped) report(e); }
    };
    poll(); const timer = setInterval(poll, 10000); return () => { stopped = true; clearInterval(timer); };
  }, [model?.path]);

  useEffect(() => {
    const keyboard = (e) => {
      if (confirmation || modal) return;
      if ((e.ctrlKey || e.metaKey) && ['o', 's', 'z'].includes(e.key.toLowerCase())) {
        if (e.key.toLowerCase() === 'z' && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        e.preventDefault(); if (e.key.toLowerCase() === 's') save(); else if (e.key.toLowerCase() === 'o') browse(); else undo();
      }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  });
  useEffect(() => {
    const prevent = (e) => { if (!IS_TAURI && (live.current?.dirty || live.current?.busy)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', prevent);
    let disposed = false, unlisten;
    if (IS_TAURI) getCurrentWindow().onCloseRequested(createCloseHandler({ getState: () => live.current, ask, report }))
      .then((fn) => { if (disposed) fn(); else unlisten = fn; }).catch(report);
    return () => { disposed = true; unlisten?.(); window.removeEventListener('beforeunload', prevent); };
  }, []);

  const enabled = !!model && !model.readOnly && !busy;
  const filteredSaves = saves.filter((s) => `${s.name} ${s.file} ${s.path}`.toLowerCase().includes(saveFilter.toLowerCase()));
  const groups = [['LOCAL SAVES', filteredSaves.filter((s) => !s.servidor)], ['SERVER CHARACTERS', filteredSaves.filter((s) => s.servidor)]];
  const content = tab === 'server' ? <ServerPanel refresh={refresh} report={report} /> : !model ? <div className="jj-welcome"><div className="jj-welcome-mark">JJ</div><h1>{t("Choose a character to get started")}</h1><p>{t("Open an Enshrouded .ksd save, or choose a character from the list.")}<br />{t("Your changes are saved only when you click Save.")}</p><Button primary icon="open" onClick={browse} disabled={!api}>{t("Open save…")}</Button><div className="jj-welcome-details"><Icon name="backup" />{t("Automatic backup before every save")}<span>·</span><Icon name="undo" />{t("Undo before saving")}</div>{!api && <p className="jj-note">{t("File access requires the Windows desktop app.")}{import.meta.env.DEV && <> <a href="?preview=1">{t("Open sample-data preview")}</a></>}</p>}</div>
    : model.readOnly ? <Empty icon="info" title={t("This character is read-only")}>{model.error ? displayError(model.error) : t("Its save format could not be read safely.")}</Empty>
    : <fieldset className="jj-editable" disabled={!enabled}>{tab === 'character' ? <CharacterPanel model={model} onChange={change} /> : tab === 'inventory' || tab === 'equipment' ? <InventoryPanel key={`${model.path}:${tab}`} model={model} onChange={change} ask={ask} report={report} equipment={tab === 'equipment'} /> : tab === 'skills' ? <SkillsPanel key={`${model.path}:${model.level}`} model={model} onChange={change} ask={ask} /> : <KnowledgePanel key={model.path} model={model} onChange={change} ask={ask} />}</fieldset>;

  return <div className="jj-app"><header className="jj-titlebar"><div className="jj-brand"><div className="jj-monogram">JJ</div><div><strong>JJ’s Enshrouded Save editor</strong><span>{t("Character & inventory editor")}</span></div></div><span className="jj-version">{t("v")}{VERSION} <span>{t("PREVIEW")}</span></span><span className="jj-spacer" />{IS_PREVIEW && <span className="jj-preview-badge">{t("Sample data · no game files")}</span>}<button className="jj-about-link" onClick={() => setModal('about')}><Icon name="info" />{t("About & credits")}</button></header>
    <div className="jj-toolbar"><Button icon="open" onClick={browse} disabled={!api || busy} title={t("Open save (Ctrl+O)")}>{t("Open…")}</Button><Button icon="save" primary onClick={save} disabled={!enabled || !dirty || (running && !model.servidor)} title={t("Save with backup (Ctrl+S)")}>{t("Save")}</Button><span className="jj-toolbar-divider" /><Button icon="undo" onClick={undo} disabled={!enabled || !history.length} title={t("Undo (Ctrl+Z)")}>{t("Undo")}</Button><Button onClick={discard} disabled={!enabled || !dirty}>{t("Discard changes")}</Button><span className="jj-toolbar-divider" /><Button icon="backup" disabled={!model || busy || model.servidor} onClick={() => setModal('backups')}>{t("Backups…")}</Button><Button icon="refresh" disabled={!api || busy} onClick={() => guarded(refresh)}>{t("Refresh saves")}</Button><span className="jj-spacer" /><label className="jj-inline-label">{t("Language")}<select data-testid="app-language" aria-label={t("Language")} value={idiomaAtual()} onChange={(e) => definirIdioma(e.target.value)}>{IDIOMAS.map((language) => <option key={language.codigo} value={language.codigo}>{language.nome}</option>)}</select></label><label className="jj-inline-label">{t("Theme")}<select aria-label={t("Theme")} value={theme} onChange={(e) => setTheme(e.target.value)}><option value="system">{t("System")}</option><option value="light">{t("Light")}</option><option value="dark">{t("Dark")}</option></select></label></div>
    <div className="jj-workspace"><aside className="jj-sidebar"><div className="jj-sidebar-heading"><h2>{t("Characters")}</h2><span>{saves.length}</span></div><div className="jj-sidebar-search"><Icon name="search" /><input aria-label={t("Find character")} placeholder={t("Find a character…")} value={saveFilter} onChange={(e) => setSaveFilter(e.target.value)} /></div><nav aria-label={t("Save files")} className="jj-save-list">{groups.map(([label, list]) => list.length > 0 && <section key={label}><h3>{t(label)}</h3>{list.map((s) => <button className={`jj-save ${model?.path === s.path ? 'active' : ''}`} key={s.path} onClick={() => open(s.path)} disabled={busy} title={s.path}><div className="jj-save-icon"><Icon name={s.servidor ? 'server' : 'person'} size={20} /></div><div><strong>{s.name || (t("Unknown character"))}</strong><span>{s.error ? t("Cannot read save") : t("Level {v0}", {v0: s.level ?? '—'})} · {s.servidor ? t("Server") : s.file}</span></div>{model?.path === s.path && <span className={`jj-save-dot ${dirty ? 'dirty' : ''}`} />}</button>)}</section>)}{!filteredSaves.length && <p className="jj-sidebar-empty">{saveFilter ? t("No matching characters.") : t("No saves found automatically. Use Open to choose your .ksd file.")}</p>}</nav><div className="jj-sidebar-bottom"><Icon name="equipment" /><div><strong>{t("Backup before save")}</strong><span>{t("Built into the save workflow")}</span></div></div></aside>
      <main className="jj-main"><div className="jj-document"><div><Icon name={model?.servidor ? 'server' : 'person'} /><strong>{model?.name || (t("No character open"))}</strong>{model && <span>{t("Level {v0}", {v0: (model.level)})}</span>}</div><span className={`jj-document-state ${dirty ? 'dirty' : ''}`}>{busy ? t("Working…") : dirty ? t("● Unsaved changes") : model ? t("✓ No pending changes") : t("Ready")}</span></div><div className="jj-tabs" role="tablist" aria-label={t("Editor sections")}>{TABS.map(([key, label, icon]) => <button key={key} role="tab" aria-selected={tab === key} aria-controls={`panel-${key}`} id={`tab-${key}`} tabIndex={tab === key ? 0 : -1} className={tab === key ? 'active' : ''} onClick={() => setTab(key)} onKeyDown={(e) => { const index = TABS.findIndex(([k]) => k === key); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0]; setTab(next); document.getElementById(`tab-${next}`)?.focus(); } }}><Icon name={icon} />{t(label)}</button>)}</div>
        {IS_PREVIEW && <div className="jj-preview-strip"><Icon name="info" />{t("Development preview. Edits and backups stay in memory.")}</div>}
        {running && model && !model.servidor && <div className="jj-alert warning"><Icon name="info" />{t("Enshrouded is running. Close the game before saving.")}</div>}
        {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`jj-alert ${notice.kind}`}><Icon name={notice.kind === 'success' ? 'check' : 'info'} /><span>{notice.text}</span><button aria-label={t("Dismiss message")} onClick={() => setNotice(null)}><Icon name="close" /></button></div>}
        <section className="jj-content" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>{content}</section></main></div>
    <footer className="jj-statusbar"><span className={`jj-status-dot ${running ? 'warning' : ''}`} /><span>{running ? t("Game running") : t("Game closed")}</span><span className="jj-status-divider" /><span className="jj-status-path" title={model?.path}>{model?.path || (t("Open a save to begin"))}</span><span className="jj-spacer" /><span>{model ? tn("{v0} inventory entry", "{v0} inventory entries", model.main.length + model.extra.length, {v0: model.main.length + model.extra.length}) : 'Enshrouded 1.0'}</span><span className="jj-status-divider" /><span>{dirty ? t("Changes pending") : t("Ready")}</span></footer>
    {modal === 'about' && <Dialog title={t("About JJ’s Enshrouded Save editor")} onClose={() => setModal(null)}><div className="jj-about"><div className="jj-monogram large">JJ</div><h2>JJ’s Enshrouded Save editor</h2><p>{t("v{v0} · JJ edition · based on upstream v1.0.2", {v0: (VERSION)})}</p><p>{t("A compact desktop interface inspired by JJ’s MW5 Merc Save Editor.")}</p><hr /><h3>{t("Credits & license")}</h3><p>{t("Original editor and save-format implementation:")}<br /><strong>Nicolas Ferreira © 2026</strong></p><p>{t("Author & publisher:")}<br /><strong>Jonaex LTD © 2026</strong></p><p>{t("Code is provided under the MIT license. The original copyright and license are retained in LICENSE.")}</p><details><summary>{t("Read the full MIT license")}</summary><pre className="jj-license">{licenseText}</pre></details><p>{t("Game artwork, icons, fonts, and game data belong to Keen Games and their respective owners. This is an unofficial fan tool.")}</p><p className="jj-muted">Upstream: github.com/nicolasferreiraxn/Enshrouded-Save-Editor</p></div><div className="jj-dialog-actions"><span className="jj-spacer" /><Button onClick={() => setModal(null)}>{t("Close")}</Button></div></Dialog>}
    {modal === 'backups' && model && <BackupsDialog model={model} ask={ask} report={report} onClose={() => setModal(null)} onRestored={async () => { installModel(await api.openSave(model.path)); await refresh(); setNotice({ kind: 'success', text: t("Backup restored. The previous on-disk save was backed up first.") }); }} />}
    {confirmation && <Dialog title={confirmation.title} onClose={() => answer(false)}><p className="jj-dialog-note">{confirmation.body}</p><div className="jj-dialog-actions"><span className="jj-spacer" /><Button onClick={() => answer(false)}>{t("Cancel")}</Button><Button danger onClick={() => answer(true)}>{t(confirmation.confirm)}</Button></div></Dialog>}
  </div>;
}
