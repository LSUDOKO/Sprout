// Fixtures are real responses recorded from a Nimiq mainnet node (rpc.nimiqwatch.com) on 2026-11-11.
import { describe, expect, it } from 'vitest'
import { RpcError, adaptStaker, adaptTx, isNotFound, rpcErrorText } from '@/lib/nimiq/chain'
import { adaptValidator, recommend } from '@/lib/nimiq/validators'

const TX = {
  hash: '3e50fb8e26386aa53f0315c5fd47a8cbe2ba024244747feaa96f20e544142c85',
  blockNumber: 66621016,
  timestamp: 1794406385333,
  confirmations: 32,
  from: 'NQ98 D3KE 8EQ8 Y7DK G1MT 3P5T 2PHX 18V5 UEC1',
  fromType: 0,
  to: 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001',
  toType: 3,
  value: 158120514,
  fee: 0,
  senderData: '',
  recipientData: '06e7786f1c9ed1a0bc4198bb9fd430633fc4534b7e',
  executionResult: true,
}
const STAKER = { address: 'NQ19 UVU6 X74X S6GB QGCQ PEFV 8C33 7Y25 6JTX', balance: 20300446638, delegation: 'NQ98 D3KE 8EQ8 Y7DK G1MT 3P5T 2PHX 18V5 UEC1', inactiveBalance: 0, inactiveFrom: null, retiredBalance: 0 }

describe('mainnet RPC adapters', () => {
  it('maps a real staking transaction', () => {
    const t = adaptTx(TX)
    expect(t).toMatchObject({ to: 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001', value: 158_120_514n, executed: true, confirmations: 32, timestamp: 1794406385333 })
  })
  it('keeps a missing executionResult unknown, never success', () => {
    const { executionResult: _drop, ...noResult } = TX
    void _drop
    expect(adaptTx(noResult).executed).toBeNull()
  })
  it('maps a real staker and estimates release from inactiveFrom', () => {
    expect(adaptStaker(STAKER)).toEqual({ activeLuna: 20_300_446_638n, inactiveLuna: 0n, retiredLuna: 0n, inactiveRelease: null, delegation: STAKER.delegation })
    expect(adaptStaker({ ...STAKER, inactiveBalance: 10_000_000, inactiveFrom: 1000 }, 43_200).inactiveRelease).toBe(44_200)
  })
  it('reads "not found" from error.data, as real nodes send it', () => {
    const noStaker = { code: -32603, message: 'Internal error', data: 'No staker with address: NQ07 0000 0000 0000 0000 0000 0000 0000 0000' }
    const noTx = { code: -32603, message: 'Internal error', data: 'Transaction not found: 00ab' }
    expect(isNotFound(new RpcError(rpcErrorText(noStaker), -32603))).toBe(true)
    expect(isNotFound(new RpcError(rpcErrorText(noTx), -32603))).toBe(true)
    expect(isNotFound(new RpcError(rpcErrorText({ message: 'Internal error' }), -32603))).toBe(false)
  })
})

describe('validators API adapter (real shape)', () => {
  const raw = [
    { name: 'Nimiq Surf', address: 'NQ51 SURF MCTM AQXM 15PA K9FX 8EEX 29BE VGH8', fee: 0, payoutType: 'none', isListed: true, score: { total: 0.99 }, logo: null },
    { name: 'nim.re Staking Pool', address: 'NQ98 D3KE 8EQ8 Y7DK G1MT 3P5T 2PHX 18V5 UEC1', fee: 0.0333, payoutType: 'restake', isListed: true, score: { total: 0.98 } },
    { name: 'Unlisted', address: 'NQ19 UVU6 X74X S6GB QGCQ PEFV 8C33 7Y25 6JTX', fee: 0.01, payoutType: 'restake', isListed: false, score: { total: 1 } },
  ]
  it('maps fee fractions to percent and recommends a listed restaking pool', () => {
    const pools = recommend(raw.map(adaptValidator).filter((p) => !!p))
    const nimre = pools.find((p) => p.name === 'nim.re Staking Pool')!
    expect(nimre.feePct).toBe(3.33)
    expect(nimre.payout).toBe('restake')
    expect(nimre.recommended).toBe(true)
    expect(pools.find((p) => p.name === 'Unlisted')!.active).toBe(false)
  })
})
