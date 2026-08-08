import { contextBridge, ipcRenderer } from 'electron'
import type { Routine, Todo, Settings, ImportResult } from '../shared/types'

const api = {
  getRoutines: (): Promise<Routine[]> => ipcRenderer.invoke('routines:get'),
  saveRoutines: (routines: Routine[]): Promise<boolean> =>
    ipcRenderer.invoke('routines:save', routines),
  testRoutine: (routine: Routine): Promise<boolean> =>
    ipcRenderer.invoke('routines:test', routine),
  exportRoutines: (): Promise<boolean> => ipcRenderer.invoke('routines:export'),
  importRoutines: (): Promise<ImportResult | null> => ipcRenderer.invoke('routines:import'),
  getTodos: (): Promise<Todo[]> => ipcRenderer.invoke('todos:get'),
  saveTodos: (todos: Todo[]): Promise<boolean> => ipcRenderer.invoke('todos:save', todos),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings): Promise<boolean> =>
    ipcRenderer.invoke('settings:save', settings),
  cleanupTtsFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('tts:cleanup', filePath),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:openExternal', url),
  listIcons: (): Promise<string[]> => ipcRenderer.invoke('icons:list'),
  getIconUrl: (fileName: string): Promise<string> => ipcRenderer.invoke('icons:url', fileName),
  saveIcon: (buffer: Buffer, fileName: string): Promise<string> =>
    ipcRenderer.invoke('icons:save', buffer, fileName),
  listSounds: (): Promise<string[]> => ipcRenderer.invoke('sounds:list'),
  getSoundPath: (fileName: string): Promise<string> =>
    ipcRenderer.invoke('sounds:path', fileName),
  saveSound: (buffer: Buffer, fileName: string): Promise<string> =>
    ipcRenderer.invoke('sounds:save', buffer, fileName),
  onAudioPlay: (
    callback: (payload: { filePath: string; cleanup: boolean; url: string }) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: { filePath: string; cleanup: boolean; url: string }
    ): void => {
      callback(payload)
    }
    ipcRenderer.on('audio:play', listener)
    return () => {
      ipcRenderer.removeListener('audio:play', listener)
    }
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
