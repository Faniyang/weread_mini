import { BrowserWindow, shell, WebContentsView, type WebContents } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, screen } from 'electron';
import type { AppSettings, WindowBounds } from '../shared/types';
import { decideNavigation, isAuthPopupUrl } from './navigation';
import { restoreBounds } from './window-state';

export interface ReaderWindow {
  window: BrowserWindow;
  reader: WebContentsView;
  toolbarUrl: string;
}

function openSafeExternal(rawUrl: string): void {
  if (decideNavigation(rawUrl, 'auth') !== 'external') return;
  void shell.openExternal(rawUrl).catch(() => { /* The system browser may be unavailable. */ });
}

function secureRemoteContents(contents: WebContents, allowPopup: boolean): void {
  contents.on('will-navigate', event => {
    const decision = decideNavigation(event.url, 'auth');
    if (decision === 'allow') return;
    event.preventDefault();
    if (decision === 'external') openSafeExternal(event.url);
  });
  contents.on('will-redirect', event => {
    if (event.isMainFrame && decideNavigation(event.url, 'auth') !== 'allow') {
      event.preventDefault();
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (allowPopup && isAuthPopupUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          title: '微信读书登录',
          width: 440,
          height: 650,
          minWidth: 360,
          minHeight: 480,
          autoHideMenuBar: true,
          webPreferences: {
            partition: 'persist:weread',
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            webviewTag: false
          }
        }
      };
    }
    openSafeExternal(url);
    return { action: 'deny' };
  });
  contents.on('did-create-window', child => {
    secureRemoteContents(child.webContents, false);
  });
  contents.on('will-attach-webview', event => event.preventDefault());
}

export function createReaderWindow(
  settings: AppSettings,
  onBoundsChanged: (bounds: WindowBounds) => void,
  onNavigationChanged: () => void
): ReaderWindow {
  const bounds = restoreBounds(
    settings.windowBounds,
    [screen.getPrimaryDisplay().workArea, ...screen.getAllDisplays()
      .filter(display => display.id !== screen.getPrimaryDisplay().id)
      .map(display => display.workArea)]
  );
  const toolbarPath = join(app.getAppPath(), 'dist', 'renderer', 'toolbar.html');
  const toolbarUrl = pathToFileURL(toolbarPath).href;
  const window = new BrowserWindow({
    ...bounds,
    title: 'WeRead Mini',
    frame: false,
    thickFrame: true,
    hasShadow: true,
    resizable: true,
    minWidth: 320,
    minHeight: 400,
    show: false,
    backgroundColor: '#f7f8f7',
    autoHideMenuBar: true,
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
  window.setMenuBarVisibility(false);
  window.setAlwaysOnTop(settings.alwaysOnTop);
  if (process.platform === 'win32' || process.platform === 'darwin') {
    window.setOpacity(settings.opacity / 100);
  }

  const reader = new WebContentsView({
    webPreferences: {
      partition: 'persist:weread',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false
    }
  });
  window.contentView.addChildView(reader);
  const layout = (): void => {
    const [width, height] = window.getContentSize();
    reader.setBounds({ x: 0, y: 36, width, height: Math.max(0, height - 36) });
  };
  layout();
  window.on('resize', () => {
    layout();
    onBoundsChanged(window.getBounds());
  });
  window.on('move', () => onBoundsChanged(window.getBounds()));
  window.on('resized', () => onBoundsChanged(window.getBounds()));
  window.on('closed', () => {
    if (!reader.webContents.isDestroyed()) reader.webContents.close();
  });

  window.webContents.on('will-navigate', event => {
    if (event.url !== toolbarUrl) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  void window.loadFile(toolbarPath);

  secureRemoteContents(reader.webContents, true);
  reader.webContents.setZoomMode('manual');
  reader.webContents.on('zoom-changed', (event, direction) => {
    event.preventDefault();
    const oldFactor = reader.webContents.getZoomFactor();
    const next = Math.max(0.7, Math.min(1.8, Math.round((oldFactor + (direction === 'in' ? 0.1 : -0.1)) * 10) / 10));
    reader.webContents.setZoomFactor(next);
  });
  reader.webContents.on('did-navigate', onNavigationChanged);
  reader.webContents.on('did-navigate-in-page', onNavigationChanged);
  reader.webContents.on('did-finish-load', onNavigationChanged);
  void reader.webContents.loadURL('https://weread.qq.com/').catch(() => {
    // Chromium renders a normal network error page; refresh remains available.
  });

  return { window, reader, toolbarUrl };
}
