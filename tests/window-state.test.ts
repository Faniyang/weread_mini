import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreBounds, toggleWindow, type VisibilityWindow } from '../src/main/window-state';

test('a window saved on a removed monitor returns to the primary work area', () => {
  assert.deepEqual(
    restoreBounds({ x: 9000, y: 9000, width: 420, height: 640 }, [{ x: 0, y: 0, width: 1200, height: 800 }]),
    { x: 390, y: 80, width: 420, height: 640 }
  );
});

test('hide and restore reuse the same window and its page', () => {
  const page = { book: 'current', position: 42 };
  const state = { visible: true, minimized: false, page, focused: false };
  const window: VisibilityWindow = {
    isVisible: () => state.visible,
    isMinimized: () => state.minimized,
    hide: () => { state.visible = false; },
    restore: () => { state.minimized = false; },
    show: () => { state.visible = true; },
    focus: () => { state.focused = true; }
  };
  toggleWindow(window);
  assert.equal(state.visible, false);
  toggleWindow(window);
  assert.equal(state.visible, true);
  assert.equal(state.page, page);
  assert.equal(state.page.position, 42);
  assert.equal(state.focused, true);
});
