import { create } from 'zustand'
import type { Routine, Todo, Settings } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/types'

interface AppState {
  routines: Routine[]
  todos: Todo[]
  settings: Settings
  icons: string[]
  sounds: string[]
  loading: boolean
  load: () => Promise<void>
  saveRoutines: (routines: Routine[]) => Promise<void>
  saveTodos: (todos: Todo[]) => Promise<void>
  saveSettings: (settings: Settings) => Promise<void>
  reloadIcons: () => Promise<void>
  reloadSounds: () => Promise<void>
}

export function applyTheme(theme: string): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useStore = create<AppState>((set) => ({
  routines: [],
  todos: [],
  settings: DEFAULT_SETTINGS,
  icons: [],
  sounds: [],
  loading: true,

  load: async () => {
    const [routines, todos, settings, icons, sounds] = await Promise.all([
      window.api.getRoutines(),
      window.api.getTodos(),
      window.api.getSettings(),
      window.api.listIcons(),
      window.api.listSounds()
    ])
    applyTheme(settings.theme)
    set({ routines, todos, settings, icons, sounds, loading: false })
  },

  saveRoutines: async (routines) => {
    set({ routines })
    await window.api.saveRoutines(routines)
  },

  saveTodos: async (todos) => {
    set({ todos })
    await window.api.saveTodos(todos)
  },

  saveSettings: async (settings) => {
    applyTheme(settings.theme)
    set({ settings })
    await window.api.saveSettings(settings)
  },

  reloadIcons: async () => {
    const icons = await window.api.listIcons()
    set({ icons })
  },

  reloadSounds: async () => {
    const sounds = await window.api.listSounds()
    set({ sounds })
  }
}))
