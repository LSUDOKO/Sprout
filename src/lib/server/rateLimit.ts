// Fixed-window rate limit stored in the DB (works on serverless without Redis).
import 'server-only'
import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { rateLimits } from '../db/schema'
import { ApiError } from './api'

export async function rateLimit(db: Db, key: string, limit: number, windowMs = 60_000) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - windowMs)
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        // postgres-js can't bind a raw Date inside sql``: pass ISO strings with explicit casts.
        count: sql`case when ${rateLimits.windowStart} < ${cutoff.toISOString()}::timestamptz then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < ${cutoff.toISOString()}::timestamptz then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count })
  if ((row?.count ?? 0) > limit) throw new ApiError(429, 'rate_limited', 'Too many requests, slow down a little')
}
