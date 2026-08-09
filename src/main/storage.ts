import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { AppData, LegacyRoutine, Routine, Settings, Todo } from '../shared/types'
import { DEFAULT_SETTINGS as DEFAULT_SETTINGS_SHARED, migrateRoutine } from '../shared/types'

const DEFAULT_SETTINGS = DEFAULT_SETTINGS_SHARED

const DEFAULT_DATA: AppData = {
  routines: [
    {
      id: 1,
      hour: 9,
      minute: 0,
      title: 'Morning routine',
      description: '',
      icon: '',
      sound: '',
      enabled: true,
      useAI: false
    },
    {
      id: 2,
      hour: 18,
      minute: 0,
      title: 'Evening break',
      description: '',
      icon: '',
      sound: '',
      enabled: true,
      useAI: false
    }
  ],
  todos: [],
  settings: DEFAULT_SETTINGS
}

function getDataPath(): string {
  return app.getPath('userData')
}

function getRoutinesPath(): string {
  return join(getDataPath(), 'routines.json')
}

function getTodosPath(): string {
  return join(getDataPath(), 'todos.json')
}

function getSettingsPath(): string {
  return join(getDataPath(), 'settings.json')
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export async function loadRoutines(): Promise<Routine[]> {
  const routines = await readJson<LegacyRoutine[]>(getRoutinesPath(), DEFAULT_DATA.routines)
  return routines.map(migrateRoutine)
}

export async function saveRoutines(routines: Routine[]): Promise<void> {
  await writeJson(getRoutinesPath(), routines)
}

export async function loadTodos(): Promise<Todo[]> {
  return readJson<Todo[]>(getTodosPath(), DEFAULT_DATA.todos)
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await writeJson(getTodosPath(), todos)
}

export async function loadSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings> | null>(getSettingsPath(), null)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(getSettingsPath(), settings)
}

export function getCustomAssetsDir(kind: 'icons' | 'sounds'): string {
  return join(getDataPath(), `custom-${kind}`)
}
