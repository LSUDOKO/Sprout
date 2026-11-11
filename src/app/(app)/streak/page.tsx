'use client'
// S8 Streak detail + weekly goal editor.
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client/api'
import { meKey, useMe } from '@/lib/client/hooks'
import { GOAL } from '@/lib/game/config'
import { formatNim, fromWire, parseNim } from '@/lib/nimiq/luna'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { BackButton, Button, Card } from '@/components/ui/kit'

const NEXT_REWARD = [
  { n: 4, badge: 'badge.on_a_roll' },
  { n: 12, badge: 'badge.unstoppable' },
] as const

export default function StreakPage() {
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const openFeed = useUi((s) => s.openFeed)
  const toast = useUi((s) => s.toast)
  const [goal, setGoal] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!me) return null
  const n = me.streak.current
  const next = NEXT_REWARD.find((r) => r.n > n)
  const goalValue = goal ?? formatNim(fromWire(me.user.nextGoalLuna ?? me.user.goalLuna), 0)
  const parsed = parseNim(goalValue)
  const goalOk = parsed !== null && parsed >= GOAL.min && parsed <= GOAL.max

  async function saveGoal() {
    if (!goalOk || !parsed) return
    setBusy(true)
    try {
      await api('/api/me/goal', { method: 'PATCH', body: { weeklyGoalLuna: parsed.toString() } })
      await qc.invalidateQueries({ queryKey: meKey })
      toast(t('streak.goalScheduled', { amount: formatNim(parsed) }), 'success')
      setGoal(null)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-dvh bg-white px-5 pt-[calc(var(--safe-top)+8px)] text-center">
      <div className="text-left">
        <BackButton href="/" label={t('common.back')} />
      </div>
      <div className="relative mx-auto -mt-4 h-36 w-40">
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-[120px] leading-none">🔥</span>
        <span className="absolute inset-0 flex items-center justify-center pt-8 font-display text-[78px] font-bold text-white [-webkit-text-stroke:5px_#B3261E] [paint-order:stroke]">{n}</span>
      </div>
      <h1 className="text-[42px] font-bold text-ink">{n === 0 ? t('streak.zero') : t('streak.title')}</h1>
      <div className="relative mx-auto mt-3 max-w-[300px] rounded-[28px] border-[3px] border-ink bg-white px-5 py-3 font-display text-xl font-semibold">
        {t('streak.bubble')}
        <span className="absolute -bottom-[11px] left-[62%] h-5 w-5 rotate-45 border-r-[3px] border-b-[3px] border-ink bg-white" />
      </div>
      <img src="/art/streak-jar.webp" alt="" className="mx-auto mt-4 h-48 w-auto" />

      <ol className="mt-4 flex justify-between gap-1" aria-label="Last 8 weeks">
        {me.recentWeeks.map((w, i) => (
          <li key={w.key} className="flex flex-1 flex-col items-center gap-1">
            <span
              title={w.key}
              className={`flex aspect-square w-full max-w-[42px] items-center justify-center rounded-full text-lg font-bold ${w.status === 'kept' ? 'bg-leaf text-white shadow-[0_3px_0_0_#2f8a3e]' : w.status === 'current' ? 'border-[2.5px] border-dashed border-slate/60 text-slate' : 'bg-mist text-slate'}`}
            >
              {w.status === 'kept' ? '✓' : w.status === 'missed' ? '✕' : ''}
            </span>
            <span className={`font-display text-sm font-semibold ${w.status === 'current' ? 'text-slate' : 'text-ink'}`}>{t('streak.weeksLabel', { n: i + 1 })}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-semibold text-slate">{t('streak.best', { n: me.streak.best })}</p>
      {next && <p className="mt-1 text-ink">{t('streak.next', { n: next.n, badge: t(next.badge) })}</p>}

      <Card className="mt-5 text-left">
        <label htmlFor="goal" className="font-display text-xl font-semibold">
          {t('streak.goal')}
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input id="goal" inputMode="decimal" value={goalValue} onChange={(e) => setGoal(e.target.value)} className="h-12 w-full rounded-2xl border-[2.5px] border-mist px-4 font-display text-xl font-semibold outline-none focus:border-navy" />
          <span className="font-display font-semibold">NIM</span>
        </div>
        <p className="mt-2 text-sm text-slate">{t('streak.goalHint')}</p>
        {me.user.nextGoalLuna && me.user.nextGoalWeek && me.user.nextGoalWeek > me.week.key && <p className="mt-1 text-sm font-bold text-leaf-deep">{t('streak.goalScheduled', { amount: formatNim(fromWire(me.user.nextGoalLuna)) })}</p>}
        {goal !== null && (
          <Button variant="navy" size="md" className="mt-3 w-full" onClick={saveGoal} disabled={!goalOk} loading={busy}>
            {t('streak.goalSave')}
          </Button>
        )}
        {!goalOk && <p className="mt-1 text-sm font-bold text-[#c2410c]">{formatNim(GOAL.min)}–{formatNim(GOAL.max)} NIM</p>}
      </Card>

      <Button
        variant="navy"
        className="my-6 w-full max-w-[300px] !bg-ink"
        onClick={() => {
          router.push('/')
          openFeed(true)
        }}
      >
        {t('streak.keepGoing')}
      </Button>
    </main>
  )
}
