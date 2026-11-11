// Demo mode (docs/01 F14, docs/04 §11): same engine, separate namespace, fake chain in the DB.
// The demo wallet below plays the role of Nimiq Pay + the blockchain: it validates every
// transaction with the same staking rules the protocol enforces, then records it.
import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'
import type { Db } from '../db'
import { demoBalances, demoChainTxs, demoStakers, pets, saves, squadMembers, squads, treats, userAddresses, users } from '../db/schema'
import { addressFromPublicKey, normalizeAddress } from '../nimiq/address'
import { DemoChain, demoBlockAt, encodeData, stakingContract } from '../nimiq/chain'
import { MIN_STAKE, canAddStake, canCreateStaker, canRetire, nonRetired, type Staker } from '../nimiq/invariants'
import { nim } from '../nimiq/luna'
import { DEMO_POOLS } from '../nimiq/validators'
import { DAY, WEEK } from '../game/config'
import { weekKey } from '../game/streak'
import { id, inviteCode, shortId } from './ids'
import { recompute } from './progress'
import { treatMemo } from './verify'
import type { User } from './api'

export const DEMO_START_BALANCE = nim(50_000)
/** Demo cooldown: ~14h of demo time between deactivation and release. */
export const DEMO_COOLDOWN_BLOCKS = 14 * 3600

export class DemoTxError extends Error {
  constructor(
    readonly type: 'INVALID_TRANSACTION' | 'INVALID_REQUEST',
    message: string,
  ) {
    super(message)
  }
}

const txHash = () => bytesToHex(randomBytes(32))

async function balanceOf(db: Db, address: string) {
  const [b] = await db.select().from(demoBalances).where(eq(demoBalances.address, address))
  return b?.balanceLuna ?? 0n
}
async function setBalance(db: Db, address: string, v: bigint) {
  await db.insert(demoBalances).values({ address, balanceLuna: v }).onConflictDoUpdate({ target: demoBalances.address, set: { balanceLuna: v } })
}
async function stakerOf(db: Db, address: string): Promise<Staker | null> {
  const [s] = await db.select().from(demoStakers).where(eq(demoStakers.address, address))
  return s ? { activeLuna: s.activeLuna, inactiveLuna: s.inactiveLuna, retiredLuna: s.retiredLuna, inactiveRelease: s.inactiveRelease, delegation: s.delegation } : null
}
async function saveStaker(db: Db, address: string, s: Staker) {
  const v = { activeLuna: s.activeLuna, inactiveLuna: s.inactiveLuna, retiredLuna: s.retiredLuna, inactiveRelease: s.inactiveRelease, delegation: s.delegation }
  await db.insert(demoStakers).values({ address, ...v }).onConflictDoUpdate({ target: demoStakers.address, set: v })
}
async function record(db: Db, now: number, from: string, to: string, value: bigint, data?: string) {
  const hash = txHash()
  await db.insert(demoChainTxs).values({ hash, fromAddress: from, toAddress: to, valueLuna: value, recipientData: data ? encodeData(data) : null, blockNumber: demoBlockAt(now) })
  return hash
}

export type DemoWalletRequest =
  | { method: 'sendNewStakerTransaction'; delegation: string; value: string }
  | { method: 'sendStakeTransaction'; value: string }
  | { method: 'sendSetActiveStakeTransaction'; newActiveBalance: string }
  | { method: 'sendRetireStakeTransaction'; retireStake: string }
  | { method: 'sendRemoveStakeTransaction'; value: string }
  | { method: 'sendBasicTransactionWithData'; recipient: string; value: string; data: string }
  | { method: 'getBalance' }

/** Execute a demo wallet call for `address`. Throws DemoTxError when the chain would reject it. */
export async function demoWallet(db: Db, address: string, now: number, req: DemoWalletRequest): Promise<string> {
  const block = demoBlockAt(now)
  const contract = stakingContract()
  const bal = await balanceOf(db, address)
  const staker = await stakerOf(db, address)
  const bad = (m: string): never => {
    throw new DemoTxError('INVALID_TRANSACTION', m)
  }

  switch (req.method) {
    case 'getBalance':
      return bal.toString()
    case 'sendNewStakerTransaction': {
      const value = BigInt(req.value)
      const c = canCreateStaker(staker, value, bal)
      if (!c.ok) bad(c.message)
      if (!normalizeAddress(req.delegation)) bad('Invalid delegation address')
      await setBalance(db, address, bal - value)
      await saveStaker(db, address, { activeLuna: value, inactiveLuna: 0n, retiredLuna: 0n, inactiveRelease: null, delegation: normalizeAddress(req.delegation) })
      return record(db, now, address, contract, value)
    }
    case 'sendStakeTransaction': {
      const value = BigInt(req.value)
      const c = canAddStake(staker, value, bal)
      if (!c.ok) bad(c.message)
      await setBalance(db, address, bal - value)
      await saveStaker(db, address, { ...staker!, activeLuna: staker!.activeLuna + value })
      return record(db, now, address, contract, value)
    }
    case 'sendSetActiveStakeTransaction': {
      if (!staker) bad('No staker')
      const s = staker!
      const newActive = BigInt(req.newActiveBalance)
      const nr = nonRetired(s)
      if (newActive < 0n || newActive > nr) bad('Invalid active balance')
      if (newActive !== 0n && newActive < MIN_STAKE) bad('Active stake must be 0 or at least 100 NIM')
      await saveStaker(db, address, { ...s, activeLuna: newActive, inactiveLuna: nr - newActive, inactiveRelease: nr - newActive > 0n ? block + DEMO_COOLDOWN_BLOCKS : null })
      return record(db, now, address, contract, 0n)
    }
    case 'sendRetireStakeTransaction': {
      if (!staker) bad('No staker')
      const s = staker!
      const amount = BigInt(req.retireStake)
      const c = canRetire(s, amount, block)
      if (!c.ok) bad(c.message)
      const inactive = s.inactiveLuna - amount
      await saveStaker(db, address, { ...s, inactiveLuna: inactive, retiredLuna: s.retiredLuna + amount, inactiveRelease: inactive > 0n ? s.inactiveRelease : null })
      return record(db, now, address, contract, 0n)
    }
    case 'sendRemoveStakeTransaction': {
      if (!staker) bad('No staker')
      const s = staker!
      const value = BigInt(req.value)
      if (value <= 0n || value !== s.retiredLuna) bad('Remove must take the entire retired balance')
      await saveStaker(db, address, { ...s, retiredLuna: 0n })
      await setBalance(db, address, bal + value)
      return record(db, now, contract, address, value)
    }
    case 'sendBasicTransactionWithData': {
      const value = BigInt(req.value)
      const to = normalizeAddress(req.recipient)
      if (!to) bad('Invalid recipient')
      if (value <= 0n || value > bal) bad('Not enough NIM in wallet')
      if (new TextEncoder().encode(req.data).length > 64) bad('Data too long')
      await setBalance(db, address, bal - value)
      await setBalance(db, to!, (await balanceOf(db, to!)) + value)
      return record(db, now, address, to!, value, req.data)
    }
  }
}

// ---------------- Seeding ----------------

const FRIENDS = [
  { name: 'Aman', pattern: [1, 1, 1, 1, 1, 1, 1, 1], stake: 5_200, inSquad: true },
  { name: 'Kavya', pattern: [1, 1, 1, 1, 1, 1, 0, 1], stake: 2_600, inSquad: true },
  { name: 'Rohan', pattern: [0, 1, 1, 1, 1, 1, 1, 1], stake: 21_000, inSquad: true },
  { name: 'Priya', pattern: [1, 1, 0, 1, 1, 1, 1, 0], stake: 1_400, inSquad: true },
  { name: 'Amit', pattern: [1, 0, 1, 1, 0, 1, 1, 1], stake: 800, inSquad: false },
  { name: 'Raj', pattern: [0, 0, 1, 1, 1, 0, 1, 1], stake: 3_100, inSquad: false },
] as const

async function seedFriendWeek(db: Db, friend: User, weeklyLuna: bigint, at: number) {
  const hash = txHash()
  await db.insert(demoChainTxs).values({ hash, fromAddress: friend.primaryAddress, toAddress: stakingContract(), valueLuna: weeklyLuna, blockNumber: demoBlockAt(at) })
  await db.insert(saves).values({ id: id(), userId: friend.id, txHash: hash, kind: 'feed', valueLuna: weeklyLuna, fromAddress: friend.primaryAddress, status: 'confirmed', weekKey: weekKey(at), createdAt: new Date(at), confirmedAt: new Date(at) })
}

/** Seed a fresh demo visitor: wallet balance, 6 friends with history, a squad of 4 friends. */
export async function seedDemo(db: Db, owner: User, now: number) {
  await setBalance(db, owner.primaryAddress, DEMO_START_BALANCE)
  const pool = DEMO_POOLS[0]!.address
  const squadId = shortId()
  await db.insert(squads).values({ id: squadId, name: 'Hostel Savers', inviteCode: inviteCode(), createdBy: owner.id, isDemo: true, createdAt: new Date(now - 9 * WEEK) })
  await db.insert(squadMembers).values({ squadId, userId: owner.id, role: 'admin', joinedAt: new Date(now) })

  for (const f of FRIENDS) {
    const pk = bytesToHex(ed25519.getPublicKey(randomBytes(32)))
    const address = addressFromPublicKey(pk)
    const fid = id()
    await db.insert(users).values({ id: fid, primaryAddress: address, isDemo: true, demoOwnerId: owner.id, delegation: pool, stakerCreatedBySprout: true })
    await db.insert(userAddresses).values({ address, userId: fid, publicKey: pk })
    await db.insert(pets).values({ userId: fid, name: f.name })
    const [friend] = await db.select().from(users).where(eq(users.id, fid))
    const weeksBack = f.pattern.length
    const firstAt = now - weeksBack * WEEK
    await db.update(users).set({ plantedAt: new Date(firstAt), firstPlantedWeek: weekKey(firstAt) }).where(eq(users.id, fid))
    for (let i = 0; i < weeksBack; i++) {
      if (f.pattern[i]) await seedFriendWeek(db, friend!, nim(500), now - (weeksBack - i) * WEEK + DAY)
    }
    await saveStaker(db, address, { activeLuna: nim(f.stake), inactiveLuna: 0n, retiredLuna: 0n, inactiveRelease: null, delegation: pool })
    await setBalance(db, address, nim(2_000))
    if (f.inSquad) await db.insert(squadMembers).values({ squadId, userId: fid, role: 'member', joinedAt: new Date(now - 9 * WEEK) })
    // Aman, Kavya and Rohan already saved this week; Priya hasn't yet.
    if (f.inSquad && f.name !== 'Priya') await seedFriendWeek(db, friend!, nim(500), now)
    await recompute(db, fid, now, { stakeLuna: nim(f.stake) })
  }
  return squadId
}

/** Fast-forward a week for the visitor and keep their seeded friends' habits going. */
export async function fastForward(db: Db, owner: User) {
  const offset = owner.clockOffsetMs + WEEK
  await db.update(users).set({ clockOffsetMs: offset }).where(sql`${users.id} = ${owner.id} or ${users.demoOwnerId} = ${owner.id}`)
  const now = Date.now() + offset
  const friends = await db.select().from(users).where(eq(users.demoOwnerId, owner.id))
  const step = Math.round(offset / WEEK)
  for (const [i, f] of friends.entries()) {
    const pattern = FRIENDS[i]?.pattern ?? [1]
    // deterministic: reuse each friend's habit pattern cyclically (no randomness)
    if (pattern[step % pattern.length]) await seedFriendWeek(db, f, nim(500), now)
    const [s] = await db.select().from(demoStakers).where(eq(demoStakers.address, f.primaryAddress))
    await recompute(db, f.id, now, { stakeLuna: s ? s.activeLuna + s.inactiveLuna + s.retiredLuna : 0n })
  }
  return now
}

/** A friend sends the visitor a treat (round-robin, deterministic). Verified like a real one. */
export async function simulateTreat(db: Db, owner: User, now: number) {
  const [membership] = await db
    .select({ squadId: squadMembers.squadId })
    .from(squadMembers)
    .innerJoin(squads, eq(squads.id, squadMembers.squadId))
    .where(and(eq(squadMembers.userId, owner.id), eq(squads.isDemo, true)))
  if (!membership) throw new DemoTxError('INVALID_REQUEST', 'Join or create a squad first')
  const friends = await db
    .select({ id: users.id, address: users.primaryAddress })
    .from(squadMembers)
    .innerJoin(users, eq(users.id, squadMembers.userId))
    .where(and(eq(squadMembers.squadId, membership.squadId), eq(users.demoOwnerId, owner.id)))
  if (!friends.length) throw new DemoTxError('INVALID_REQUEST', 'No friends in your squad yet')
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(treats).where(eq(treats.toUser, owner.id))
  const from = friends[Number(n) % friends.length]!
  const notes = ['Keep going! 💪', 'Proud of you 🌱', 'Snack for Sprout 🍪']
  const value = nim(5)
  const bal = await balanceOf(db, from.address)
  await setBalance(db, from.address, bal - value)
  await setBalance(db, owner.primaryAddress, (await balanceOf(db, owner.primaryAddress)) + value)
  const hash = await record(db, now, from.address, owner.primaryAddress, value, treatMemo(membership.squadId))
  const tid = id()
  await db.insert(treats).values({ id: tid, squadId: membership.squadId, fromUser: from.id, toUser: owner.id, txHash: hash, valueLuna: value, note: notes[Number(n) % notes.length], createdAt: new Date(now) })
  return tid
}

/** Restaking pool pays rewards into the stake: provable "grew overnight". */
export async function simulateRewards(db: Db, owner: User, amount = nim(20)) {
  const s = await stakerOf(db, owner.primaryAddress)
  if (!s || s.activeLuna <= 0n) throw new DemoTxError('INVALID_REQUEST', 'Plant your seed first to earn rewards')
  await saveStaker(db, owner.primaryAddress, { ...s, activeLuna: s.activeLuna + amount })
}

export { DemoChain }
