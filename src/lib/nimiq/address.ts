// Nimiq address encoding: first 20 bytes of Blake2b-256(publicKey), Nimiq base32,
// IBAN-style "NQ" + 2-digit checksum, printed in groups of 4. (docs/03 §3.3)
import { blake2b } from '@noble/hashes/blake2.js'
import { hexToBytes } from '@noble/hashes/utils.js'

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY' // no I, O, W, Z

function toBase32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = ((value << 8) | b) & 0xffff
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

function fromBase32(str: string): Uint8Array | null {
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch)
    if (idx < 0) return null
    value = ((value << 5) | idx) & 0xffff
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Uint8Array.from(out)
}

/** ISO 13616 mod-97 over the alphanumeric string (letters → 10..35). */
function ibanMod97(str: string): number {
  const num = str
    .toUpperCase()
    .split('')
    .map((c) => {
      const code = c.charCodeAt(0)
      return code >= 48 && code <= 57 ? c : (code - 55).toString()
    })
    .join('')
  let rem = 0
  for (let i = 0; i < num.length; i += 6) rem = Number(String(rem) + num.slice(i, i + 6)) % 97
  return rem
}

const formatGroups = (raw: string) => raw.replace(/.{4}/g, '$& ').trim()

export function addressFromBytes(addr20: Uint8Array): string {
  if (addr20.length !== 20) throw new Error('Address must be 20 bytes')
  const base32 = toBase32(addr20)
  const check = String(98 - ibanMod97(base32 + 'NQ00')).padStart(2, '0')
  return formatGroups('NQ' + check + base32)
}

export function addressFromPublicKey(publicKeyHex: string): string {
  const pk = hexToBytes(publicKeyHex)
  if (pk.length !== 32) throw new Error('Public key must be 32 bytes')
  return addressFromBytes(blake2b(pk, { dkLen: 32 }).subarray(0, 20))
}

/** Uppercase, strip spaces, re-group. Returns null when the address is not valid. */
export function normalizeAddress(input: string): string | null {
  const raw = input.replace(/\s+/g, '').toUpperCase()
  if (!/^NQ\d{2}[0-9A-HJ-NP-VXY]{32}$/.test(raw)) return null
  const body = raw.slice(4)
  if (ibanMod97(body + raw.slice(0, 4)) !== 1) return null
  const bytes = fromBase32(body)
  if (!bytes || bytes.length !== 20) return null
  return formatGroups(raw)
}

export const isValidAddress = (input: string) => normalizeAddress(input) !== null

/** "NQ07 0000 … 0000" → "NQ07 … 0000" for compact UI. */
export function shortAddress(address: string): string {
  const g = address.split(' ')
  return g.length < 3 ? address : `${g[0]} … ${g[g.length - 1]}`
}
