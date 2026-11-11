// Single-use, expiring sign challenges → verified address.
import 'server-only'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Db } from '../db'
import { authChallenges } from '../db/schema'
import { verifyNimiqMessage } from '../nimiq/signature'
import { addressFromPublicKey } from '../nimiq/address'
import { ApiError } from './api'

export async function consumeChallenge(db: Db, p: { challenge: string; publicKey: string; signature: string; purpose: 'signin' | 'link' | 'join'; userId?: string }) {
  const now = new Date()
  // Mark used atomically first: a replayed challenge finds nothing to update.
  const [row] = await db
    .update(authChallenges)
    .set({ usedAt: now })
    .where(and(eq(authChallenges.challenge, p.challenge), eq(authChallenges.purpose, p.purpose), isNull(authChallenges.usedAt), gt(authChallenges.expiresAt, now)))
    .returning()
  if (!row) throw new ApiError(400, 'challenge_invalid', 'This sign request expired. Please try again.')
  if (p.userId && row.userId !== p.userId) throw new ApiError(400, 'challenge_invalid')
  if (!verifyNimiqMessage(p.challenge, p.publicKey, p.signature)) throw new ApiError(400, 'bad_signature', 'Signature could not be verified')
  return { address: addressFromPublicKey(p.publicKey), publicKey: p.publicKey.toLowerCase() }
}
