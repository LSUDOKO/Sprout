import { describe, expect, it } from 'vitest'
import { NimiqProviderError } from '@nimiq/mini-app-sdk'
import { classify } from '@/lib/nimiq/wallet'

const err = (type: string) => new NimiqProviderError(type, `${type} happened`)

describe('wallet error classification (docs/03 §1)', () => {
  it('maps every provider error type', () => {
    expect(classify(err('PERMISSION_DENIED')).kind).toBe('cancelled')
    expect(classify(err('UNKNOWN_REQUEST')).kind).toBe('unsupported')
    expect(classify(err('INVALID_TRANSACTION')).kind).toBe('invalid')
    expect(classify(err('INVALID_REQUEST')).kind).toBe('invalid')
    expect(classify(err('SOMETHING_ELSE')).kind).toBe('error')
  })
  it('treats possibly-submitted outcomes as unknown, never as failed', () => {
    expect(classify(err('NETWORK_ERROR')).kind).toBe('unknown_outcome')
    expect(classify(err('TRANSACTION_OUTCOME_UNKNOWN')).kind).toBe('unknown_outcome')
    expect(classify(err('DUPLICATE_PAYMENT')).kind).toBe('unknown_outcome')
  })
  it('detects "not inside Nimiq Pay"', () => {
    expect(classify(new Error('Nimiq provider injection timeout')).kind).toBe('not_in_app')
    expect(classify(new Error('boom')).kind).toBe('error')
  })
})
