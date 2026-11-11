// Cross-check our address encoding and signature verification against Nimiq's official
// @nimiq/core (the Albatross client), so we don't depend on our own reading of the format.
import { describe, expect, it } from 'vitest'
import * as Nimiq from '@nimiq/core'
import { addressFromPublicKey } from '@/lib/nimiq/address'
import { hashNimiqMessage, verifyNimiqMessage } from '@/lib/nimiq/signature'

describe('agrees with @nimiq/core', () => {
  it('derives the same user-friendly address for 20 random keys', () => {
    for (let i = 0; i < 20; i++) {
      const sk = Nimiq.PrivateKey.generate()
      const pk = Nimiq.PublicKey.derive(sk)
      expect(addressFromPublicKey(pk.toHex())).toBe(pk.toAddress().toUserFriendlyAddress())
    }
  })

  it('verifies a Nimiq-signed message made by the official library', () => {
    const sk = Nimiq.PrivateKey.generate()
    const pk = Nimiq.PublicKey.derive(sk)
    const message = 'Sprout sign-in\nNonce: abc123\nIssued: 2026-11-11T10:00:00Z'
    const sig = Nimiq.Signature.create(sk, pk, hashNimiqMessage(message))
    expect(pk.verify(sig, hashNimiqMessage(message))).toBe(true)
    expect(verifyNimiqMessage(message, pk.toHex(), sig.toHex())).toBe(true)
    expect(verifyNimiqMessage(message + '!', pk.toHex(), sig.toHex())).toBe(false)
  })
})
