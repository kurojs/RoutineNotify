import type {
  Routine,
  Todo,
  Settings,
  ImportResult,
  GeminiModel,
  ServiceErrorInfo,
  UpdaterEvent,
  AppInfo
} from '../shared/types'

declare global {
  interface Window {
    api: {
      platform: string
      getAppInfo: () => Promise<AppInfo>
      checkForUpdates: () => Promise<{ ok: boolean }>
      downloadUpdate: () => Promise<{ ok: boolean }>
      installUpdate: () => Promise<{ ok: boolean }>
      onUpdaterEvent: (callback: (event: UpdaterEvent) => void) => () => void
      getRoutines: () => Promise<Routine[]>
      saveRoutines: (routines: Routine[]) => Promise<boolean>
      testRoutine: (routine: Routine) => Promise<boolean>
      exportRoutines: () => Promise<boolean>
      importRoutines: () => Promise<ImportResult | null>
      getTodos: () => Promise<Todo[]>
      saveTodos: (todos: Todo[]) => Promise<boolean>
      getSettings: () => Promise<Settings>
      saveSettings: (settings: Settings) => Promise<boolean>
      listModels: () => Promise<GeminiModel[]>
      cleanupTtsFile: (filePath: string) => Promise<boolean>
      openExternal: (url: string) => Promise<boolean>
      listIcons: () => Promise<string[]>
      getIconUrl: (fileName: string) => Promise<string>
      saveIcon: (buffer: Uint8Array, fileName: string) => Promise<string>
      listSounds: () => Promise<string[]>
      getSoundPath: (fileName: string) => Promise<string>
      saveSound: (buffer: Uint8Array, fileName: string) => Promise<string>
      onAudioPlay: (
        callback: (payload: { filePath: string; cleanup: boolean; url: string }) => void
      ) => () => void
      onTtsError: (callback: (info: ServiceErrorInfo) => void) => () => void
      onAiError: (callback: (info: ServiceErrorInfo) => void) => () => void
    }
  }
}

export {}
