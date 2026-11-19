import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DEFAULT_SETTINGS, sanitizeSettings, SettingsStore } from '../src/main/settings';

test('invalid settings fall back to safe defaults', () => {
  const value = sanitizeSettings({ opacity: 41, shortcut: 'Shift+Q', windowBounds: { width: -1, height: 100 } });
  assert.equal(value.opacity, 90);
  assert.equal(value.shortcut, 'Alt+Q');
  assert.deepEqual(value.windowBounds, { width: 420, height: 640 });
  assert.equal(sanitizeSettings({ opacity: 5 }).opacity, 90);
  assert.equal(sanitizeSettings({ opacity: 10 }).opacity, 10);
});

test('settings survive reload and malformed JSON does not block startup', () => {
  const directory = mkdtempSync(join(tmpdir(), 'weread-mini-test-'));
  try {
    const store = new SettingsStore(directory);
    store.update({ opacity: 10, alwaysOnTop: true, shortcut: 'Control+Alt+Q' });
    const loaded = new SettingsStore(directory).get();
    assert.equal(loaded.opacity, 10);
    assert.equal(loaded.alwaysOnTop, true);
    assert.equal(loaded.shortcut, 'Control+Alt+Q');
    assert.equal(JSON.parse(readFileSync(join(directory, 'settings.json'), 'utf8')).opacity, 10);
    writeFileSync(join(directory, 'settings.json'), '{broken', 'utf8');
    assert.deepEqual(new SettingsStore(directory).get(), DEFAULT_SETTINGS);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
