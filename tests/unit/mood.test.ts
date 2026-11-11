import { describe, expect, it } from 'vitest'
import { moodFor, type MoodInputs } from '@/lib/game/mood'

const WED = Date.parse('2026-11-11T12:00:00Z')
const MON = Date.parse('2026-11-09T12:00:00Z')
const FRI = Date.parse('2026-11-13T12:00:00Z')
const DAY = 86_400_000
const base: MoodInputs = { now: WED, localHour: 14, thisWeekKept: false, lastWeekKept: true, previousStreak: 0, lastSaveAt: WED - DAY, lastTreatReceivedAt: null }

describe('mood', () => {
  it('celebrating wins over everything', () => {
    expect(moodFor({ ...base, celebrating: true, lastTreatReceivedAt: WED })).toBe('celebrating')
  })
  it('love within 24h of a treat', () => {
    expect(moodFor({ ...base, lastTreatReceivedAt: WED - DAY + 1 })).toBe('love')
    expect(moodFor({ ...base, lastTreatReceivedAt: WED - DAY })).toBe('content')
  })
  it('sad: last week missed, broken streak ≥ 2, first 3 days', () => {
    const s = { ...base, lastWeekKept: false, previousStreak: 2 }
    expect(moodFor({ ...s, now: MON })).toBe('sad')
    expect(moodFor({ ...s, now: WED })).toBe('sad')
    expect(moodFor({ ...s, now: FRI, lastSaveAt: FRI })).toBe('content')
    expect(moodFor({ ...s, now: MON, previousStreak: 1 })).toBe('content')
  })
  it('hungry: Thursday+, not kept, no save in 3 days', () => {
    expect(moodFor({ ...base, now: FRI, lastSaveAt: FRI - 3 * DAY })).toBe('hungry')
    expect(moodFor({ ...base, now: FRI, lastSaveAt: null })).toBe('hungry')
    expect(moodFor({ ...base, now: FRI, lastSaveAt: FRI - DAY })).toBe('content')
    expect(moodFor({ ...base, now: WED, lastSaveAt: null })).toBe('content')
  })
  it('sleepy between 22:00 and 06:00 local', () => {
    expect(moodFor({ ...base, localHour: 22 })).toBe('sleepy')
    expect(moodFor({ ...base, localHour: 5 })).toBe('sleepy')
    expect(moodFor({ ...base, localHour: 6 })).toBe('content')
  })
  it('hungry outranks sleepy, sleepy outranks happy', () => {
    expect(moodFor({ ...base, now: FRI, lastSaveAt: null, localHour: 23 })).toBe('hungry')
    expect(moodFor({ ...base, thisWeekKept: true, localHour: 23 })).toBe('sleepy')
  })
  it('happy when the week is kept, else content', () => {
    expect(moodFor({ ...base, thisWeekKept: true })).toBe('happy')
    expect(moodFor(base)).toBe('content')
  })
})
