import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { GOAL } from '@/lib/game/config'
import { nextWeekKey, weekKey } from '@/lib/game/streak'
import { fromWire } from '@/lib/nimiq/luna'

// Changing the goal applies from next week, so this week's target never moves under you (docs/04 §4).
export const PATCH = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  const { weeklyGoalLuna } = await body(req, z.object({ weeklyGoalLuna: z.string().regex(/^\d+$/) }))
  const goal = fromWire(weeklyGoalLuna)
  if (goal < GOAL.min || goal > GOAL.max) throw new ApiError(400, 'goal_out_of_range', 'Goal must be between 50 and 1,000,000 NIM')
  const fromWeek = nextWeekKey(weekKey(now))
  // If a previously scheduled goal is already in effect, it becomes the base goal.
  const base = user.nextGoalWeek && user.nextGoalWeek <= weekKey(now) && user.nextWeeklyGoalLuna !== null ? user.nextWeeklyGoalLuna : user.weeklyGoalLuna
  await db.update(users).set({ weeklyGoalLuna: base, nextWeeklyGoalLuna: goal, nextGoalWeek: fromWeek }).where(eq(users.id, user.id))
  return json({ nextGoalLuna: goal, fromWeek })
})
