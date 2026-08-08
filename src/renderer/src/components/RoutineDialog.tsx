import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { translate } from '../lib/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'
import type { Routine } from '../../../shared/types'
import { SOUND_PRESETS } from '../../../shared/types'

interface RoutineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Routine | null
}

export function RoutineDialog({
  open,
  onOpenChange,
  editing
}: RoutineDialogProps): React.JSX.Element {
  const routines = useStore((s) => s.routines)
  const saveRoutines = useStore((s) => s.saveRoutines)
  const icons = useStore((s) => s.icons)
  const reloadIcons = useStore((s) => s.reloadIcons)
  const sounds = useStore((s) => s.sounds)
  const reloadSounds = useStore((s) => s.reloadSounds)
  const uiLanguage = useStore((s) => s.settings.uiLanguage)

  const [hour, setHour] = useState('09')
  const [minute, setMinute] = useState('00')
  const [message, setMessage] = useState('')
  const [icon, setIcon] = useState('')
  const [sound, setSound] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [error, setError] = useState('')
  const iconInputRef = useRef<HTMLInputElement>(null)
  const soundInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setError('')
      if (editing) {
        setHour(String(editing.hour))
        setMinute(String(editing.minute).padStart(2, '0'))
        setMessage(editing.message)
        setIcon(editing.icon)
        setSound(editing.sound ?? '')
        setUseAI(editing.useAI)
      } else {
        setHour('09')
        setMinute('00')
        setMessage('')
        setIcon('')
        setSound('')
        setUseAI(false)
      }
    }
  }, [open, editing])

  const handleSave = async (): Promise<void> => {
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)

    if (isNaN(h) || h < 0 || h > 23) {
      setError(translate(uiLanguage, 'errHour'))
      return
    }
    if (isNaN(m) || m < 0 || m > 59) {
      setError(translate(uiLanguage, 'errMinute'))
      return
    }
    if (!message.trim()) {
      setError(translate(uiLanguage, 'errMessage'))
      return
    }
    if (message.length > 200) {
      setError(translate(uiLanguage, 'errMessageLen'))
      return
    }

    if (editing) {
      await saveRoutines(
        routines.map((r) =>
          r.id === editing.id
            ? { ...r, hour: h, minute: m, message: message.trim(), icon, sound, useAI }
            : r
        )
      )
    } else {
      const nextId = Math.max(...routines.map((r) => r.id), 0) + 1
      await saveRoutines([
        ...routines,
        {
          id: nextId,
          hour: h,
          minute: m,
          message: message.trim(),
          icon,
          sound,
          useAI,
          enabled: true
        }
      ])
    }
    onOpenChange(false)
  }

  const handleIconUpload = async (file: File | undefined): Promise<void> => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(translate(uiLanguage, 'errImage'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(translate(uiLanguage, 'errImageSize'))
      return
    }
    const buffer = await file.arrayBuffer()
    const name = await window.api.saveIcon(Buffer.from(buffer), file.name)
    await reloadIcons()
    setIcon(name)
    setError('')
  }

  const handleSoundUpload = async (file: File | undefined): Promise<void> => {
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setError(translate(uiLanguage, 'errSound'))
      return
    }
    const buffer = await file.arrayBuffer()
    const name = await window.api.saveSound(Buffer.from(buffer), file.name)
    await reloadSounds()
    setSound(`file:${name}`)
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? translate(uiLanguage, 'editRoutine')
              : translate(uiLanguage, 'newRoutineDialog')}
          </DialogTitle>
          <DialogDescription>{translate(uiLanguage, 'dialogDesc')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hour">{translate(uiLanguage, 'hour')}</Label>
              <Input
                id="hour"
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minute">{translate(uiLanguage, 'minutes')}</Label>
              <Input
                id="minute"
                type="number"
                min={0}
                max={59}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{translate(uiLanguage, 'message')}</Label>
            <Input
              id="message"
              placeholder={translate(uiLanguage, 'messagePlaceholder')}
              value={message}
              maxLength={200}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{translate(uiLanguage, 'icon')}</Label>
            <div className="flex gap-2">
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={translate(uiLanguage, 'noIcon')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{translate(uiLanguage, 'noIcon')}</SelectItem>
                  {icons.map((iconName) => (
                    <SelectItem key={iconName} value={iconName}>
                      {iconName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleIconUpload(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => iconInputRef.current?.click()}
              >
                {translate(uiLanguage, 'upload')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{translate(uiLanguage, 'soundTitle')}</Label>
            <div className="flex gap-2">
              <Select value={sound} onValueChange={setSound}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={translate(uiLanguage, 'noSound')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{translate(uiLanguage, 'noSound')}</SelectItem>
                  {SOUND_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  {sounds.map((soundName) => (
                    <SelectItem key={soundName} value={`file:${soundName}`}>
                      {soundName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={soundInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => void handleSoundUpload(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => soundInputRef.current?.click()}
              >
                {translate(uiLanguage, 'upload')}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{translate(uiLanguage, 'aiTitle')}</p>
              <p className="text-xs text-muted-foreground">
                {translate(uiLanguage, 'aiDesc')}
              </p>
            </div>
            <Switch checked={useAI} onCheckedChange={setUseAI} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate(uiLanguage, 'cancel')}
          </Button>
          <Button onClick={() => void handleSave()}>
            {editing
              ? translate(uiLanguage, 'saveChanges')
              : translate(uiLanguage, 'create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
