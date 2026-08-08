import type { Routine } from '../shared/types'

const MAX_TIMEOUT = 2 ** 31 - 1

function nextOccurrence(now: Date, hour: number, minute: number): Date {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
  if (candidate.getTime() > now.getTime()) {
    return candidate
  }
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  return new Date(next.getFullYear(), next.getMonth(), next.getDate(), hour, minute, 0, 0)
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
    const target = nextOccurrence(now, routine.hour, routine.minute)
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
