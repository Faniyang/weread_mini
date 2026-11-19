import type { WindowBounds } from '../shared/types';

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function restoreBounds(saved: WindowBounds, areas: WorkArea[]): WindowBounds {
  const area = areas[0] ?? { x: 0, y: 0, width: 1920, height: 1080 };
  const width = Math.max(320, Math.min(saved.width, area.width));
  const height = Math.max(400, Math.min(saved.height, area.height));
  if (saved.x !== undefined && saved.y !== undefined) {
    const visible = areas.some(item =>
      saved.x! + width >= item.x + 80 && saved.x! <= item.x + item.width - 80 &&
      saved.y! + height >= item.y + 80 && saved.y! <= item.y + item.height - 80
    );
    if (visible) return { x: saved.x, y: saved.y, width, height };
  }
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width,
    height
  };
}

export interface VisibilityWindow {
  isVisible(): boolean;
  isMinimized(): boolean;
  hide(): void;
  restore(): void;
  show(): void;
  focus(): void;
}

export function showWindow(window: VisibilityWindow): void {
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

export function toggleWindow(window: VisibilityWindow): void {
  if (window.isVisible() && !window.isMinimized()) window.hide();
  else showWindow(window);
}
