import { app, Menu, Tray } from 'electron';
import { join } from 'node:path';

export interface TrayActions {
  show(): void;
  hide(): void;
  toggleTop(): void;
  openSettings(): void;
  quit(): void;
  isAlwaysOnTop(): boolean;
  shortcutError(): string | null;
}

export interface AppTray {
  tray: Tray;
  refresh(): void;
}

export function createAppTray(actions: TrayActions): AppTray {
  const icon = join(app.getAppPath(), 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  const tray = new Tray(icon);
  const refresh = (): void => {
    const error = actions.shortcutError();
    tray.setToolTip(error ? `WeRead Mini · ${error}` : 'WeRead Mini');
    const menu = Menu.buildFromTemplate([
      { label: '显示阅读器', click: actions.show },
      { label: '隐藏阅读器', click: actions.hide },
      { type: 'separator' },
      { label: '始终置顶', type: 'checkbox', checked: actions.isAlwaysOnTop(), click: actions.toggleTop },
      { label: '设置', click: actions.openSettings },
      ...(error ? [{ label: `快捷键不可用：${error}`, enabled: false } as const] : []),
      { type: 'separator' },
      { label: '退出程序', click: actions.quit }
    ]);
    tray.setContextMenu(menu);
  };
  tray.on('double-click', actions.show);
  refresh();
  return { tray, refresh };
}
