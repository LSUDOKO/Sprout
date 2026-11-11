// Service-level integration test against an in-memory PGlite: plant → verify → recompute,
// idempotency, needs_link, amount mismatch, withdraw steps, treats with memos.
import { beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'

process.env.PGLITE_DIR = 'memory'
const { getDb } = await import('@/lib/db')
const S = await import('@/lib/db/schema')
const { addressFromPublicKey } = await import('@/lib/nimiq/address')
const { demoWallet, seedDemo, simulateTreat, DEMO_COOLDOWN_BLOCKS } = await import('@/lib/server/demo')
const { verifySave, verifyWithdrawal, verifyTreat } = await import('@/lib/server/verify')
const { meSnapshot } = await import('@/lib/server/account')
const { DemoChain } = await import('@/lib/nimiq/chain')
const { nim } = await import('@/lib/nimiq/luna')
const { DEMO_POOLS } = await import('@/lib/nimiq/validators')
const { id } = await import('@/lib/server/ids')

type Db = Awaited<ReturnType<typeof getDb>>
let db: Db
const T0 = Date.parse('2026-11-11T12:00:00Z')

async function makeUser(db: Db) {
  const pk = bytesToHex(ed25519.getPublicKey(randomBytes(32)))
  const address = addressFromPublicKey(pk)
  const uid = id()
  await db.insert(S.users).values({ id: uid, primaryAddress: address, isDemo: true })
  await db.insert(S.userAddresses).values({ address, userId: uid, publicKey: pk })
  await db.insert(S.pets).values({ userId: uid, name: 'Pip' })
  const [u] = await db.select().from(S.users).where(eq(S.users.id, uid))
  return u!
}
const fresh = async (uid: string) => (await db.select().from(S.users).where(eq(S.users.id, uid)))[0]!
async function registerSave(uid: string, hash: string, kind: 'plant' | 'feed', value: bigint, at: number) {
  const sid = id()
  await db.insert(S.saves).values({ id: sid, userId: uid, txHash: hash, kind, valueLuna: value, createdAt: new Date(at) })
  return (await db.select().from(S.saves).where(eq(S.saves.id, sid)))[0]!
}

beforeAll(async () => {
  db = await getDb()
})

describe('demo save flow', () => {
  it('plant → pending until 2 confirmations → confirmed with recompute, idempotent', async () => {
    const u = await makeUser(db)
    await seedDemo(db, u, T0)
    const hash = await demoWallet(db, u.primaryAddress, T0, { method: 'sendNewStakerTransaction', delegation: DEMO_POOLS[0]!.address, value: nim(600).toString() })
    const save = await registerSave(u.id, hash, 'plant', nim(600), T0)

    expect((await verifySave(db, save, u, T0)).status).toBe('pending') // 1 confirmation
    const r = await verifySave(db, save, u, T0 + 3000)
    expect(r.status).toBe('confirmed')
    expect(r.result).toMatchObject({ weekKept: true, weekJustKept: true, streak: 1, stageAfter: 'seed' })
    expect(r.result!.sparksAwarded).toBe(10 + 35) // save + week kept (streak 1)
    expect(r.result!.badgesEarned).toEqual(expect.arrayContaining(['first_seed', 'week_one']))

    // running verification again changes nothing
    const [again] = await db.select().from(S.saves).where(eq(S.saves.id, save.id))
    const r2 = await verifySave(db, again!, await fresh(u.id), T0 + 9000)
    expect(r2.status).toBe('confirmed')
    const ledger = await db.select().from(S.sparksLedger).where(eq(S.sparksLedger.userId, u.id))
    expect(ledger.reduce((s, l) => s + l.delta, 0)).toBe(45)

    const me = await meSnapshot(db, await fresh(u.id), new DemoChain(db, T0 + 9000), [u.primaryAddress], T0 + 9000)
    expect(me.stake?.totalLuna).toBe(nim(600))
    expect(me.stake?.earnedLuna).toBe(0n)
    expect(me.streak.current).toBe(1)
    expect(me.week.kept).toBe(true)
  })

  it('demo wallet refuses what the chain would reject', async () => {
    const u = await makeUser(db)
    await seedDemo(db, u, T0)
    await expect(demoWallet(db, u.primaryAddress, T0, { method: 'sendNewStakerTransaction', delegation: DEMO_POOLS[0]!.address, value: nim(50).toString() })).rejects.toThrow(/100 NIM/)
    await expect(demoWallet(db, u.primaryAddress, T0, { method: 'sendStakeTransaction', value: nim(5).toString() })).rejects.toThrow(/Plant/)
  })

  it('amount mismatch fails, foreign sender needs a link', async () => {
    const u = await makeUser(db)
    await seedDemo(db, u, T0)
    const hash = await demoWallet(db, u.primaryAddress, T0, { method: 'sendNewStakerTransaction', delegation: DEMO_POOLS[0]!.address, value: nim(100).toString() })
    const lie = await registerSave(u.id, hash, 'plant', nim(999), T0)
    expect((await verifySave(db, lie, u, T0 + 3000)).status).toBe('failed')

    const other = await makeUser(db)
    await db.insert(S.demoBalances).values({ address: other.primaryAddress, balanceLuna: nim(1000) })
    const h2 = await demoWallet(db, other.primaryAddress, T0, { method: 'sendNewStakerTransaction', delegation: DEMO_POOLS[0]!.address, value: nim(100).toString() })
    const claim = await registerSave(u.id, h2, 'plant', nim(100), T0)
    expect((await verifySave(db, claim, u, T0 + 3000)).status).toBe('needs_link')
  })

  it('withdraw: deactivate → cooldown → retire → remove, stage shrinks, streak stays', async () => {
    const u = await makeUser(db)
    await seedDemo(db, u, T0)
    const h = await demoWallet(db, u.primaryAddress, T0, { method: 'sendNewStakerTransaction', delegation: DEMO_POOLS[0]!.address, value: nim(1000).toString() })
    await verifySave(db, await registerSave(u.id, h, 'plant', nim(1000), T0), u, T0 + 3000)
    expect((await db.select().from(S.pets).where(eq(S.pets.userId, u.id)))[0]!.stage).toBe('sprout')

    const t1 = T0 + 10_000
    const d = await demoWallet(db, u.primaryAddress, t1, { method: 'sendSetActiveStakeTransaction', newActiveBalance: '0' })
    await db.insert(S.withdrawals).values({ id: 'w1', userId: u.id, step: 'deactivate', txHash: d, valueLuna: nim(1000), createdAt: new Date(t1) })
    const w1 = (await db.select().from(S.withdrawals).where(eq(S.withdrawals.id, 'w1')))[0]!
    expect(await verifyWithdrawal(db, w1, u, t1 + 3000)).toBe('confirmed')

    await expect(demoWallet(db, u.primaryAddress, t1 + 5000, { method: 'sendRetireStakeTransaction', retireStake: nim(1000).toString() })).rejects.toThrow(/cooling/)
    const t2 = t1 + (DEMO_COOLDOWN_BLOCKS + 5) * 1000
    await demoWallet(db, u.primaryAddress, t2, { method: 'sendRetireStakeTransaction', retireStake: nim(1000).toString() })
    await expect(demoWallet(db, u.primaryAddress, t2, { method: 'sendRemoveStakeTransaction', value: nim(10).toString() })).rejects.toThrow(/entire/)
    const rm = await demoWallet(db, u.primaryAddress, t2, { method: 'sendRemoveStakeTransaction', value: nim(1000).toString() })
    await db.insert(S.withdrawals).values({ id: 'w3', userId: u.id, step: 'remove', txHash: rm, valueLuna: nim(1000), createdAt: new Date(t2) })
    expect(await verifyWithdrawal(db, (await db.select().from(S.withdrawals).where(eq(S.withdrawals.id, 'w3')))[0]!, u, t2 + 3000)).toBe('confirmed')

    expect((await db.select().from(S.pets).where(eq(S.pets.userId, u.id)))[0]!.stage).toBe('seed')
    expect((await db.select().from(S.streaks).where(eq(S.streaks.userId, u.id)))[0]!.current).toBe(1)
  })

  it('simulated treat verifies the memo and both memberships', async () => {
    const u = await makeUser(db)
    await seedDemo(db, u, T0)
    const tid = await simulateTreat(db, u, T0)
    const [t] = await db.select().from(S.treats).where(eq(S.treats.id, tid))
    const [sender] = await db.select().from(S.users).where(eq(S.users.id, t!.fromUser))
    expect(await verifyTreat(db, t!, sender!, T0 + 3000)).toBe('confirmed')

    // a forged memo is rejected
    const [other] = await db.select().from(S.treats).where(eq(S.treats.id, tid))
    await db.update(S.demoChainTxs).set({ recipientData: Buffer.from('sprout:t:WRONG').toString('hex') }).where(eq(S.demoChainTxs.hash, other!.txHash))
    await db.insert(S.treats).values({ id: 'forged', squadId: t!.squadId, fromUser: t!.fromUser, toUser: u.id, txHash: other!.txHash + 'x', valueLuna: t!.valueLuna, createdAt: new Date(T0) })
    // unknown hash → never credited
    const [forged] = await db.select().from(S.treats).where(eq(S.treats.id, 'forged'))
    expect(await verifyTreat(db, forged!, sender!, T0 + 3000)).not.toBe('confirmed')
  })
})
