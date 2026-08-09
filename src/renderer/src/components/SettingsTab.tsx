import { useEffect, useState } from 'react'
import { KeyRound, Sparkles, Languages, Globe, ExternalLink, RefreshCw } from 'lucide-react'
import { useStore } from '../store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { translate } from '../lib/i18n'
import { LANGUAGES, UI_LANGUAGES } from '../../../shared/types'
import type { GeminiModel } from '../../../shared/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'

const GEMINI_URL = 'https://aistudio.google.com'
const ELEVENLABS_URL = 'https://elevenlabs.io'

function openExternal(url: string): void {
  void window.api.openExternal(url)
}

export function SettingsTab(): React.JSX.Element {
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  const uiLanguage = useStore((s) => s.settings.uiLanguage)
  const [saved, setSaved] = useState(false)
  const [models, setModels] = useState<GeminiModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  const update = (patch: Partial<typeof settings>): void => {
    void saveSettings({ ...settings, ...patch })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const bothKeys = Boolean(settings.geminiApiKey && settings.elevenLabsApiKey)
  const oneKey = Boolean(settings.geminiApiKey) !== Boolean(settings.elevenLabsApiKey)

  const loadModels = async (): Promise<void> => {
    if (!settings.geminiApiKey) return
    setLoadingModels(true)
    try {
      const list = await window.api.listModels()
      setModels(list)
    } finally {
      setLoadingModels(false)
    }
  }

  useEffect(() => {
    void loadModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedModelLabel = models.find((m) => m.name === settings.geminiModel)?.displayName
    ?? settings.geminiModel
    ?? ''

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {translate(uiLanguage, 'settingsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {translate(uiLanguage, 'settingsSubtitle')}
          </p>
        </div>
        {saved && <span className="text-sm text-primary">{translate(uiLanguage, 'saved')} ✓</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            {translate(uiLanguage, 'uiLanguageTitle')}
          </CardTitle>
          <CardDescription>{translate(uiLanguage, 'languageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.uiLanguage}
            onValueChange={(v) => update({ uiLanguage: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UI_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {translate(uiLanguage, 'aiCardTitle')}
          </CardTitle>
          <CardDescription>{translate(uiLanguage, 'aiCardDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oneKey && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-400">
              {translate(uiLanguage, 'bothKeysRequired')}
            </p>
          )}
          {!oneKey && !bothKeys && (
            <p className="text-xs text-muted-foreground">
              {translate(uiLanguage, 'bothKeysRequired')}
            </p>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              {translate(uiLanguage, 'geminiKey')}
            </Label>
            <Input
              type="password"
              placeholder="AIza..."
              value={settings.geminiApiKey}
              onChange={(e) => update({ geminiApiKey: e.target.value })}
            />
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {translate(uiLanguage, 'geminiKeyHint')}{' '}
              <button
                onClick={() => openExternal(GEMINI_URL)}
                className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
              >
                aistudio.google.com <ExternalLink className="h-3 w-3" />
              </button>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              {translate(uiLanguage, 'geminiModel')}
            </Label>
            <div className="flex gap-2">
              <Select
                value={settings.geminiModel}
                onValueChange={(v) => update({ geminiModel: v })}
                disabled={models.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModelLabel}>
                    {selectedModelLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      <span className="flex items-center justify-between gap-2">
                        {model.displayName}
                        {model.freeTier && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            {translate(uiLanguage, 'freeTier')}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => void loadModels()}
                disabled={!settings.geminiApiKey || loadingModels}
                title={translate(uiLanguage, 'loadModels')}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-card text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingModels ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loadingModels && (
              <p className="text-xs text-muted-foreground">
                {translate(uiLanguage, 'loadingModels')}
              </p>
            )}
            {!loadingModels && models.length === 0 && settings.geminiApiKey && (
              <p className="text-xs text-muted-foreground">
                {translate(uiLanguage, 'noModels')}
              </p>
            )}
            {models.length === 0 && !settings.geminiApiKey && (
              <p className="text-xs text-muted-foreground">{translate(uiLanguage, 'geminiModelHint')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              {translate(uiLanguage, 'elevenKey')}
            </Label>
            <Input
              type="password"
              placeholder="sk_..."
              value={settings.elevenLabsApiKey}
              onChange={(e) => update({ elevenLabsApiKey: e.target.value })}
            />
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {translate(uiLanguage, 'elevenKeyHint')}{' '}
              <button
                onClick={() => openExternal(ELEVENLABS_URL)}
                className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
              >
                elevenlabs.io <ExternalLink className="h-3 w-3" />
              </button>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              {translate(uiLanguage, 'voiceId')}
            </Label>
            <Input
              type="text"
              placeholder="h3KZVBOooxHZiKRxnsdE"
              value={settings.voiceId}
              onChange={(e) => update({ voiceId: e.target.value.trim() })}
            />
            <p className="text-xs text-muted-foreground">{translate(uiLanguage, 'voiceIdHint')}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              {translate(uiLanguage, 'messageLanguage')}
            </Label>
            <Select value={settings.language} onValueChange={(v) => update({ language: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
