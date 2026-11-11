import { describe, expect, it } from 'vitest'
import { nim } from '@/lib/nimiq/luna'
import { balance, saveAward, squadPerfectAward, treatSentAward, weekKeptAward } from '@/lib/game/sparks'
import { newBadges, qualifyingBadges, type BadgeContext } from '@/lib/game/badges'
import { canBuy } from '@/lib/game/cosmetics'
import { rank } from '@/lib/game/leaderboard'

describe('sparks', () => {
  it('save award respects the daily cap', () => {
    expect(saveAward(0, 'h1')).toEqual({ delta: 10, reason: 'save', ref: 'h1' })
    expect(saveAward(2, 'h3')).not.toBeNull()
    expect(saveAward(3, 'h4')).toBeNull()
  })
  it('week kept scales with streak and caps at 100', () => {
    expect(weekKeptAward(1, '2026-W46').delta).toBe(35)
    expect(weekKeptAward(7, '2026-W46').delta).toBe(65)
    expect(weekKeptAward(50, '2026-W46').delta).toBe(100)
  })
  it('awards are keyed for idempotency', () => {
    expect(weekKeptAward(1, '2026-W46').ref).toBe(weekKeptAward(9, '2026-W46').ref)
    expect(squadPerfectAward('sq1', '2026-W46').ref).toBe('sq1:2026-W46')
  })
  it('treat sent daily cap', () => {
    expect(treatSentAward(3, 't')).toBeNull()
    expect(treatSentAward(0, 't')?.delta).toBe(5)
  })
  it('balance sums the ledger', () => {
    expect(balance([{ delta: 10 }, { delta: 35 }, { delta: -50 }])).toBe(-5)
  })
})

describe('badges', () => {
  const ctx: BadgeContext = { stakeLuna: 0n, keptTotal: 0, currentStreak: 0, stage: 'seed', everEarned: false, foundedSquadWith3: false, perfectSquadWeek: false, treatsSent: 0, comebackWeek: false }
  it('none at the start', () => expect(qualifyingBadges(ctx)).toEqual([]))
  it('each rule', () => {
    expect(qualifyingBadges({ ...ctx, stakeLuna: nim(100) })).toEqual(['first_seed'])
    expect(qualifyingBadges({ ...ctx, keptTotal: 1, currentStreak: 4 })).toEqual(['week_one', 'on_a_roll'])
    expect(qualifyingBadges({ ...ctx, currentStreak: 12 })).toContain('unstoppable')
    expect(qualifyingBadges({ ...ctx, stage: 'grove' })).toEqual(['bloomer', 'grove_keeper'])
    expect(qualifyingBadges({ ...ctx, treatsSent: 5 })).toEqual(['generous'])
    expect(qualifyingBadges({ ...ctx, stakeLuna: nim(10_000) })).toContain('club_10k')
    expect(qualifyingBadges({ ...ctx, comebackWeek: true, everEarned: true })).toEqual(['grew_overnight', 'comeback'])
  })
  it('only returns badges not yet owned (idempotent)', () => {
    const c = { ...ctx, stakeLuna: nim(100), keptTotal: 1 }
    expect(newBadges(c, ['first_seed'])).toEqual(['week_one'])
    expect(newBadges(c, ['first_seed', 'week_one'])).toEqual([])
  })
})

describe('shop', () => {
  it('checks price and ownership', () => {
    expect(canBuy('leaf_cap', 50, [])).toEqual({ ok: true })
    expect(canBuy('leaf_cap', 49, [])).toEqual({ ok: false, reason: 'sparks' })
    expect(canBuy('leaf_cap', 500, ['leaf_cap'])).toEqual({ ok: false, reason: 'owned' })
    expect(canBuy('lootbox', 500, [])).toEqual({ ok: false, reason: 'unknown' })
  })
})

describe('leaderboard', () => {
  const now = Date.parse('2026-11-11T12:00:00Z') // W46
  const row = (userId: string, first: string, kept: string[], streak: number, plantedAt = 0) => ({ userId, firstPlantedWeek: first, plantedAt, keptWeeks: kept, currentStreak: streak })
  it('ranks by consistency, then streak, then earliest plant; needs 2 eligible weeks', () => {
    const r = rank([
      row('a', '2026-W43', ['2026-W43', '2026-W44', '2026-W45'], 3, 5), // 3/3
      row('b', '2026-W43', ['2026-W44', '2026-W45'], 2, 1), // 2/3
      row('c', '2026-W43', ['2026-W43', '2026-W44', '2026-W45'], 3, 1), // 3/3 earlier plant
      row('d', '2026-W45', ['2026-W45'], 1), // 1 eligible week → hidden
      row('e', '2026-W44', ['2026-W44', '2026-W45', '2026-W46'], 3, 9), // 3/3, current week kept counts
    ], now)
    expect(r.map((x) => x.userId)).toEqual(['c', 'a', 'e', 'b'])
    expect(r[3]!.consistencyPct).toBe(67)
  })
})
