import { describe, expect, it } from 'vitest'
import { computeStreak, nextWeekKey, prevWeekKey, recentWeeks, weekKey, weekKeyToDate, weekRange, weekResetAt, weekStart } from '@/lib/game/streak'

const at = (iso: string) => Date.parse(iso)

describe('ISO week keys (UTC)', () => {
  it('basic keys', () => {
    expect(weekKey(at('2026-11-11T12:00:00Z'))).toBe('2026-W46')
    expect(weekKey(at('2026-01-01T00:00:00Z'))).toBe('2026-W01')
  })

  it('handles the 2026-W53 → 2027-W01 year boundary', () => {
    // 2026 has 53 ISO weeks (Jan 1 2026 is a Thursday)
    expect(weekKey(at('2026-12-31T23:59:59Z'))).toBe('2026-W53')
    expect(weekKey(at('2027-01-03T23:59:59Z'))).toBe('2026-W53') // Sunday still W53
    expect(weekKey(at('2027-01-04T00:00:00Z'))).toBe('2027-W01')
    expect(nextWeekKey('2026-W53')).toBe('2027-W01')
    expect(prevWeekKey('2027-W01')).toBe('2026-W53')
  })

  it('handles years where Jan 1 belongs to the previous ISO year', () => {
    expect(weekKey(at('2027-01-01T10:00:00Z'))).toBe('2026-W53')
    expect(weekKey(at('2025-12-29T00:00:00Z'))).toBe('2026-W01')
  })

  it('uses UTC, not local time', () => {
    expect(weekKey(at('2026-11-15T23:30:00Z'))).toBe('2026-W46') // Sunday UTC
    expect(weekKey(at('2026-11-16T00:00:00Z'))).toBe('2026-W47')
  })

  it('week start / reset / round trip', () => {
    expect(weekStart(at('2026-11-11T12:00:00Z')).toISOString()).toBe('2026-11-09T00:00:00.000Z')
    expect(weekResetAt(at('2026-11-11T12:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z')
    expect(weekKeyToDate('2026-W46').toISOString()).toBe('2026-11-09T00:00:00.000Z')
    expect(weekRange('2026-W52', '2027-W02')).toEqual(['2026-W52', '2026-W53', '2027-W01', '2027-W02'])
  })
})

describe('streak', () => {
  const now = at('2026-11-11T12:00:00Z') // W46, Wednesday

  it('counts a run ending this week', () => {
    expect(computeStreak(['2026-W44', '2026-W45', '2026-W46'], now)).toMatchObject({ current: 3, best: 3, keptTotal: 3 })
  })

  it("doesn't drop before the current week ends", () => {
    expect(computeStreak(['2026-W44', '2026-W45'], now).current).toBe(2)
  })

  it('breaks after a missed completed week and remembers the previous streak', () => {
    const s = computeStreak(['2026-W41', '2026-W42', '2026-W43'], now) // W44, W45 missed
    expect(s.current).toBe(0)
    expect(s.previous).toBe(3)
    expect(s.best).toBe(3)
  })

  it('previous is the most recent broken run', () => {
    const s = computeStreak(['2026-W38', '2026-W39', '2026-W41', '2026-W42', '2026-W46'], now)
    expect(s.current).toBe(1)
    expect(s.previous).toBe(2)
    expect(s.best).toBe(2)
    expect(s.keptTotal).toBe(5)
  })

  it('continues across the year boundary', () => {
    expect(computeStreak(['2026-W52', '2026-W53', '2027-W01'], at('2027-01-06T00:00:00Z')).current).toBe(3)
  })

  it('ignores future weeks', () => {
    expect(computeStreak(['2026-W50'], now)).toMatchObject({ current: 0, keptTotal: 0 })
  })

  it('empty history', () => {
    expect(computeStreak([], now)).toEqual({ current: 0, best: 0, keptTotal: 0, previous: 0, lastKeptWeek: null })
  })

  it('recent weeks strip', () => {
    const r = recentWeeks(['2026-W45'], now, 3)
    expect(r).toEqual([
      { key: '2026-W44', status: 'missed' },
      { key: '2026-W45', status: 'kept' },
      { key: '2026-W46', status: 'current' },
    ])
  })
})
