import { useEffect, useState } from 'react'
import { CalendarClock, Github, RefreshCw, Download, RotateCcw, ExternalLink } from 'lucide-react'
import { useStore } from '../store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { translate } from '../lib/i18n'
import type { AppInfo, UpdaterEvent } from '../../../shared/types'

type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'dev'

export function AboutTab(): React.JSX.Element {
  const uiLanguage = useStore((s) => s.settings.uiLanguage)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [status, setStatus] = useState<UpdaterStatus>('idle')
  const [newVersion, setNewVersion] = useState('')
  const [percent, setPercent] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    void window.api.getAppInfo().then(setInfo)

    const unsubscribe = window.api.onUpdaterEvent((event: UpdaterEvent) => {
      switch (event.type) {
        case 'checking':
          setStatus('checking')
          break
        case 'available':
          setStatus('available')
          setNewVersion(event.version)
          break
        case 'not-available':
          setStatus('not-available')
          break
        case 'downloading':
          setStatus('downloading')
          setPercent(event.percent)
          break
        case 'downloaded':
          setStatus('downloaded')
          setNewVersion(event.version)
          break
        case 'error':
          setStatus('error')
          setErrorMessage(event.message)
          break
      }
    })
    return unsubscribe
  }, [])

  const check = async (): Promise<void> => {
    const result = await window.api.checkForUpdates()
    if (!result.ok) {
      setStatus('dev')
    }
  }

  const download = (): void => {
    void window.api.downloadUpdate()
  }

  const install = (): void => {
    void window.api.installUpdate()
  }

  const openGitHub = (): void => {
    if (info) void window.api.openExternal(info.homepage)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {translate(uiLanguage, 'aboutTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translate(uiLanguage, 'aboutSubtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#74AA9C] to-[#4E8576] shadow-lg shadow-[#74AA9C]/25">
              <CalendarClock className="h-5 w-5 text-white" />
            </div>
            RoutineNotify
          </CardTitle>
          <CardDescription>
            {info ? `${translate(uiLanguage, 'aboutVersion')}: ${info.version}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void check()}
              disabled={status === 'checking' || status === 'downloading'}
            >
              <RefreshCw className={`h-4 w-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
              {translate(uiLanguage, 'checkUpdates')}
            </Button>
            {status === 'not-available' && (
              <p className="text-sm text-muted-foreground">
                {translate(uiLanguage, 'upToDate')}
              </p>
            )}
          </div>

          {status === 'checking' && (
            <p className="text-sm text-muted-foreground">
              {translate(uiLanguage, 'checkingUpdates')}
            </p>
          )}

          {status === 'dev' && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-400">
              {translate(uiLanguage, 'updaterDev')}
            </p>
          )}

          {status === 'error' && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {translate(uiLanguage, 'updaterError')}: {errorMessage}
            </p>
          )}

          {status === 'available' && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{translate(uiLanguage, 'updateAvailable')}</p>
                <p className="text-xs text-muted-foreground">v{newVersion}</p>
              </div>
              <Button onClick={download}>
                <Download className="h-4 w-4" /> {translate(uiLanguage, 'updateNow')}
              </Button>
            </div>
          )}

          {status === 'downloading' && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm">{translate(uiLanguage, 'downloadingUpdate')}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{Math.round(percent)}%</p>
            </div>
          )}

          {status === 'downloaded' && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{translate(uiLanguage, 'readyToInstall')}</p>
                <p className="text-xs text-muted-foreground">v{newVersion}</p>
              </div>
              <Button onClick={install}>
                <RotateCcw className="h-4 w-4" /> {translate(uiLanguage, 'restartToInstall')}
              </Button>
            </div>
          )}

          <Button variant="outline" onClick={openGitHub} className="w-full">
            <Github className="h-4 w-4" />
            {translate(uiLanguage, 'viewOnGitHub')}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
