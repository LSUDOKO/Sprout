// Nimiq signed messages: Ed25519 over sha256("\x16Nimiq Signed Message:\n" + length + message).
// Shared by the server verifier and the demo mock wallet so both use the exact same bytes. (docs/03 §3.2)
import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js'

const PREFIX = '\x16Nimiq Signed Message:\n'
const ASCII_ONLY = /^[\x20-\x7E\n]+$/

/** Challenges are ASCII-only so character length equals byte length (no ambiguity). */
export const isAsciiMessage = (message: string) => ASCII_ONLY.test(message)

export function hashNimiqMessage(message: string): Uint8Array {
  return sha256(utf8ToBytes(PREFIX + message.length + message))
}

export function verifyNimiqMessage(message: string, publicKeyHex: string, signatureHex: string): boolean {
  if (!isAsciiMessage(message)) return false
  if (!/^[0-9a-fA-F]{64}$/.test(publicKeyHex) || !/^[0-9a-fA-F]{128}$/.test(signatureHex)) return false
  try {
    return ed25519.verify(hexToBytes(signatureHex), hashNimiqMessage(message), hexToBytes(publicKeyHex))
  } catch {
    return false
  }
}
