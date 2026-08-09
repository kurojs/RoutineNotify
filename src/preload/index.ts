import { contextBridge, ipcRenderer } from 'electron'
import type {
  Routine,
  Todo,
  Settings,
  ImportResult,
  GeminiModel,
  ServiceErrorInfo
} from '../shared/types'

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
  listModels: (): Promise<GeminiModel[]> => ipcRenderer.invoke('ai:models'),
  cleanupTtsFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('tts:cleanup', filePath),
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:openExternal', url),
  listIcons: (): Promise<string[]> => ipcRenderer.invoke('icons:list'),
  getIconUrl: (fileName: string): Promise<string> => ipcRenderer.invoke('icons:url', fileName),
  saveIcon: (buffer: Uint8Array, fileName: string): Promise<string> =>
    ipcRenderer.invoke('icons:save', buffer, fileName),
  listSounds: (): Promise<string[]> => ipcRenderer.invoke('sounds:list'),
  getSoundPath: (fileName: string): Promise<string> =>
    ipcRenderer.invoke('sounds:path', fileName),
  saveSound: (buffer: Uint8Array, fileName: string): Promise<string> =>
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
  },
  onTtsError: (callback: (info: ServiceErrorInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: ServiceErrorInfo): void => {
      callback(info)
    }
    ipcRenderer.on('tts:error', listener)
    return () => {
      ipcRenderer.removeListener('tts:error', listener)
    }
  },
  onAiError: (callback: (info: ServiceErrorInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: ServiceErrorInfo): void => {
      callback(info)
    }
    ipcRenderer.on('ai:error', listener)
    return () => {
      ipcRenderer.removeListener('ai:error', listener)
    }
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
