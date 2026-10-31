// Development-only, explicitly selected sample data. This bridge never reads or writes game files.
import { items, skills, newEntry } from './gamedata.js';
import knowledge from '../data/conhecimento.json';

export function createPreviewApi() {
  const catalog = Object.entries(items);
  const find = (test) => Number(catalog.find(([, item]) => test(item))?.[0]);
  const bow = 1457307757, pickaxe = 3905532315, tea = 2818493303;
  const chest = find((i) => i.slot === 'Armour_UpperBody' && !/^Vanity/.test(i.debug));
  const head = find((i) => i.slot === 'Armour_Head' && !/^Vanity/.test(i.debug));
  const roots = new Set(Object.entries(skills.nodes).filter(([, n]) => n.type === 'Root').map(([id]) => Number(id)));
  const link = skills.links.find(([a, b]) => roots.has(a) && !roots.has(b));
  const path = 'preview:flameborn';
  let saved = { path, name: 'Flameborn', level: 35, xp: 12540, readOnly: false, error: null,
    equipment: [newEntry(head, 0, 1, undefined, 35), newEntry(chest, 1, 1, undefined, 35)], equipMask: (1 << 5) | (1 << 6),
    main: [newEntry(bow, 0, 1, undefined, 35), newEntry(pickaxe, 1, 1, undefined, 35), newEntry(tea, 2, 5),
      ...catalog.filter(([, i]) => i.category === 'Materials' && i.maxStack > 1).slice(0, 8).map(([id], i) => newEntry(Number(id), i + 3, i * 3 + 4))],
    extra: [], skills: link ? [{ id: link[1], level: 1 }] : [],
    knowledge: Object.keys(knowledge).slice(0, 40).map((id) => ({ id: Number(id), value: 1 })), blocks: [] };
  const backups = [];
  const copy = (value) => structuredClone(value);
  return {
    listSaves: async () => [{ path, file: 'Sample character.ksd', name: saved.name, level: saved.level, modified: Date.now() }],
    openSave: async () => copy(saved),
    browseSave: async () => path,
    gameRunning: async () => false,
    writeSave: async (_path, model) => { backups.push(copy(saved)); saved = copy(model); return { model: copy(saved), backupDir: 'Preview backup (memory only)' }; },
    listBackups: async () => backups.map((_, i) => ({ path: `sample:${i}`, label: `Sample backup ${i + 1}`, kind: 'pasta', modified: Date.now() })),
    restoreBackup: async (src) => { saved = copy(backups[Number(src.split(':')[1])]); return true; },
    openBackups: async () => {}, serverState: () => ({ configurado: false, erro: null }),
    serverConfig: async () => ({ host: '', porta: 2022, usuario: '', hostkey: '', pasta: 'guardiao-dados', tem_senha: false, configurado: false }),
    setServerConfig: async () => { throw new Error('Server connections are unavailable in the sample preview.'); },
    serverMode: async () => { throw new Error('Server connections are unavailable in the sample preview.'); },
    serverHostKey: async () => null,
  };
}
