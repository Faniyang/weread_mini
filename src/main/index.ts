import {
  app, BrowserWindow, globalShortcut, ipcMain, Menu, session,
  type IpcMainInvokeEvent
} from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AppSettings, SettingsPatch, SettingsResult, ToolbarAction, ToolbarState, WindowBounds } from '../shared/types';
import { SettingsStore } from './settings';
import { normalizeShortcut, ShortcutManager } from './shortcuts';
import { createAppTray, type AppTray } from './tray';
import { createReaderWindow, type ReaderWindow } from './window';
import { showWindow, toggleWindow } from './window-state';

app.setName('WeRead Mini');
if (process.platform === 'win32') app.setAppUserModelId('com.wereadmini.reader');

let readerWindow: ReaderWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let appTray: AppTray | null = null;
let settingsStore: SettingsStore;
let shortcuts: ShortcutManager;
let isQuitting = false;
let boundsTimer: NodeJS.Timeout | null = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

function currentToolbarState(): ToolbarState {
  const settings = settingsStore.get();
  const contents = readerWindow?.reader.webContents;
  const history = contents && !contents.isDestroyed() ? contents.navigationHistory : null;
  return {
    canGoBack: history?.canGoBack() ?? false,
    canGoForward: history?.canGoForward() ?? false,
    alwaysOnTop: settings.alwaysOnTop,
    opacity: settings.opacity,
    theme: settings.theme,
    showNavigation: settings.showNavigation,
    shortcutStatus: shortcuts.getStatus()
  };
}

function notifyState(): void {
  const contents = readerWindow?.window.webContents;
  if (contents && !contents.isDestroyed()) contents.send('mini:toolbar-state', currentToolbarState());
  appTray?.refresh();
}

function settingsResult(ok: boolean, error: string | null = null): SettingsResult {
  return {
    ok,
    settings: settingsStore.get(),
    shortcutStatus: shortcuts.getStatus(),
    error
  };
}

function parsePatch(raw: unknown): Partial<SettingsPatch> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('设置内容无效');
  const input = raw as Record<string, unknown>;
  const allowed = new Set(['opacity', 'alwaysOnTop', 'shortcut', 'theme', 'startup', 'showNavigation']);
  if (Object.keys(input).some(key => !allowed.has(key))) throw new Error('设置项无效');
  const patch: Partial<SettingsPatch> = {};
  if ('opacity' in input) {
    if (typeof input.opacity !== 'number' || !Number.isInteger(input.opacity) || input.opacity < 10 || input.opacity > 100 || input.opacity % 5 !== 0) {
      throw new Error('透明度必须为 10% 到 100%，步长 5%');
    }
    patch.opacity = input.opacity;
  }
  if ('alwaysOnTop' in input) {
    if (typeof input.alwaysOnTop !== 'boolean') throw new Error('置顶设置无效');
    patch.alwaysOnTop = input.alwaysOnTop;
  }
  if ('shortcut' in input) patch.shortcut = normalizeShortcut(input.shortcut);
  if ('theme' in input) {
    if (input.theme !== 'light' && input.theme !== 'dark') throw new Error('工具栏主题无效');
    patch.theme = input.theme;
  }
  if ('startup' in input) {
    if (input.startup !== 'show' && input.startup !== 'hide') throw new Error('启动方式无效');
    patch.startup = input.startup;
  }
  if ('showNavigation' in input) {
    if (typeof input.showNavigation !== 'boolean') throw new Error('导航按钮设置无效');
    patch.showNavigation = input.showNavigation;
  }
  return patch;
}

function updateSettings(raw: unknown): SettingsResult {
  let patch: Partial<SettingsPatch>;
  try {
    patch = parsePatch(raw);
  } catch (error) {
    return settingsResult(false, error instanceof Error ? error.message : '设置内容无效');
  }
  const previous = settingsStore.get();
  const oldActive = shortcuts.getStatus().active;
  if (patch.shortcut && patch.shortcut !== previous.shortcut) {
    const status = shortcuts.activate(patch.shortcut);
    if (status.error) {
      notifyState();
      return settingsResult(false, status.error);
    }
  }
  let next: AppSettings;
  try {
    next = settingsStore.update(patch);
  } catch {
    if (shortcuts.getStatus().active !== oldActive) {
      shortcuts.dispose();
      if (oldActive) shortcuts.activate(oldActive);
    }
    notifyState();
    return settingsResult(false, '设置无法写入用户数据目录');
  }
  if (readerWindow) {
    readerWindow.window.setAlwaysOnTop(next.alwaysOnTop);
    if (process.platform === 'win32' || process.platform === 'darwin') {
      readerWindow.window.setOpacity(next.opacity / 100);
    }
  }
  notifyState();
  return settingsResult(true);
}

function saveBounds(bounds: WindowBounds): void {
  if (boundsTimer) clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    boundsTimer = null;
    try {
      settingsStore.update({ windowBounds: bounds });
    } catch {
      // This does not affect reading; a later move or resize can retry.
    }
  }, 300);
}

function flushBounds(): void {
  if (!boundsTimer || !readerWindow || readerWindow.window.isDestroyed()) return;
  clearTimeout(boundsTimer);
  boundsTimer = null;
  try {
    settingsStore.update({ windowBounds: readerWindow.window.getBounds() });
  } catch { /* Keep the last valid file. */ }
}

function canHide(): boolean {
  return Boolean(appTray || shortcuts.getStatus().active);
}

function hideReader(): void {
  const window = readerWindow?.window;
  if (!window) return;
  if (canHide()) window.hide();
  else window.minimize();
}

function showReader(): void {
  if (readerWindow) showWindow(readerWindow.window);
}

function toggleReader(): void {
  if (readerWindow) {
    if (canHide()) toggleWindow(readerWindow.window);
    else showReader();
  }
}

function showOpacityMenu(): void {
  if (!readerWindow) return;
  const opacity = settingsStore.get().opacity;
  const menu = Menu.buildFromTemplate(
    Array.from({ length: 19 }, (_, index) => {
      const value = 10 + index * 5;
      return {
        label: `${value}%`,
        type: 'radio' as const,
        checked: opacity === value,
        click: () => { updateSettings({ opacity: value }); }
      };
    })
  );
  menu.popup({ window: readerWindow.window });
}

function toolbarAction(action: ToolbarAction): void {
  if (!readerWindow) return;
  const history = readerWindow.reader.webContents.navigationHistory;
  switch (action) {
    case 'back': if (history.canGoBack()) history.goBack(); break;
    case 'forward': if (history.canGoForward()) history.goForward(); break;
    case 'reload': readerWindow.reader.webContents.reload(); break;
    case 'toggleTop': updateSettings({ alwaysOnTop: !settingsStore.get().alwaysOnTop }); break;
    case 'opacityMenu': showOpacityMenu(); break;
    case 'minimize': readerWindow.window.minimize(); break;
    case 'hide': hideReader(); break;
  }
  notifyState();
}

function openSettings(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    showWindow(settingsWindow);
    return;
  }
  const filename = join(app.getAppPath(), 'dist', 'renderer', 'settings.html');
  const url = pathToFileURL(filename).href;
  settingsWindow = new BrowserWindow({
    title: 'WeRead Mini 设置',
    width: 380,
    height: 390,
    minWidth: 380,
    minHeight: 390,
    maximizable: false,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f8f7',
    icon: join(app.getAppPath(), 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: join(app.getAppPath(), 'dist', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.webContents.on('will-navigate', event => {
    if (event.url !== url) event.preventDefault();
  });
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  settingsWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  settingsWindow.once('ready-to-show', () => settingsWindow?.show());
  settingsWindow.on('closed', () => { settingsWindow = null; });
  void settingsWindow.loadFile(filename);
}

function trustedSender(event: IpcMainInvokeEvent, kind: 'toolbar' | 'settings'): boolean {
  const window = kind === 'toolbar' ? readerWindow?.window : settingsWindow;
  if (!window || window.isDestroyed()) return false;
  const filename = join(app.getAppPath(), 'dist', 'renderer', kind === 'toolbar' ? 'toolbar.html' : 'settings.html');
  return event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url === pathToFileURL(filename).href;
}

function installIpc(): void {
  ipcMain.handle('mini:get-toolbar-state', event => {
    if (!trustedSender(event, 'toolbar')) throw new Error('未授权的页面');
    return currentToolbarState();
  });
  ipcMain.handle('mini:toolbar-action', (event, action: unknown) => {
    if (!trustedSender(event, 'toolbar')) throw new Error('未授权的页面');
    const allowed = new Set<ToolbarAction>(['back', 'forward', 'reload', 'toggleTop', 'opacityMenu', 'minimize', 'hide']);
    if (typeof action !== 'string' || !allowed.has(action as ToolbarAction)) throw new Error('无效操作');
    toolbarAction(action as ToolbarAction);
  });
  ipcMain.handle('mini:get-settings', event => {
    if (!trustedSender(event, 'settings')) throw new Error('未授权的页面');
    return settingsResult(true);
  });
  ipcMain.handle('mini:update-settings', (event, patch: unknown) => {
    if (!trustedSender(event, 'settings')) throw new Error('未授权的页面');
    return updateSettings(patch);
  });
}

if (hasSingleInstanceLock) {
  app.on('second-instance', () => showReader());
  app.on('before-quit', () => {
    isQuitting = true;
    flushBounds();
    shortcuts?.dispose();
  });
  app.on('window-all-closed', () => {
    if (!appTray) app.quit();
  });
  app.on('will-quit', () => {
    appTray?.tray.destroy();
    appTray = null;
  });

  void app.whenReady().then(() => {
    settingsStore = new SettingsStore(app.getPath('userData'));
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.fromPartition('persist:weread').setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    shortcuts = new ShortcutManager(globalShortcut, toggleReader);
    const initial = settingsStore.get();
    readerWindow = createReaderWindow(initial, saveBounds, notifyState);
    readerWindow.window.on('close', event => {
      if (!isQuitting && appTray) {
        event.preventDefault();
        hideReader();
      }
    });
    installIpc();
    shortcuts.activate(initial.shortcut);
    try {
      appTray = createAppTray({
        show: showReader,
        hide: hideReader,
        toggleTop: () => { updateSettings({ alwaysOnTop: !settingsStore.get().alwaysOnTop }); },
        openSettings,
        quit: () => app.quit(),
        isAlwaysOnTop: () => settingsStore.get().alwaysOnTop,
        shortcutError: () => shortcuts.getStatus().error
      });
    } catch {
      appTray = null;
      console.error('系统托盘创建失败，窗口将保持可见');
    }
    if (initial.startup === 'show' || !appTray) showReader();
    notifyState();
  }).catch(error => {
    console.error('WeRead Mini 启动失败：', error instanceof Error ? error.message : '未知错误');
    app.quit();
  });
}
