import type { AppSettings, SettingsResult } from '../shared/types';

const form = document.getElementById('settings-form') as HTMLFormElement;
const shortcut = document.getElementById('shortcut') as HTMLInputElement;
const opacity = document.getElementById('opacity') as HTMLSelectElement;
const theme = document.getElementById('theme') as HTMLSelectElement;
const startup = document.getElementById('startup') as HTMLSelectElement;
const alwaysOnTop = document.getElementById('always-on-top') as HTMLInputElement;
const showNavigation = document.getElementById('show-navigation') as HTMLInputElement;
const status = document.getElementById('status')!;

for (let value = 10; value <= 100; value += 5) {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = `${value}%`;
  opacity.append(option);
}

function fill(settings: AppSettings): void {
  shortcut.value = settings.shortcut.replace('Control', 'Ctrl');
  opacity.value = String(settings.opacity);
  theme.value = settings.theme;
  startup.value = settings.startup;
  alwaysOnTop.checked = settings.alwaysOnTop;
  showNavigation.checked = settings.showNavigation;
}

function setStatus(result: SettingsResult): void {
  status.classList.toggle('success', result.ok && !result.shortcutStatus.error);
  status.textContent = result.error ?? result.shortcutStatus.error ?? (result.ok ? '已保存' : '设置未保存');
}

void window.mini.getSettings().then(result => {
  fill(result.settings);
  if (result.shortcutStatus.error) setStatus(result);
}).catch(() => { status.textContent = '设置读取失败'; });

form.addEventListener('submit', event => {
  event.preventDefault();
  void window.mini.updateSettings({
    shortcut: shortcut.value,
    opacity: Number(opacity.value),
    theme: theme.value as AppSettings['theme'],
    startup: startup.value as AppSettings['startup'],
    alwaysOnTop: alwaysOnTop.checked,
    showNavigation: showNavigation.checked
  }).then(result => {
    setStatus(result);
    if (result.ok) fill(result.settings);
  }).catch(() => { status.textContent = '设置保存失败'; });
});
