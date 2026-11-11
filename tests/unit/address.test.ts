import { describe, expect, it } from 'vitest'
import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { addressFromBytes, addressFromPublicKey, isValidAddress, normalizeAddress, shortAddress } from '@/lib/nimiq/address'

// Independent vectors: well-known Nimiq addresses whose bytes are known.
// The burn address is 20 zero bytes; the staking contract is 19 zero bytes + 0x01.
const BURN = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'
const STAKING = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001'

describe('address', () => {
  it('encodes the burn address (all-zero bytes)', () => {
    expect(addressFromBytes(new Uint8Array(20))).toBe(BURN)
  })

  it('encodes the staking contract address', () => {
    const b = new Uint8Array(20)
    b[19] = 1
    expect(addressFromBytes(b)).toBe(STAKING)
  })

  it('derives a well-formed address from a public key', () => {
    const pk = bytesToHex(ed25519.getPublicKey(new Uint8Array(32).fill(7)))
    const a = addressFromPublicKey(pk)
    expect(a).toMatch(/^NQ\d{2}( [0-9A-HJ-NP-VXY]{4}){8}$/)
    expect(a.split(' ')).toHaveLength(9)
    expect(isValidAddress(a)).toBe(true)
    expect(addressFromPublicKey(pk)).toBe(a) // deterministic
  })

  it('validates and normalizes', () => {
    expect(normalizeAddress('nq07 0000 0000 0000 0000 0000 0000 0000 0000')).toBe(BURN)
    expect(normalizeAddress(BURN.replace(/ /g, ''))).toBe(BURN)
    expect(normalizeAddress('NQ08 0000 0000 0000 0000 0000 0000 0000 0000')).toBeNull() // bad checksum
    expect(normalizeAddress('NQ07 0000 0000 0000 0000 0000 0000 0000 000I')).toBeNull() // bad alphabet
    expect(normalizeAddress('hello')).toBeNull()
  })

  it('rejects wrong-length public keys', () => {
    expect(() => addressFromPublicKey('00')).toThrow()
  })

  it('shortens for display', () => {
    expect(shortAddress(STAKING)).toBe('NQ77 … 0001')
  })

  it.todo('matches listAccounts() for a public key captured on a real phone (docs/09 §4)')
})
