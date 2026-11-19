import type { ShortcutStatus } from '../shared/types';

export interface ShortcutBackend {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
}

const keyPattern = /^(?:[A-Z]|[0-9]|F(?:[1-9]|1[0-2]))$/;
const modifierNames: Record<string, string> = {
  CTRL: 'Control',
  CONTROL: 'Control',
  ALT: 'Alt',
  SHIFT: 'Shift'
};

export function normalizeShortcut(input: unknown): string {
  if (typeof input !== 'string' || input.length > 40) {
    throw new Error('快捷键格式无效');
  }
  const parts = input.split('+').map(part => part.trim().toUpperCase());
  if (parts.length < 2 || parts.some(part => !part)) {
    throw new Error('请输入修饰键和一个字母、数字或 F1–F12');
  }
  const key = parts.pop()!;
  if (!keyPattern.test(key)) {
    throw new Error('主键只支持字母、数字或 F1–F12');
  }
  const modifiers = new Set<string>();
  for (const part of parts) {
    const modifier = modifierNames[part];
    if (!modifier || modifiers.has(modifier)) {
      throw new Error('修饰键只能使用 Ctrl、Alt、Shift，且不能重复');
    }
    modifiers.add(modifier);
  }
  if (modifiers.size === 0 || (modifiers.size === 1 && modifiers.has('Shift'))) {
    throw new Error('快捷键需要包含 Ctrl 或 Alt');
  }
  if (modifiers.size === 1 && modifiers.has('Alt') && key === 'F4') {
    throw new Error('Alt+F4 是系统关闭窗口快捷键');
  }
  return [...['Control', 'Alt', 'Shift'].filter(item => modifiers.has(item)), key].join('+');
}

export class ShortcutManager {
  private active: string | null = null;
  private error: string | null = null;

  constructor(
    private readonly backend: ShortcutBackend,
    private readonly callback: () => void
  ) {}

  getStatus(): ShortcutStatus {
    return { active: this.active, error: this.error };
  }

  activate(raw: string): ShortcutStatus {
    let shortcut: string;
    try {
      shortcut = normalizeShortcut(raw);
    } catch (error) {
      this.error = error instanceof Error ? error.message : '快捷键格式无效';
      return this.getStatus();
    }
    if (shortcut === this.active) {
      this.error = null;
      return this.getStatus();
    }
    try {
      if (!this.backend.register(shortcut, this.callback)) {
        this.error = `${shortcut} 已被其他程序占用，请在设置中更换`;
        return this.getStatus();
      }
    } catch {
      this.error = `${shortcut} 注册失败，请在设置中更换`;
      return this.getStatus();
    }
    const previous = this.active;
    this.active = shortcut;
    this.error = null;
    if (previous) {
      try { this.backend.unregister(previous); } catch { /* Keep the new shortcut active. */ }
    }
    return this.getStatus();
  }

  dispose(): void {
    if (this.active) {
      try { this.backend.unregister(this.active); } catch { /* The app is shutting down. */ }
      this.active = null;
    }
  }
}
