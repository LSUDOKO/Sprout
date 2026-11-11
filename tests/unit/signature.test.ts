import { describe, expect, it } from 'vitest'
import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { hashNimiqMessage, verifyNimiqMessage } from '@/lib/nimiq/signature'

const secret = new Uint8Array(32).fill(42)
const pub = bytesToHex(ed25519.getPublicKey(secret))
const message = 'Sprout sign-in\nNonce: 8f3a\nIssued: 2026-11-12T10:00:00Z'
const sign = (m: string) => bytesToHex(ed25519.sign(hashNimiqMessage(m), secret))

describe('signature', () => {
  it('accepts a valid Nimiq-format signature', () => {
    expect(verifyNimiqMessage(message, pub, sign(message))).toBe(true)
  })

  it('rejects a different message', () => {
    expect(verifyNimiqMessage(message + 'x', pub, sign(message))).toBe(false)
  })

  it('rejects a different key', () => {
    const other = bytesToHex(ed25519.getPublicKey(new Uint8Array(32).fill(1)))
    expect(verifyNimiqMessage(message, other, sign(message))).toBe(false)
  })

  it('rejects non-ASCII challenges', () => {
    const m = 'Sprout 🌱'
    expect(verifyNimiqMessage(m, pub, bytesToHex(ed25519.sign(hashNimiqMessage(m), secret)))).toBe(false)
  })

  it('rejects malformed hex without throwing', () => {
    expect(verifyNimiqMessage(message, 'zz', 'zz')).toBe(false)
    expect(verifyNimiqMessage(message, pub, '00'.repeat(64))).toBe(false)
  })

  it('uses the length-prefixed format (a raw sha256 signature does not verify)', () => {
    const naive = bytesToHex(ed25519.sign(new TextEncoder().encode(message), secret))
    expect(verifyNimiqMessage(message, pub, naive)).toBe(false)
  })

  it.todo('verifies a signature captured from Nimiq Pay on a real phone (docs/09 §4)')
})
