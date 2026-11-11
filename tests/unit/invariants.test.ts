import { describe, expect, it } from 'vitest'
import { nim } from '@/lib/nimiq/luna'
import {
  canAddStake, canCreateStaker, canDeactivate, canRemove, canRetire, emptyStaker, removeValue,
  withdrawPlan, withdrawStep, type Staker,
} from '@/lib/nimiq/invariants'

const staker = (p: Partial<Staker>): Staker => ({ ...emptyStaker(), delegation: 'NQ00 POOL', ...p })

describe('invariants', () => {
  it('create < 100 NIM fails, 100 NIM passes', () => {
    expect(canCreateStaker(null, nim(99))).toMatchObject({ ok: false, code: 'below_min_plant' })
    expect(canCreateStaker(null, nim(100))).toEqual({ ok: true })
  })

  it('create checks the wallet balance when known', () => {
    expect(canCreateStaker(null, nim(100), nim(50))).toMatchObject({ ok: false, code: 'insufficient_wallet' })
  })

  it('cannot create a second staker', () => {
    expect(canCreateStaker(staker({ activeLuna: nim(100) }), nim(100))).toMatchObject({ ok: false, code: 'already_planted' })
  })

  it('add-stake requires a staker and ≥ 1 NIM', () => {
    expect(canAddStake(null, nim(10))).toMatchObject({ ok: false, code: 'not_planted' })
    expect(canAddStake(staker({ activeLuna: nim(100) }), 50_000n)).toMatchObject({ ok: false, code: 'below_min_save' })
    expect(canAddStake(staker({ activeLuna: nim(100) }), nim(1))).toEqual({ ok: true })
  })

  it('add leaving non-retired < 100 NIM fails', () => {
    // fully retired staker: non-retired = 0, adding 10 NIM leaves 10 NIM non-retired
    const s = staker({ retiredLuna: nim(200) })
    expect(canAddStake(s, nim(10))).toMatchObject({ ok: false, code: 'nonretired_below_min' })
    expect(canAddStake(s, nim(100))).toEqual({ ok: true })
  })

  it('deactivate bounds', () => {
    const s = staker({ activeLuna: nim(300) })
    expect(canDeactivate(s, 0n).ok).toBe(false)
    expect(canDeactivate(s, nim(301)).ok).toBe(false)
    expect(canDeactivate(s, nim(300)).ok).toBe(true)
  })

  it('retire before release fails', () => {
    const s = staker({ activeLuna: nim(200), inactiveLuna: nim(100), inactiveRelease: 1000 })
    expect(canRetire(s, nim(100), 999)).toMatchObject({ ok: false, code: 'still_cooling_down' })
    expect(canRetire(s, nim(100), 1000)).toEqual({ ok: true })
  })

  it('retire leaving 50 NIM fails', () => {
    const s = staker({ activeLuna: nim(50), inactiveLuna: nim(100), inactiveRelease: 10 })
    expect(canRetire(s, nim(100), 20)).toMatchObject({ ok: false, code: 'remainder_below_min' })
  })

  it('retire cannot exceed the released balance', () => {
    const s = staker({ inactiveLuna: nim(100), inactiveRelease: 10 })
    expect(canRetire(s, nim(150), 20)).toMatchObject({ ok: false, code: 'exceeds_released' })
    expect(canRetire(s, nim(100), 20)).toEqual({ ok: true })
  })

  it('remove = whole retired balance', () => {
    const s = staker({ retiredLuna: nim(123) })
    expect(removeValue(s)).toBe(nim(123))
    expect(canRemove(s).ok).toBe(true)
    expect(canRemove(staker({})).ok).toBe(false)
  })

  it('withdraw plan bumps to everything when the remainder would be < 100 NIM', () => {
    const s = staker({ activeLuna: nim(150) })
    expect(withdrawPlan(s, nim(100))).toEqual({ amountLuna: nim(150), all: true, adjusted: true })
    expect(withdrawPlan(s, nim(50))).toEqual({ amountLuna: nim(50), all: false, adjusted: false })
    expect(withdrawPlan(s, nim(999))).toEqual({ amountLuna: nim(150), all: true, adjusted: true })
  })

  it('withdraw step comes from chain state', () => {
    expect(withdrawStep(staker({ activeLuna: nim(200) }), 5)).toBe('deactivate')
    expect(withdrawStep(staker({ inactiveLuna: nim(200), inactiveRelease: 10 }), 5)).toBe('cooldown')
    expect(withdrawStep(staker({ inactiveLuna: nim(200), inactiveRelease: 10 }), 10)).toBe('retire')
    expect(withdrawStep(staker({ retiredLuna: nim(200) }), 10)).toBe('remove')
  })
})
