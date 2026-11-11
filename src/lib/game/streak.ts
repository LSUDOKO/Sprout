// ISO weeks (UTC) and streaks (docs/04 §4). Pure functions; `now` is always passed in.
import { DAY } from './config'

/** ISO-8601 week key in UTC, e.g. "2026-W46". */
export function weekKey(date: Date | number): string {
  const d = new Date(typeof date === 'number' ? date : date.getTime())
  const day = d.getUTCDay() || 7 // Mon=1 … Sun=7
  // Thursday of this week decides the ISO year.
  const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day)
  const t = new Date(thursday)
  const year = t.getUTCFullYear()
  const week = Math.ceil(((thursday - Date.UTC(year, 0, 1)) / DAY + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
export function weekStart(date: Date | number): Date {
  const d = new Date(typeof date === 'number' ? date : date.getTime())
  const day = d.getUTCDay() || 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (day - 1)))
}

/** Next Monday 00:00 UTC (when the current week resets). */
export const weekResetAt = (date: Date | number) => new Date(weekStart(date).getTime() + 7 * DAY)

/** Monday 00:00 UTC of an ISO week key. */
export function weekKeyToDate(key: string): Date {
  const m = /^(\d{4})-W(\d{2})$/.exec(key)
  if (!m) throw new Error(`Bad week key: ${key}`)
  const year = Number(m[1])
  const week = Number(m[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  return new Date(weekStart(jan4).getTime() + (week - 1) * 7 * DAY)
}

export const prevWeekKey = (key: string) => weekKey(weekKeyToDate(key).getTime() - 7 * DAY)
export const nextWeekKey = (key: string) => weekKey(weekKeyToDate(key).getTime() + 7 * DAY)

/** Inclusive list of week keys from `from` to `to`. */
export function weekRange(from: string, to: string): string[] {
  const out: string[] = []
  let k = from
  for (let i = 0; i < 1000 && k <= to; i++) {
    out.push(k)
    if (k === to) break
    k = nextWeekKey(k)
  }
  return out
}

/** 1 = Monday … 7 = Sunday (UTC). */
export const isoWeekday = (date: Date | number) => new Date(date).getUTCDay() || 7

export type StreakState = {
  current: number
  best: number
  keptTotal: number
  /** Length of the most recent streak that broke (0 if none broke yet). */
  previous: number
  lastKeptWeek: string | null
}

/**
 * Compute streak state from the set of kept weeks.
 * `current` ends at this week if it is kept, otherwise at last week — so the streak
 * does not drop to 0 on Monday morning before the user had a chance to save.
 */
export function computeStreak(keptWeeks: Iterable<string>, now: Date | number): StreakState {
  const kept = new Set(keptWeeks)
  const sorted = [...kept].sort()
  const thisWeek = weekKey(now)
  const lastWeek = prevWeekKey(thisWeek)

  let current = 0
  let k = kept.has(thisWeek) ? thisWeek : lastWeek
  while (kept.has(k)) {
    current++
    k = prevWeekKey(k)
  }

  // Split kept weeks into consecutive runs.
  const past = sorted.filter((w) => w <= thisWeek)
  const runs: { end: string; len: number }[] = []
  for (const w of past) {
    const last = runs.at(-1)
    if (last && nextWeekKey(last.end) === w) {
      last.end = w
      last.len++
    } else runs.push({ end: w, len: 1 })
  }
  // A run is broken once a completed week after it was missed: it ended before last week.
  const broken = runs.filter((r) => r.end < lastWeek)

  return {
    current,
    best: runs.reduce((m, r) => Math.max(m, r.len), 0),
    keptTotal: past.length,
    previous: broken.at(-1)?.len ?? 0,
    lastKeptWeek: past.at(-1) ?? null,
  }
}

/** Last `n` weeks ending with the current week, oldest first: ✓ kept / ✗ missed / current. */
export function recentWeeks(keptWeeks: Iterable<string>, now: Date | number, n = 8, since?: string | null) {
  const kept = new Set(keptWeeks)
  const thisWeek = weekKey(now)
  const keys: string[] = [thisWeek]
  while (keys.length < n) keys.unshift(prevWeekKey(keys[0]!))
  return keys.map((key) => ({
    key,
    status: kept.has(key) ? ('kept' as const) : key === thisWeek ? ('current' as const) : since && key < since ? ('before' as const) : ('missed' as const),
  }))
}
