import 'server-only'
import { env } from '../env'
import { ApiError, requireUser } from './api'

/** Demo helpers reject anything that isn't a demo session. */
export async function requireDemo() {
  if (!env.DEMO_ENABLED) throw new ApiError(403, 'demo_disabled')
  const ctx = await requireUser()
  if (!ctx.user.isDemo || !ctx.session.demo) throw new ApiError(403, 'demo_only', 'Demo helpers only work in demo mode')
  return ctx
}
