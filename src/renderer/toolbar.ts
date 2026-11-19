import type { ToolbarAction, ToolbarState } from '../shared/types';

const actions = document.querySelectorAll<HTMLButtonElement>('button[data-action]');
const navigation = document.getElementById('navigation')!;
const warning = document.getElementById('shortcut-warning')!;

function button(action: ToolbarAction): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!;
}

function render(state: ToolbarState): void {
  document.documentElement.dataset.theme = state.theme;
  navigation.hidden = !state.showNavigation;
  button('back').disabled = !state.canGoBack;
  button('forward').disabled = !state.canGoForward;
  button('toggleTop').setAttribute('aria-pressed', String(state.alwaysOnTop));
  button('toggleTop').title = state.alwaysOnTop ? '取消始终置顶' : '始终置顶';
  button('opacityMenu').title = `透明度 ${state.opacity}%`;
  warning.classList.toggle('visible', Boolean(state.shortcutStatus.error));
  warning.title = state.shortcutStatus.error ?? '';
  button('hide').title = state.shortcutStatus.error ? `隐藏阅读器；${state.shortcutStatus.error}` : '隐藏阅读器';
}

for (const item of actions) {
  item.addEventListener('click', () => {
    void window.mini.toolbarAction(item.dataset.action as ToolbarAction);
  });
}
window.mini.onToolbarState(render);
void window.mini.getToolbarState().then(render);
