import { useEffect, useRef, useState } from 'react'
import { CalendarClock, ListTodo, Settings2, Sparkles, Info } from 'lucide-react'
import { useStore } from './store'
import { RoutinesTab } from './components/RoutinesTab'
import { TodosTab } from './components/TodosTab'
import { SettingsTab } from './components/SettingsTab'
import { AboutTab } from './components/AboutTab'
import { cn } from './lib/utils'
import { getTranslation, translate, type TranslationKey } from './lib/i18n'
import type { ServiceErrorCode } from '../../shared/types'

type Tab = 'routines' | 'todos' | 'settings' | 'about'

const ERROR_KEYS: Record<ServiceErrorCode, TranslationKey> = {
  invalid_api_key: 'errInvalidKey',
  quota_exceeded: 'errQuotaExceeded',
  rate_limited: 'errRateLimited',
  model_not_found: 'errModelNotFound',
  voice_not_found: 'errVoiceNotFound',
  permission_denied: 'errPermissionDenied',
  network_error: 'errNetworkError',
  empty_response: 'errEmptyResponse',
  unknown: 'errUnknown'
}

function serviceErrorText(
  uiLanguage: string,
  code: ServiceErrorCode | string,
  detail?: string
): string {
  const key = ERROR_KEYS[code as ServiceErrorCode]
  if (key) return translate(uiLanguage, key)
  return detail ?? translate(uiLanguage, 'errUnknown')
}

function App(): React.JSX.Element {
  const load = useStore((s) => s.load)
  const loading = useStore((s) => s.loading)
  const settings = useStore((s) => s.settings)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioQueueRef = useRef<Array<{ filePath: string; cleanup: boolean; url: string }>>([])
  const audioPlayingRef = useRef(false)
  const [tab, setTab] = useState<Tab>('routines')
  const [serviceError, setServiceError] = useState<{ source: 'TTS' | 'AI'; message: string } | null>(null)

  const t = getTranslation(settings.uiLanguage)
  const tKey = (key: TranslationKey): string => t[key]

  useEffect(() => {
    void load()

    const playNext = (): void => {
      const audio = audioRef.current
      const next = audioQueueRef.current.shift()
      if (!next) {
        audioPlayingRef.current = false
        return
      }
      if (!audio) {
        audioQueueRef.current.unshift(next)
        return
      }
      audioPlayingRef.current = true
      audio.onended = () => {
        if (next.cleanup) {
          void window.api.cleanupTtsFile(next.filePath)
        }
        playNext()
      }
      audio.onerror = () => {
        console.error('Audio element error')
        setServiceError({
          source: 'TTS',
          message: serviceErrorText(useStore.getState().settings.uiLanguage, 'empty_response')
        })
        window.setTimeout(() => setServiceError(null), 8000)
        playNext()
      }
      audio.src = next.url
      void audio.play().catch((error: unknown) => {
        console.error('Audio playback failed:', error)
        playNext()
      })
    }

    const unsubscribe = window.api.onAudioPlay((payload) => {
      audioQueueRef.current.push(payload)
      if (!audioPlayingRef.current) {
        playNext()
      }
    })
    const unsubscribeError = window.api.onTtsError((info) => {
      console.error('TTS error:', info)
      setServiceError({ source: 'TTS', message: serviceErrorText(settings.uiLanguage, info.code, info.detail) })
      window.setTimeout(() => setServiceError(null), 8000)
    })
    const unsubscribeAiError = window.api.onAiError((info) => {
      console.error('AI error:', info)
      setServiceError({ source: 'AI', message: serviceErrorText(settings.uiLanguage, info.code, info.detail) })
      window.setTimeout(() => setServiceError(null), 8000)
    })
    return () => {
      unsubscribe()
      unsubscribeError()
      unsubscribeAiError()
    }
  }, [load])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Sparkles className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  const navItems: Array<{ id: Tab; label: TranslationKey; icon: typeof CalendarClock }> = [
    { id: 'routines', label: 'navRoutines', icon: CalendarClock },
    { id: 'todos', label: 'navTasks', icon: ListTodo },
    { id: 'settings', label: 'navSettings', icon: Settings2 }
  ]

  return (
    <div className="flex h-screen bg-background">
      <audio ref={audioRef} className="hidden" />
      {serviceError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg">
          <p className="font-medium">{serviceError.source}</p>
          <p className="mt-1 text-destructive/90">{serviceError.message}</p>
        </div>
      )}
      <aside className="flex w-56 flex-col border-r bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#74AA9C] to-[#4E8576] shadow-lg shadow-[#74AA9C]/25">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight tracking-tight">
              RoutineNotify
            </h1>
            <p className="truncate text-xs text-muted-foreground">{tKey('appSubtitle')}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  tab === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tKey(item.label)}
              </button>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <button
            onClick={() => setTab('about')}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              tab === 'about'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Info className="h-4 w-4" />
            {tKey('navAbout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-8">
          {tab === 'routines' && <RoutinesTab />}
          {tab === 'todos' && <TodosTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </main>
    </div>
  )
}

export default App
