// On-chain verification (docs/03 §8). A tx hash is never success: a save counts only after
// the chain shows it executed, from a linked address, to the staking contract, with the claimed value.
import 'server-only'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import type { Db } from '../db'
import { saves, squadMembers, treats, userAddresses, users, withdrawals } from '../db/schema'
import { DemoChain, RpcChain, decodeData, sameAddress, stakerTotals, stakingContract, type ChainReader } from '../nimiq/chain'
import { normalizeAddress } from '../nimiq/address'
import { MIN_STAKE, totalStake } from '../nimiq/invariants'
import { weekKey } from '../game/streak'
import { treatPlantedAward, treatSentAward } from '../game/sparks'
import { award, recompute, type RecomputeResult } from './progress'
import type { User } from './api'
import { earnedFor } from './account'

export const MIN_CONFIRMATIONS = 2
export const NOT_FOUND_TIMEOUT_MS = 30 * 60_000

export function chainFor(db: Db, user: Pick<User, 'isDemo' | 'clockOffsetMs'>, now: number): ChainReader {
  return user.isDemo ? new DemoChain(db, now) : new RpcChain()
}

export async function linkedAddresses(db: Db, userId: string): Promise<string[]> {
  return (await db.select({ a: userAddresses.address }).from(userAddresses).where(eq(userAddresses.userId, userId))).map((r) => r.a)
}

type Outcome = 'pending' | 'confirmed' | 'failed' | 'needs_link'
export type SaveRow = typeof saves.$inferSelect

/** Failures that may be chain/RPC lag rather than a bad claim: a later poll may still confirm them. */
export const RETRYABLE_FAILS = ['not_found', 'stake_not_found'] as const
const isRetryable = (s: SaveRow) => s.status === 'failed' && (RETRYABLE_FAILS as readonly string[]).includes(s.failReason ?? '')
const OPEN = ['pending', 'needs_link', 'failed'] as const

async function fail(db: Db, saveId: string, reason: string): Promise<Outcome> {
  await db.update(saves).set({ status: 'failed', failReason: reason }).where(and(eq(saves.id, saveId), inArray(saves.status, ['pending', 'needs_link'])))
  return 'failed'
}

const parseResult = (s: SaveRow | undefined) => (s?.resultJson ? (JSON.parse(s.resultJson) as RecomputeResult) : undefined)

/** Verify one save. Safe to call repeatedly (idempotent). */
export async function verifySave(db: Db, save: SaveRow, user: User, now: number): Promise<{ status: Outcome; result?: RecomputeResult }> {
  if (save.status === 'confirmed') {
    if (save.resultJson) return { status: 'confirmed', result: parseResult(save) }
    // Claimed earlier but the follow-up work didn't finish: finish it now (idempotent).
    return { status: 'confirmed', result: await finalizeSave(db, save, user, now) }
  }
  if (save.status === 'failed' && !isRetryable(save)) return { status: 'failed' }

  const chain = chainFor(db, user, now)
  const tx = await chain.getTransaction(save.txHash)
  if (!tx) {
    if (save.status === 'failed') return { status: 'failed' }
    if (now - save.createdAt.getTime() > NOT_FOUND_TIMEOUT_MS) return { status: await fail(db, save.id, 'not_found') }
    return { status: 'pending' }
  }
  if (tx.executed === false) return { status: await fail(db, save.id, 'execution_failed') }
  if (tx.executed === null || tx.confirmations < MIN_CONFIRMATIONS) return { status: save.status === 'failed' ? 'failed' : 'pending' }

  const linked = await linkedAddresses(db, user.id)
  if (!linked.some((a) => sameAddress(a, tx.from))) {
    await db.update(saves).set({ status: 'needs_link', fromAddress: tx.from }).where(eq(saves.id, save.id))
    return { status: 'needs_link' }
  }
  if (!sameAddress(tx.to, stakingContract())) return { status: await fail(db, save.id, 'wrong_recipient') }
  if (tx.value !== save.valueLuna) return { status: await fail(db, save.id, 'amount_mismatch') }

  const staker = await chain.getStaker(tx.from)
  if (!staker || totalStake(staker) < tx.value) {
    // The staker read can lag the tx read (e.g. a fallback node): wait, fail only after the window.
    if (save.status !== 'failed' && now - save.createdAt.getTime() > NOT_FOUND_TIMEOUT_MS) return { status: await fail(db, save.id, 'stake_not_found') }
    return { status: save.status === 'failed' ? 'failed' : 'pending' }
  }
  // Read everything from the chain BEFORE claiming, so a chain error can't strand a claimed row.
  const totals = await stakerTotals(chain, linked)

  const from = normalizeAddress(tx.from) ?? tx.from
  const wk = weekKey(chain.kind === 'demo' ? now : tx.timestamp || now)

  // Claim the row: only one concurrent verifier proceeds.
  const claimed = await db
    .update(saves)
    .set({ status: 'confirmed', failReason: null, fromAddress: from, blockNumber: tx.blockNumber, weekKey: wk, confirmedAt: new Date(now) })
    .where(and(eq(saves.id, save.id), inArray(saves.status, [...OPEN])))
    .returning()
  if (!claimed.length) {
    const [again] = await db.select().from(saves).where(eq(saves.id, save.id))
    return { status: (again?.status as Outcome) ?? 'pending', result: parseResult(again) }
  }

  if (save.kind === 'plant' && !user.delegation) {
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(saves).where(and(eq(saves.userId, user.id), eq(saves.status, 'confirmed')))
    // "kind" comes from the client, so prove from the chain that this tx created the staker:
    // a pre-existing staker would hold at least 100 NIM on top of this tx's value.
    const createdHere = Number(n) === 1 && totalStake(staker) - tx.value < MIN_STAKE
    await db
      .update(users)
      .set({ delegation: staker.delegation, plantedAt: new Date(now), firstPlantedWeek: wk, stakerCreatedBySprout: createdHere })
      .where(eq(users.id, user.id))
  } else if (!user.firstPlantedWeek) {
    await db.update(users).set({ firstPlantedWeek: wk, plantedAt: new Date(now), delegation: user.delegation ?? staker.delegation }).where(eq(users.id, user.id))
  }

  return { status: 'confirmed', result: await finalizeSave(db, claimed[0]!, user, now, totals) }
}

/** Idempotent follow-up of a confirmed save: awards, recompute, stored celebration diff. */
async function finalizeSave(db: Db, save: SaveRow, user: User, now: number, totals?: Awaited<ReturnType<typeof stakerTotals>>): Promise<RecomputeResult> {
  const linked = await linkedAddresses(db, user.id)
  const t = totals ?? (await stakerTotals(chainFor(db, user, now), linked))
  if (save.kind === 'treat_plant') {
    const [tr] = await db.select().from(treats).where(eq(treats.plantedSaveId, save.id))
    if (tr) await award(db, user.id, treatPlantedAward(tr.id))
  }
  const [fresh] = await db.select().from(users).where(eq(users.id, user.id))
  const earned = fresh ? await earnedFor(db, fresh, t) : null
  const result = await recompute(db, user.id, now, { stakeLuna: totalStake(t), savedTxHash: save.kind === 'treat_plant' ? undefined : save.txHash, everEarned: earned !== null && earned > 0n })
  await db.update(saves).set({ resultJson: JSON.stringify(result) }).where(eq(saves.id, save.id))
  return result
}

export const treatMemo = (squadId: string) => `sprout:t:${squadId}`

/** Verify a treat: executed, sender linked, recipient = primary address, ≥ 1 NIM, memo, both in squad. */
export async function verifyTreat(db: Db, treat: typeof treats.$inferSelect, sender: User, now: number): Promise<Outcome> {
  if (treat.status !== 'pending') return treat.status as Outcome
  const chain = chainFor(db, sender, now)
  const tx = await chain.getTransaction(treat.txHash)
  const failTreat = async (reason: string) => {
    await db.update(treats).set({ status: 'failed', failReason: reason }).where(and(eq(treats.id, treat.id), eq(treats.status, 'pending')))
    return 'failed' as const
  }
  if (!tx) return now - treat.createdAt.getTime() > NOT_FOUND_TIMEOUT_MS ? failTreat('not_found') : 'pending'
  if (tx.executed === false) return failTreat('execution_failed')
  if (tx.executed === null || tx.confirmations < MIN_CONFIRMATIONS) return 'pending'

  const senderLinked = await linkedAddresses(db, sender.id)
  if (!senderLinked.some((a) => sameAddress(a, tx.from))) return failTreat('sender_not_linked')
  const [recipient] = await db.select().from(users).where(eq(users.id, treat.toUser))
  if (!recipient || !sameAddress(tx.to, recipient.primaryAddress)) return failTreat('wrong_recipient')
  if (tx.value < 100_000n || tx.value !== treat.valueLuna) return failTreat('amount_mismatch')
  const memo = decodeData(tx.recipientData) || decodeData(tx.senderData)
  if (memo !== treatMemo(treat.squadId)) return failTreat('memo_mismatch')
  const members = await db
    .select({ u: squadMembers.userId })
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, treat.squadId), inArray(squadMembers.userId, [treat.fromUser, treat.toUser])))
  if (members.length !== 2) return failTreat('not_members')

  const claimed = await db
    .update(treats)
    .set({ status: 'confirmed', confirmedAt: new Date(now) })
    .where(and(eq(treats.id, treat.id), eq(treats.status, 'pending')))
    .returning({ id: treats.id })
  if (claimed.length) {
    const dayStart = new Date(Math.floor(now / 86_400_000) * 86_400_000)
    const [c] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(treats)
      .where(and(eq(treats.fromUser, sender.id), eq(treats.status, 'confirmed'), gte(treats.confirmedAt, dayStart), sql`${treats.id} <> ${treat.id}`))
    await award(db, sender.id, treatSentAward(Number(c?.n ?? 0), treat.id))
  }
  return 'confirmed'
}

/** Verify a withdrawal step. Deactivate/retire: from linked → staking contract. Remove: contract → linked. */
export async function verifyWithdrawal(db: Db, w: typeof withdrawals.$inferSelect, user: User, now: number): Promise<Outcome> {
  if (w.status !== 'pending') return w.status as Outcome
  const chain = chainFor(db, user, now)
  const tx = await chain.getTransaction(w.txHash)
  const failW = async (reason: string) => {
    await db.update(withdrawals).set({ status: 'failed', failReason: reason }).where(and(eq(withdrawals.id, w.id), eq(withdrawals.status, 'pending')))
    return 'failed' as const
  }
  if (!tx) return now - w.createdAt.getTime() > NOT_FOUND_TIMEOUT_MS ? failW('not_found') : 'pending'
  if (tx.executed === false) return failW('execution_failed')
  if (tx.executed === null || tx.confirmations < MIN_CONFIRMATIONS) return 'pending'
  const linked = await linkedAddresses(db, user.id)
  const contract = stakingContract()
  if (w.step === 'remove') {
    if (!sameAddress(tx.from, contract) || !linked.some((a) => sameAddress(a, tx.to))) return failW('wrong_parties')
    if (tx.value !== w.valueLuna) return failW('amount_mismatch')
  } else if (!linked.some((a) => sameAddress(a, tx.from)) || !sameAddress(tx.to, contract)) return failW('wrong_parties')

  await db.update(withdrawals).set({ status: 'confirmed', confirmedAt: new Date(now) }).where(and(eq(withdrawals.id, w.id), eq(withdrawals.status, 'pending')))
  // Stage may shrink after a removal; streaks are untouched by withdrawals.
  const totals = await stakerTotals(chain, linked)
  await recompute(db, user.id, now, { stakeLuna: totalStake(totals) })
  return 'confirmed'
}
