// JWT session in an httpOnly cookie (docs/02 §6). Payload: { uid, demo }.
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { env } from '../env'

export const SESSION_COOKIE = 'sprout_session'
const MAX_AGE_S = 30 * 24 * 3600
const key = () => new TextEncoder().encode(env.AUTH_SECRET)

export type Session = { uid: string; demo: boolean }

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ demo: s.demo })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.uid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(key())
}

export async function readSessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] })
    if (!payload.sub) return null
    return { uid: payload.sub, demo: payload.demo === true }
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value)
}

export async function setSessionCookie(s: Session) {
  ;(await cookies()).set(SESSION_COOKIE, await signSession(s), {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S,
  })
}

export async function clearSessionCookie() {
  ;(await cookies()).delete(SESSION_COOKIE)
}
