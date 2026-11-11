// Shared staking-rule checks (docs/03 §5). Run these BEFORE opening any wallet dialog,
// so we never ask the user to approve a transaction the chain would reject.
import { nim } from './luna'

export const MIN_STAKE = nim(100) // 10,000,000 Luna
export const MIN_SAVE = nim(1)

export type Staker = {
  activeLuna: bigint
  inactiveLuna: bigint
  retiredLuna: bigint
  /** Block from which inactive funds are released (may retire). Null when nothing is inactive. */
  inactiveRelease: number | null
  delegation: string | null
}

export type Check = { ok: true } | { ok: false; code: InvariantCode; message: string }
export type InvariantCode =
  | 'below_min_plant'
  | 'below_min_save'
  | 'insufficient_wallet'
  | 'nonretired_below_min'
  | 'invalid_amount'
  | 'still_cooling_down'
  | 'exceeds_released'
  | 'remainder_below_min'
  | 'nothing_to_remove'
  | 'already_planted'
  | 'not_planted'

const ok = (): Check => ({ ok: true })
const err = (code: InvariantCode, message: string): Check => ({ ok: false, code, message })

export const emptyStaker = (): Staker => ({ activeLuna: 0n, inactiveLuna: 0n, retiredLuna: 0n, inactiveRelease: null, delegation: null })
export const nonRetired = (s: Staker) => s.activeLuna + s.inactiveLuna
export const totalStake = (s: Staker) => s.activeLuna + s.inactiveLuna + s.retiredLuna
export const hasStaker = (s: Staker | null | undefined): s is Staker => !!s && (s.delegation !== null || totalStake(s) > 0n)

export function canCreateStaker(existing: Staker | null, valueLuna: bigint, walletLuna?: bigint): Check {
  if (hasStaker(existing)) return err('already_planted', 'You already have a stake. Add to it instead.')
  if (valueLuna < MIN_STAKE) return err('below_min_plant', 'Minimum to start is 100 NIM')
  if (walletLuna !== undefined && valueLuna > walletLuna) return err('insufficient_wallet', 'Not enough NIM in wallet')
  return ok()
}

export function canAddStake(s: Staker | null, valueLuna: bigint, walletLuna?: bigint): Check {
  if (!hasStaker(s)) return err('not_planted', 'Plant your seed first (100 NIM)')
  if (valueLuna < MIN_SAVE) return err('below_min_save', 'Minimum save is 1 NIM')
  if (nonRetired(s) + valueLuna < MIN_STAKE) return err('nonretired_below_min', 'Total must reach 100 NIM')
  if (walletLuna !== undefined && valueLuna > walletLuna) return err('insufficient_wallet', 'Not enough NIM in wallet')
  return ok()
}

export function canDeactivate(s: Staker, amountLuna: bigint): Check {
  if (amountLuna <= 0n || amountLuna > s.activeLuna) return err('invalid_amount', 'Invalid amount')
  return ok()
}

export function isReleased(s: Staker, currentBlock: number): boolean {
  return s.inactiveLuna > 0n && s.inactiveRelease !== null && currentBlock >= s.inactiveRelease
}

export function canRetire(s: Staker, amountLuna: bigint, currentBlock: number): Check {
  if (!isReleased(s, currentBlock)) return err('still_cooling_down', 'Still cooling down')
  if (amountLuna <= 0n) return err('invalid_amount', 'Invalid amount')
  if (amountLuna > s.inactiveLuna) return err('exceeds_released', 'Amount exceeds released balance')
  const remaining = nonRetired(s) - amountLuna
  if (remaining !== 0n && remaining < MIN_STAKE) return err('remainder_below_min', 'Leave 0 or at least 100 NIM staked')
  return ok()
}

/**
 * When the user wants to withdraw `want` but the remainder would fall below 100 NIM,
 * the only valid options are "leave ≥ 100 NIM" or "withdraw everything". This returns
 * the amount to deactivate so the later retire step is guaranteed valid.
 */
export function withdrawPlan(s: Staker, wantLuna: bigint): { amountLuna: bigint; all: boolean; adjusted: boolean } {
  const total = nonRetired(s)
  const want = wantLuna > s.activeLuna ? s.activeLuna : wantLuna
  const remaining = total - want
  if (remaining !== 0n && remaining < MIN_STAKE) return { amountLuna: s.activeLuna, all: s.activeLuna === total, adjusted: true }
  return { amountLuna: want, all: remaining === 0n, adjusted: want !== wantLuna }
}

/** Remove must take the WHOLE retired balance (no partial removal). */
export function removeValue(s: Staker): bigint {
  return s.retiredLuna
}

export function canRemove(s: Staker): Check {
  if (s.retiredLuna <= 0n) return err('nothing_to_remove', 'Nothing ready to send yet')
  return ok()
}

/** The step the withdraw screen should show, derived from chain state only (docs/03 §9). */
export type WithdrawStep = 'deactivate' | 'cooldown' | 'retire' | 'remove'
export function withdrawStep(s: Staker, currentBlock: number): WithdrawStep {
  if (s.retiredLuna > 0n) return 'remove'
  if (s.inactiveLuna > 0n) return isReleased(s, currentBlock) ? 'retire' : 'cooldown'
  return 'deactivate'
}
