// Pet mood rules, first match wins (docs/04 §3). Pure. Mood never affects money.
import { DAY } from './config'
import { isoWeekday } from './streak'

export const MOODS = ['celebrating', 'love', 'sad', 'hungry', 'sleepy', 'happy', 'content'] as const
export type Mood = (typeof MOODS)[number]

export type MoodInputs = {
  now: number
  /** Client-local hour 0..23 (timezone handled by the caller). */
  localHour: number
  celebrating?: boolean
  thisWeekKept: boolean
  lastWeekKept: boolean
  previousStreak: number
  lastSaveAt: number | null
  lastTreatReceivedAt: number | null
}

export function moodFor(i: MoodInputs): Mood {
  if (i.celebrating) return 'celebrating'
  if (i.lastTreatReceivedAt !== null && i.now - i.lastTreatReceivedAt < DAY) return 'love'
  const weekday = isoWeekday(i.now)
  if (!i.lastWeekKept && i.previousStreak >= 2 && weekday <= 3) return 'sad'
  const noRecentSave = i.lastSaveAt === null || i.now - i.lastSaveAt >= 3 * DAY
  if (!i.thisWeekKept && noRecentSave && weekday >= 4) return 'hungry'
  if (i.localHour >= 22 || i.localHour < 6) return 'sleepy'
  if (i.thisWeekKept) return 'happy'
  return 'content'
}
