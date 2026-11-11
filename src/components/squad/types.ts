export type SquadMember = {
  userId: string
  name: string
  stage: string
  cosmetics: { hat: string | null; neck: string | null; face: string | null }
  role: string
  address: string
  keptThisWeek: boolean
  savedThisWeek: boolean
  streak: number
  isMe: boolean
}
export type SquadDetail = { id: string; name: string; inviteCode: string; createdBy: string; streak: number; bestStreak: number; perfectWeeks: number; members: SquadMember[]; inviteUrl: { deepLink: string; web: string } }
