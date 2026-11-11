'use client'
// Client → Sprout API. The client never talks to the chain directly; it reads via these routes.
import type { MeSnapshot } from '../server/account'

/** bigint fields arrive as decimal strings. */
export type Wire<T> = T extends bigint
  ? string
  : T extends (infer U)[]
    ? Wire<U>[]
    : T extends object
      ? { [K in keyof T]: Wire<T[K]> }
      : T

export type Me = Wire<MeSnapshot>

export class ApiFail extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: opts.body ? { 'content-type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch {
    throw new ApiFail(0, 'offline', 'You seem to be offline')
  }
  if (res.status === 204) return undefined as T
  let data: unknown = null
  try {
    data = await res.json()
  } catch {}
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; message?: string }
    throw new ApiFail(res.status, typeof d.error === 'string' ? d.error : 'error', d.message ?? 'Something went wrong')
  }
  return data as T
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Poll until a terminal status: every 3s for 2 minutes, then every 15s (docs/02 §5). */
export async function pollUntil<T extends { status: string }>(fn: () => Promise<T>, done: (r: T) => boolean, opts: { signal?: AbortSignal; fast?: number; maxMs?: number } = {}): Promise<T> {
  const start = Date.now()
  const fast = opts.fast ?? 3000
  for (;;) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    try {
      const r = await fn()
      if (done(r)) return r
    } catch (e) {
      if (!(e instanceof ApiFail) || e.status >= 500 || e.status === 0) {
        // transient: keep polling
      } else throw e
    }
    if (opts.maxMs && Date.now() - start > opts.maxMs) throw new Error('poll_timeout')
    await sleep(Date.now() - start < 120_000 ? fast : 15_000)
  }
}
