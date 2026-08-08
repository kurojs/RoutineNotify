import { useEffect, useRef, useState } from 'react'
import { CalendarClock, ListTodo, Settings2, Sparkles, Moon, Sun } from 'lucide-react'
import { useStore } from './store'
import { RoutinesTab } from './components/RoutinesTab'
import { TodosTab } from './components/TodosTab'
import { SettingsTab } from './components/SettingsTab'
import { cn } from './lib/utils'
import { getTranslation, type TranslationKey } from './lib/i18n'

type Tab = 'routines' | 'todos' | 'settings'

function App(): React.JSX.Element {
  const load = useStore((s) => s.load)
  const loading = useStore((s) => s.loading)
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [tab, setTab] = useState<Tab>('routines')

  const t = getTranslation(settings.uiLanguage)
  const tKey = (key: TranslationKey): string => t[key]

  useEffect(() => {
    void load()
    const unsubscribe = window.api.onAudioPlay(({ filePath, cleanup, url }) => {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      if (cleanup) {
        audioRef.current.onended = () => {
          void window.api.cleanupTtsFile(filePath)
        }
      } else {
        audioRef.current.onended = null
      }
      audioRef.current.src = url
      void audioRef.current.play()
    })
    return unsubscribe
  }, [load])

  const toggleTheme = (): void => {
    void saveSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })
  }

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
      <aside className="flex w-56 flex-col border-r bg-card/50">
        <div className="flex items-center gap-3 border-b px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
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
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {settings.theme === 'dark' ? tKey('lightMode') : tKey('darkMode')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-8">
          {tab === 'routines' && <RoutinesTab />}
          {tab === 'todos' && <TodosTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  )
}

export default App
