// Route helpers: JSON responses, zod body parsing, auth guards, typed errors.
import 'server-only'
import { NextResponse } from 'next/server'
import type { ZodType } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, type Db } from '../db'
import { users } from '../db/schema'
import { getSession, type Session } from '../auth/session'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code)
  }
}

/** JSON with bigint → string (Luna travels as decimal strings). */
export function json(data: unknown, init?: ResponseInit) {
  return new NextResponse(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)), {
    ...init,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...init?.headers },
  })
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError(400, 'bad_json')
  }
  const r = schema.safeParse(raw)
  if (!r.success) throw new ApiError(400, 'invalid_body', r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  return r.data
}

export type User = typeof users.$inferSelect
export type Ctx = { db: Db; session: Session; user: User; now: number }

/** Effective "now" for a user: real time, or fast-forwarded time for demo users. */
export const nowFor = (user: Pick<User, 'isDemo' | 'clockOffsetMs'>) => Date.now() + (user.isDemo ? user.clockOffsetMs : 0)

export async function requireUser(opts: { money?: boolean } = {}): Promise<Ctx> {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'unauthorized')
  const db = await getDb()
  const [user] = await db.select().from(users).where(eq(users.id, session.uid))
  if (!user) throw new ApiError(401, 'unauthorized')
  if (user.isDemo !== session.demo) throw new ApiError(401, 'unauthorized')
  void opts
  return { db, session, user, now: nowFor(user) }
}

/** Wrap a handler: typed errors → JSON, unknown errors → 500 without leaking internals. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.code, message: e.message }, { status: e.status })
      console.error('[api]', e)
      return json({ error: 'internal', message: 'Something went wrong' }, { status: 500 })
    }
  }
}

export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
