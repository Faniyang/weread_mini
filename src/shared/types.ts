export type ToolbarTheme = 'light' | 'dark';
export type StartupMode = 'show' | 'hide';

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface AppSettings {
  windowBounds: WindowBounds;
  opacity: number;
  alwaysOnTop: boolean;
  shortcut: string;
  theme: ToolbarTheme;
  startup: StartupMode;
  showNavigation: boolean;
}

export interface ShortcutStatus {
  active: string | null;
  error: string | null;
}

export interface ToolbarState {
  canGoBack: boolean;
  canGoForward: boolean;
  alwaysOnTop: boolean;
  opacity: number;
  theme: ToolbarTheme;
  showNavigation: boolean;
  shortcutStatus: ShortcutStatus;
}

export type ToolbarAction =
  | 'back'
  | 'forward'
  | 'reload'
  | 'toggleTop'
  | 'opacityMenu'
  | 'minimize'
  | 'hide';

export type SettingsPatch = Pick<AppSettings, 'opacity' | 'alwaysOnTop' | 'shortcut' | 'theme' | 'startup' | 'showNavigation'>;

export interface SettingsResult {
  ok: boolean;
  settings: AppSettings;
  shortcutStatus: ShortcutStatus;
  error: string | null;
}

export interface MiniApi {
  getToolbarState(): Promise<ToolbarState>;
  toolbarAction(action: ToolbarAction): Promise<void>;
  onToolbarState(callback: (state: ToolbarState) => void): () => void;
  getSettings(): Promise<SettingsResult>;
  updateSettings(patch: SettingsPatch): Promise<SettingsResult>;
}

declare global {
  interface Window {
    mini: MiniApi;
  }
}
