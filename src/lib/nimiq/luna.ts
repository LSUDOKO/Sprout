// Shared (client + server). Money is always an integer number of Luna as `bigint`.
// 1 NIM = 100,000 Luna. Floats never touch money: parsing and formatting are string based.

export const LUNA_PER_NIM = 100_000n
export const NIM_DECIMALS = 5

export const nim = (whole: number | bigint): bigint => BigInt(whole) * LUNA_PER_NIM

/** Parse user input like "1,000.5" or "25" into Luna. Returns null when invalid. */
export function parseNim(input: string): bigint | null {
  const s = input.trim().replace(/[,\s_]/g, '')
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(s)) return null
  const [intPart = '0', frac = ''] = s.split('.')
  if (frac.length > NIM_DECIMALS) return null
  return BigInt(intPart || '0') * LUNA_PER_NIM + BigInt(frac.padEnd(NIM_DECIMALS, '0') || '0')
}

/** Group an integer string with thousands separators. */
function group(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format Luna as NIM for display. `maxDecimals` trims (never rounds up) the fraction,
 * so a balance is never displayed as more than it is.
 */
export function formatNim(luna: bigint, maxDecimals = 2): string {
  const neg = luna < 0n
  const abs = neg ? -luna : luna
  const whole = abs / LUNA_PER_NIM
  const frac = (abs % LUNA_PER_NIM).toString().padStart(NIM_DECIMALS, '0').slice(0, maxDecimals).replace(/0+$/, '')
  return (neg ? '-' : '') + group(whole.toString()) + (frac ? '.' + frac : '')
}

/** Signed display with a leading "+" for gains: "+3.2". */
export function formatDelta(luna: bigint, maxDecimals = 2): string {
  return (luna > 0n ? '+' : '') + formatNim(luna, maxDecimals)
}

/** Luna travels in JSON as decimal strings (JSON cannot encode bigint). */
export const toWire = (luna: bigint): string => luna.toString()
export function fromWire(v: string | number | bigint | null | undefined): bigint {
  if (v === null || v === undefined || v === '') return 0n
  if (typeof v === 'bigint') return v
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new RangeError('Luna must be a safe integer')
    return BigInt(v)
  }
  if (!/^-?\d+$/.test(v)) throw new RangeError(`Invalid Luna value: ${v}`)
  return BigInt(v)
}

/** The Nimiq SDK takes Luna as `number`. Only call this at the wallet boundary. */
export function toSdkNumber(luna: bigint): number {
  if (luna < 0n || luna > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Luna out of range for SDK')
  return Number(luna)
}
