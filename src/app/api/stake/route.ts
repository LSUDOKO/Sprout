import { handle, json, requireUser } from '@/lib/server/api'
import { earnedFor, readTotals } from '@/lib/server/account'
import { chainFor, linkedAddresses } from '@/lib/server/verify'
import { totalStake } from '@/lib/nimiq/invariants'
import { MIN_STAKE } from '@/lib/nimiq/invariants'
import { poolByAddress } from '@/lib/nimiq/validators'

export const GET = handle(async () => {
  const { db, user, now } = await requireUser()
  const chain = chainFor(db, user, now)
  const addresses = await linkedAddresses(db, user.id)
  const [{ totals, stale }, currentBlock, walletLuna] = await Promise.all([
    readTotals(db, chain, addresses),
    chain.getBlockNumber().catch(() => null),
    chain.getBalance(user.primaryAddress).catch(() => null),
  ])
  if (!totals) return json({ error: 'chain_unavailable', message: 'Confirmations are delayed' }, { status: 503 })
  const total = totalStake(totals)
  return json({
    activeLuna: totals.activeLuna,
    inactiveLuna: totals.inactiveLuna,
    retiredLuna: totals.retiredLuna,
    inactiveRelease: totals.inactiveRelease,
    currentBlock,
    delegation: totals.delegation,
    pool: await poolByAddress(totals.delegation),
    earnedLuna: stale ? null : await earnedFor(db, user, totals),
    planted: total >= MIN_STAKE,
    hasStaker: totals.delegation !== null || total > 0n,
    walletLuna: chain.kind === 'demo' ? walletLuna : null,
    stale,
  })
})
