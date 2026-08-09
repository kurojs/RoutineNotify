export interface Routine {
  id: number
  hour: number
  minute: number
  title: string
  description: string
  icon: string
  sound: string
  enabled: boolean
  useAI: boolean
}

export type LegacyRoutine = Routine & { message?: string }

export function migrateRoutine(raw: Partial<LegacyRoutine>): Routine {
  return {
    id: raw.id ?? 0,
    hour: raw.hour ?? 9,
    minute: raw.minute ?? 0,
    title: raw.title ?? raw.message ?? '',
    description: raw.description ?? '',
    icon: raw.icon ?? '',
    sound: raw.sound ?? '',
    enabled: raw.enabled ?? true,
    useAI: raw.useAI ?? false
  }
}

export function isCustomSound(value: string): boolean {
  return value.startsWith('file:')
}

export function getCustomSoundName(value: string): string {
  return value.slice('file:'.length)
}

export interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: string
  completedAt: string | null
}

export const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Español' },
  { value: 'Japanese', label: '日本語' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Italian', label: 'Italiano' },
  { value: 'Portuguese', label: 'Português' },
  { value: 'Korean', label: '한국어' },
  { value: 'Chinese', label: '中文' }
] as const

export const UI_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'ja', label: '日本語' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' }
] as const

export type Theme = 'light' | 'dark'

export const DEFAULT_SETTINGS: Settings = {
  geminiApiKey: '',
  elevenLabsApiKey: '',
  voiceId: 'h3KZVBOooxHZiKRxnsdE',
  geminiModel: 'gemini-2.5-flash',
  language: 'English',
  uiLanguage: 'en',
  theme: 'light'
}

export interface Settings {
  geminiApiKey: string
  elevenLabsApiKey: string
  voiceId: string
  geminiModel: string
  language: string
  uiLanguage: string
  theme: Theme
}

export interface GeminiModel {
  name: string
  displayName: string
  freeTier: boolean
}

export type ServiceErrorCode =
  | 'invalid_api_key'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'model_not_found'
  | 'voice_not_found'
  | 'permission_denied'
  | 'network_error'
  | 'empty_response'
  | 'unknown'

export interface ServiceErrorInfo {
  code: ServiceErrorCode
  detail?: string
}

export interface AppData {
  routines: Routine[]
  todos: Todo[]
  settings: Settings
}

export interface IpcResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface BackupFile {
  name: string
  data: string
}

export interface BackupData {
  version: number
  exportedAt: string
  routines: Routine[]
  todos: Todo[]
  icons: BackupFile[]
  sounds: BackupFile[]
}

export interface ImportResult {
  routines: Routine[]
  todos: Todo[]
}
