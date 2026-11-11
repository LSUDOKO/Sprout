import { clearSessionCookie } from '@/lib/auth/session'
import { handle } from '@/lib/server/api'

export const POST = handle(async () => {
  await clearSessionCookie()
  return new Response(null, { status: 204 })
})
