import type { Routine, Todo, Settings, ImportResult } from '../shared/types'

declare global {
  interface Window {
    api: {
      getRoutines: () => Promise<Routine[]>
      saveRoutines: (routines: Routine[]) => Promise<boolean>
      testRoutine: (routine: Routine) => Promise<boolean>
      exportRoutines: () => Promise<boolean>
      importRoutines: () => Promise<ImportResult | null>
      getTodos: () => Promise<Todo[]>
      saveTodos: (todos: Todo[]) => Promise<boolean>
      getSettings: () => Promise<Settings>
      saveSettings: (settings: Settings) => Promise<boolean>
      cleanupTtsFile: (filePath: string) => Promise<boolean>
      openExternal: (url: string) => Promise<boolean>
      listIcons: () => Promise<string[]>
      getIconUrl: (fileName: string) => Promise<string>
      saveIcon: (buffer: Buffer, fileName: string) => Promise<string>
      listSounds: () => Promise<string[]>
      getSoundPath: (fileName: string) => Promise<string>
      saveSound: (buffer: Buffer, fileName: string) => Promise<string>
      onAudioPlay: (
        callback: (payload: { filePath: string; cleanup: boolean; url: string }) => void
      ) => () => void
    }
  }
}

export {}
