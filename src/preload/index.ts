import { contextBridge, ipcRenderer } from 'electron';
import type { MiniApi, SettingsPatch, SettingsResult, ToolbarAction, ToolbarState } from '../shared/types';

const api: MiniApi = {
  getToolbarState: () => ipcRenderer.invoke('mini:get-toolbar-state') as Promise<ToolbarState>,
  toolbarAction: (action: ToolbarAction) => ipcRenderer.invoke('mini:toolbar-action', action) as Promise<void>,
  onToolbarState: (callback: (state: ToolbarState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: ToolbarState): void => callback(state);
    ipcRenderer.on('mini:toolbar-state', listener);
    return () => ipcRenderer.removeListener('mini:toolbar-state', listener);
  },
  getSettings: () => ipcRenderer.invoke('mini:get-settings') as Promise<SettingsResult>,
  updateSettings: (patch: SettingsPatch) => ipcRenderer.invoke('mini:update-settings', patch) as Promise<SettingsResult>
};

contextBridge.exposeInMainWorld('mini', api);
