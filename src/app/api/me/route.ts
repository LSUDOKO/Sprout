import { handle, json, requireUser } from '@/lib/server/api'
import { meSnapshot } from '@/lib/server/account'
import { chainFor, linkedAddresses } from '@/lib/server/verify'

export const GET = handle(async () => {
  const { db, user, now } = await requireUser()
  const addresses = await linkedAddresses(db, user.id)
  return json(await meSnapshot(db, user, chainFor(db, user, now), addresses, now))
})
