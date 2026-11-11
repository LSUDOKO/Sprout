import { customAlphabet } from 'nanoid'
import { SQUAD } from '../game/config'

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
/** Short base62 id (≤ 10 chars keeps the treat memo `sprout:t:<squadId>` well under 64 bytes). */
export const shortId = customAlphabet(BASE62, 10)
export const id = customAlphabet(BASE62, 16)
export const inviteCode = customAlphabet(SQUAD.codeAlphabet, SQUAD.codeLength)
export const nonce = customAlphabet('0123456789abcdef', 24)
