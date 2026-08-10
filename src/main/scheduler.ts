import type { Routine } from '../shared/types'

const MAX_TIMEOUT = 2 ** 31 - 1

function isDayAllowed(now: Date, days: number[] | undefined): boolean {
  if (!days || days.length === 0) return true
  return days.includes(now.getDay())
}

function nextOccurrence(
  now: Date,
  hour: number,
  minute: number,
  days?: number[]
): Date {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
  if (candidate.getTime() > now.getTime() && isDayAllowed(candidate, days)) {
    return candidate
  }
  // Busca el próximo día permitido a partir de mañana (máximo 8 días = semana + margen).
  const probe = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
  for (let offset = 1; offset <= 8; offset++) {
    probe.setDate(probe.getDate() + 1)
    if (isDayAllowed(probe, days)) {
      return new Date(probe.getTime())
    }
  }
  // Fallback de seguridad: no debería llegar acá con `days` válido.
  return new Date(candidate.getTime() + 24 * 60 * 60 * 1000)
}

export class Scheduler {
  private timers = new Map<number, NodeJS.Timeout>()
  private handler: (routine: Routine) => void

  constructor(handler: (routine: Routine) => void) {
    this.handler = handler
  }

  setRoutines(routines: Routine[]): void {
    this.clear()
    for (const routine of routines) {
      if (routine.enabled) {
        this.scheduleRoutine(routine)
      }
    }
  }

  private scheduleRoutine(routine: Routine): void {
    const now = new Date()
    const target = nextOccurrence(now, routine.hour, routine.minute, routine.days)
    const delay = target.getTime() - now.getTime()

    const timer = setTimeout(() => {
      this.handler(routine)
      this.scheduleRoutine(routine)
    }, Math.min(delay, MAX_TIMEOUT))

    this.timers.set(routine.id, timer)
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }
}
