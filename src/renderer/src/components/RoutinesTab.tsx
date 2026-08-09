import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Clock3,
  Play,
  Download,
  Upload,
  Volume2
} from 'lucide-react'
import { useStore } from '../store'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { RoutineDialog } from './RoutineDialog'
import { translate } from '../lib/i18n'
import type { Routine } from '../../../shared/types'

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function RoutineIcon({ icon }: { icon: string }): React.JSX.Element {
  const [src, setSrc] = useState('')

  useEffect(() => {
    void window.api.getIconUrl(icon).then(setSrc)
  }, [icon])

  if (!src) return <div className="h-12 w-12 shrink-0" />
  return (
    <img
      src={src}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg border bg-background object-contain p-1"
    />
  )
}

export function RoutinesTab(): React.JSX.Element {
  const routines = useStore((s) => s.routines)
  const saveRoutines = useStore((s) => s.saveRoutines)
  const saveTodos = useStore((s) => s.saveTodos)
  const uiLanguage = useStore((s) => s.settings.uiLanguage)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)

  const sorted = [...routines].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))

  const openAdd = (): void => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (routine: Routine): void => {
    setEditing(routine)
    setDialogOpen(true)
  }

  const toggleEnabled = async (routine: Routine): Promise<void> => {
    await saveRoutines(
      routines.map((r) => (r.id === routine.id ? { ...r, enabled: !r.enabled } : r))
    )
  }

  const remove = async (routine: Routine): Promise<void> => {
    await saveRoutines(routines.filter((r) => r.id !== routine.id))
  }

  const doExport = async (): Promise<void> => {
    await window.api.exportRoutines()
  }

  const doImport = async (): Promise<void> => {
    const imported = await window.api.importRoutines()
    if (imported) {
      await saveRoutines(imported.routines)
      await saveTodos(imported.todos)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {translate(uiLanguage, 'routinesTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {translate(uiLanguage, 'routinesSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void doImport()}
            title={translate(uiLanguage, 'import')}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void doExport()}
            title={translate(uiLanguage, 'export')}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> {translate(uiLanguage, 'newRoutine')}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Clock3 className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold">
              {translate(uiLanguage, 'noRoutinesTitle')}
            </h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              {translate(uiLanguage, 'noRoutinesDesc')}
            </p>
            <Button className="mt-2" onClick={openAdd}>
              <Plus className="h-4 w-4" /> {translate(uiLanguage, 'createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((routine) => (
            <Card
              key={routine.id}
              className={`transition-all ${
                routine.enabled ? 'hover:shadow-md' : 'opacity-55'
              }`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <Switch
                  checked={routine.enabled}
                  onCheckedChange={() => void toggleEnabled(routine)}
                />
                {routine.icon ? (
                  <RoutineIcon icon={routine.icon} />
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold tabular-nums text-primary">
                    {formatTime(routine.hour, routine.minute)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{routine.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock3 className="h-3 w-3" />
                      {formatTime(routine.hour, routine.minute)}
                    </span>
                    {routine.useAI && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Sparkles className="h-3 w-3" />
                        {translate(uiLanguage, 'aiMessage')}
                      </span>
                    )}
                    {routine.sound && (
                      <span
                        className="inline-flex items-center gap-1 text-muted-foreground"
                        title={routine.sound}
                      >
                        <Volume2 className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void window.api.testRoutine(routine)}
                    title={translate(uiLanguage, 'test')}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => openEdit(routine)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => void remove(routine)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoutineDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}
