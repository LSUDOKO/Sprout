import { describe, expect, it } from 'vitest'
import { LUNA_PER_NIM, formatDelta, formatNim, fromWire, nim, parseNim, toSdkNumber, toWire } from '@/lib/nimiq/luna'

describe('luna', () => {
  it('1 NIM = 100,000 Luna', () => {
    expect(LUNA_PER_NIM).toBe(100_000n)
    expect(nim(1)).toBe(100_000n)
    expect(nim(100)).toBe(10_000_000n)
  })

  it('formats with thousands separators and trims trailing zeros', () => {
    expect(formatNim(nim(1000))).toBe('1,000')
    expect(formatNim(123_456_789n)).toBe('1,234.56')
    expect(formatNim(50_000n)).toBe('0.5')
    expect(formatNim(0n)).toBe('0')
    expect(formatNim(nim(1_000_000))).toBe('1,000,000')
    expect(formatNim(123_456n, 5)).toBe('1.23456')
  })

  it('never rounds a balance up', () => {
    expect(formatNim(199_999n)).toBe('1.99')
  })

  it('has no float drift (0.1 + 0.2)', () => {
    const a = parseNim('0.1')!
    const b = parseNim('0.2')!
    expect(a + b).toBe(parseNim('0.3'))
    expect(formatNim(a + b)).toBe('0.3')
  })

  it('parses user input', () => {
    expect(parseNim('1,000.5')).toBe(100_050_000n)
    expect(parseNim(' 25 ')).toBe(2_500_000n)
    expect(parseNim('.5')).toBe(50_000n)
    expect(parseNim('1.000001')).toBeNull()
    expect(parseNim('abc')).toBeNull()
    expect(parseNim('-5')).toBeNull()
    expect(parseNim('')).toBeNull()
  })

  it('signs deltas', () => {
    expect(formatDelta(320_000n)).toBe('+3.2')
    expect(formatDelta(-nim(5))).toBe('-5')
    expect(formatDelta(0n)).toBe('0')
  })

  it('round-trips through the wire format', () => {
    const big = 9_007_199_254_740_993n // > 2^53
    expect(fromWire(toWire(big))).toBe(big)
    expect(() => fromWire('1.5')).toThrow()
    expect(() => fromWire(0.5)).toThrow()
  })

  it('only hands safe integers to the SDK', () => {
    expect(toSdkNumber(nim(100))).toBe(10_000_000)
    expect(() => toSdkNumber(-1n)).toThrow()
    expect(() => toSdkNumber(9_007_199_254_740_993n)).toThrow()
  })
})
