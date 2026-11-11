import { describe, expect, it } from 'vitest'
import { nim } from '@/lib/nimiq/luna'
import { growth, stageFor } from '@/lib/game/growth'

describe('growth', () => {
  it('stage thresholds incl. kept-week gate', () => {
    expect(stageFor(0n, 0).id).toBe('seed')
    expect(stageFor(nim(1000), 0).id).toBe('seed') // needs 1 kept week
    expect(stageFor(nim(1000), 1).id).toBe('sprout')
    expect(stageFor(nim(5000), 3).id).toBe('sprout')
    expect(stageFor(nim(5000), 4).id).toBe('bloom')
    expect(stageFor(nim(20000), 8).id).toBe('grove')
    expect(stageFor(nim(1_000_000), 7).id).toBe('bloom')
  })

  it('withdrawing lowers the stage', () => {
    expect(stageFor(nim(4999), 10).id).toBe('sprout')
    expect(stageFor(nim(999), 10).id).toBe('seed')
  })

  it('planted flag at 100 NIM', () => {
    expect(growth(nim(99), 0).planted).toBe(false)
    expect(growth(nim(100), 0).planted).toBe(true)
  })

  it('progress and scale clamp', () => {
    const g = growth(nim(500), 0)
    expect(g.progress).toBeCloseTo(0.5)
    expect(g.scale).toBeCloseTo(1.075)
    expect(growth(0n, 0).progress).toBe(0)
    expect(growth(nim(3000), 4).progress).toBeCloseTo(0.5) // sprout: 1000 → 5000
    const top = growth(nim(99_999), 99)
    expect(top.stage).toBe('grove')
    expect(top.progress).toBe(1)
    expect(top.next).toBeNull()
    expect(top.scale).toBeCloseTo(1.15)
  })

  it('reports the real blocker', () => {
    expect(growth(nim(420), 3).blocker).toEqual({ kind: 'stake', needLuna: nim(580) })
    expect(growth(nim(1200), 0).blocker).toEqual({ kind: 'weeks', needWeeks: 1 })
    // stake past the threshold but weeks missing: progress stays full
    expect(growth(nim(1200), 0).progress).toBe(1)
  })
})
