import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeShortcut, ShortcutManager, type ShortcutBackend } from '../src/main/shortcuts';

class FakeBackend implements ShortcutBackend {
  readonly registered = new Map<string, () => void>();
  readonly blocked = new Set<string>();
  register(accelerator: string, callback: () => void): boolean {
    if (this.blocked.has(accelerator) || this.registered.has(accelerator)) return false;
    this.registered.set(accelerator, callback);
    return true;
  }
  unregister(accelerator: string): void { this.registered.delete(accelerator); }
}

test('shortcut parsing accepts the supported combinations and rejects unsafe input', () => {
  assert.equal(normalizeShortcut(' ctrl + alt + q '), 'Control+Alt+Q');
  assert.equal(normalizeShortcut('Alt+Q'), 'Alt+Q');
  assert.throws(() => normalizeShortcut('Shift+Q'));
  assert.throws(() => normalizeShortcut('Alt+F4'));
  assert.throws(() => normalizeShortcut('Ctrl+Alt+Q+R'));
});

test('a conflict keeps the previous global shortcut active', () => {
  const backend = new FakeBackend();
  let hits = 0;
  const manager = new ShortcutManager(backend, () => { hits++; });
  assert.equal(manager.activate('Alt+Q').active, 'Alt+Q');
  backend.blocked.add('Control+Alt+Q');
  const failed = manager.activate('Ctrl+Alt+Q');
  assert.equal(failed.active, 'Alt+Q');
  assert.match(failed.error ?? '', /占用/);
  backend.registered.get('Alt+Q')?.();
  assert.equal(hits, 1);
  backend.blocked.clear();
  assert.equal(manager.activate('Ctrl+Alt+Q').active, 'Control+Alt+Q');
  assert.equal(backend.registered.has('Alt+Q'), false);
  manager.dispose();
  assert.equal(backend.registered.size, 0);
});
