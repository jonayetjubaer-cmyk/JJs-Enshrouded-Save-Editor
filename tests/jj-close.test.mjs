import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mockIPC, mockWindows, clearMocks } from '@tauri-apps/api/mocks';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createCloseHandler } from '../src/close-handler.mjs';

// Exercise Tauri's actual onCloseRequested wrapper, including the IPC permission
// that was missing when the Windows close button silently stopped working.
async function harness(state, ask = async () => true) {
  globalThis.window = { crypto: globalThis.crypto };
  const capability = JSON.parse(fs.readFileSync(new URL('../src-tauri/capabilities/default.json', import.meta.url)));
  const commands = [], errors = [];
  let callback;
  mockWindows('main');
  mockIPC((command, args) => {
    if (command === 'plugin:event|listen') { callback = args.handler; return 1; }
    if (command === 'plugin:window|destroy') {
      assert.ok(capability.permissions.includes('core:window:allow-destroy'), 'Tauri must be allowed to finish closing the window');
      commands.push(command);
      return;
    }
    if (command === 'plugin:event|unlisten') return;
    throw new Error(`Unexpected IPC command: ${command}`);
  });
  const unlisten = await getCurrentWindow().onCloseRequested(createCloseHandler({ getState: () => state, ask, report: (e) => errors.push(e) }));
  return { commands, errors,
    close: () => window.__TAURI_INTERNALS__.callbacks.get(callback)({ event: 'tauri://close-requested', id: 1 }),
    dispose: async () => { await unlisten(); clearMocks(); delete globalThis.window; } };
}

test('Windows close reaches Tauri destroy with a clean document', async () => {
  const h = await harness({ dirty: false, busy: false });
  try { await h.close(); assert.deepEqual(h.commands, ['plugin:window|destroy']); } finally { await h.dispose(); }
});

test('canceling unsaved changes keeps the window open, confirming closes once', async () => {
  let confirmed = false, prompts = 0;
  const h = await harness({ dirty: true, busy: false }, async () => { prompts++; return confirmed; });
  try {
    await h.close(); assert.equal(h.commands.length, 0);
    confirmed = true; await h.close();
    assert.equal(prompts, 2); assert.deepEqual(h.commands, ['plugin:window|destroy']);
  } finally { await h.dispose(); }
});

test('repeated close requests keep the pending confirmation and do not close early', async () => {
  let answer;
  const h = await harness({ dirty: true }, () => new Promise((resolve) => { answer = resolve; }));
  try {
    const first = h.close(); await h.close(); assert.equal(h.commands.length, 0);
    answer(true); await first; assert.equal(h.commands.length, 1);
  } finally { await h.dispose(); }
});

test('closing during a file operation waits, explains why, then closes when idle', async () => {
  const state = { busy: true, dirty: false }, h = await harness(state);
  try {
    await h.close(); assert.equal(h.commands.length, 0); assert.match(h.errors[0].message, /operation to finish/);
    state.busy = false; await h.close(); assert.equal(h.commands.length, 1);
  } finally { await h.dispose(); }
});

test('a failed confirmation preserves unsaved work and reports the error', async () => {
  const h = await harness({ dirty: true }, async () => { throw new Error('Dialog failed'); });
  try { await h.close(); assert.equal(h.commands.length, 0); assert.match(h.errors[0].message, /Dialog failed/); } finally { await h.dispose(); }
});
