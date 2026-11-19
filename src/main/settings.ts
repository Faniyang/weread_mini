import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AppSettings, WindowBounds } from '../shared/types';
import { normalizeShortcut } from './shortcuts';

export const DEFAULT_SETTINGS: AppSettings = {
  windowBounds: { width: 420, height: 640 },
  opacity: 90,
  alwaysOnTop: false,
  shortcut: 'Alt+Q',
  theme: 'light',
  startup: 'show',
  showNavigation: true
};

function integerBetween(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

export function sanitizeWindowBounds(value: unknown): WindowBounds {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS.windowBounds };
  const input = value as Record<string, unknown>;
  const bounds: WindowBounds = {
    width: integerBetween(input.width, 320, 8192, 420),
    height: integerBetween(input.height, 400, 8192, 640)
  };
  if (typeof input.x === 'number' && Number.isInteger(input.x) && Math.abs(input.x) <= 100000 &&
      typeof input.y === 'number' && Number.isInteger(input.y) && Math.abs(input.y) <= 100000) {
    bounds.x = input.x;
    bounds.y = input.y;
  }
  return bounds;
}

export function sanitizeSettings(value: unknown): AppSettings {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  let shortcut = DEFAULT_SETTINGS.shortcut;
  try {
    shortcut = normalizeShortcut(input.shortcut);
  } catch { /* An invalid saved accelerator must not prevent startup. */ }
  const opacity = integerBetween(input.opacity, 10, 100, 90);
  return {
    windowBounds: sanitizeWindowBounds(input.windowBounds),
    opacity: opacity % 5 === 0 ? opacity : 90,
    alwaysOnTop: typeof input.alwaysOnTop === 'boolean' ? input.alwaysOnTop : false,
    shortcut,
    theme: input.theme === 'dark' ? 'dark' : 'light',
    startup: input.startup === 'hide' ? 'hide' : 'show',
    showNavigation: typeof input.showNavigation === 'boolean' ? input.showNavigation : true
  };
}

export class SettingsStore {
  private readonly filename: string;
  private data: AppSettings;

  constructor(directory: string) {
    this.filename = join(directory, 'settings.json');
    try {
      this.data = sanitizeSettings(JSON.parse(readFileSync(this.filename, 'utf8')));
    } catch {
      this.data = sanitizeSettings(DEFAULT_SETTINGS);
    }
  }

  get(): AppSettings {
    return structuredClone(this.data);
  }

  update(patch: Partial<AppSettings>): AppSettings {
    const next = sanitizeSettings({ ...this.data, ...patch });
    const temporary = `${this.filename}.tmp`;
    mkdirSync(dirname(this.filename), { recursive: true });
    try {
      writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      renameSync(temporary, this.filename);
    } catch (error) {
      if (existsSync(temporary)) rmSync(temporary, { force: true });
      throw error;
    }
    this.data = next;
    return this.get();
  }
}
