'use client'
// S10 Treat sheet: a NIM payment with memo `sprout:t:<squadId>`, verified on chain before it shows.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, pollUntil, type Me } from '@/lib/client/api'
import { meKey } from '@/lib/client/hooks'
import { getMode, walletFor } from '@/lib/client/session'
import { TREAT, type StageId } from '@/lib/game/config'
import { formatNim, nim } from '@/lib/nimiq/luna'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { PetRig, paletteFor } from '../pet/PetRig'
import { Button, Chip } from '../ui/kit'
import { Sheet } from '../ui/Sheet'
import type { SquadDetail } from '../squad/types'

export function TreatSheet({ me }: { me: Me }) {
  const t = useT()
  const qc = useQueryClient()
  const target = useUi((s) => s.treatOpen)
  const close = useUi((s) => s.openTreat)
  const toast = useUi((s) => s.toast)
  const [to, setTo] = useState<string | null>(null)
  const [amount, setAmount] = useState<number>(TREAT.chips[1])
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<'idle' | 'approving' | 'confirming' | 'checking'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  const squad = useQuery({ queryKey: ['squad', target?.squadId], queryFn: () => api<{ squad: SquadDetail }>(`/api/squads/${target!.squadId}`), enabled: !!target })
  const friends = squad.data?.squad.members.filter((m) => !m.isMe) ?? []
  const [lastTarget, setLastTarget] = useState(target)
  if (target !== lastTarget) {
    setLastTarget(target)
    if (target) {
      setTo(target.toUserId ?? null)
      setPhase('idle')
      setMsg(null)
      setNote('')
    }
  }
  const friend = friends.find((f) => f.userId === to)
  const busy = phase === 'approving' || phase === 'confirming'

  async function send() {
    if (!friend || !target || busy || phase === 'checking') return
    setMsg(null)
    setPhase('approving')
    const value = nim(amount)
    const r = await walletFor(getMode()).payWithData({ recipient: friend.address, value, data: `sprout:t:${target.squadId}` })
    if (!r.ok) {
      if (r.kind === 'unknown_outcome') {
        setPhase('checking')
        return setMsg(t('feed.checking'))
      }
      setPhase('idle')
      return setMsg(r.kind === 'cancelled' ? t('feed.cancelled') : r.kind === 'unsupported' ? t('err.unsupported') : r.message)
    }
    setPhase('confirming')
    try {
      const { id } = await api<{ id: string }>('/api/treats', { body: { squadId: target.squadId, toUserId: friend.userId, txHash: r.value, valueLuna: value.toString(), note: note.trim() || undefined } })
      const final = await pollUntil(() => api<{ status: string }>(`/api/treats/${id}`), (x) => x.status !== 'pending', { fast: 1500 })
      if (final.status === 'confirmed') {
        toast(t('treat.sent'), 'success')
        close(null)
        qc.invalidateQueries({ queryKey: meKey })
      } else setMsg(t('common.error'))
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setPhase((p) => (p === 'checking' ? p : 'idle'))
    }
  }

  return (
    <Sheet open={!!target} onClose={() => !busy && close(null)} dismissible={!busy} label={t('treat.title')}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <img src="/art/pose-gift.webp" alt="" className="h-16 w-auto" />
          <h2 className="text-[26px] font-semibold">{t('treat.title')}</h2>
        </div>
        <p className="font-display text-lg font-semibold">{t('treat.pickFriend')}</p>
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {friends.map((f) => (
            <li key={f.userId}>
              <button type="button" onClick={() => setTo(f.userId)} aria-pressed={to === f.userId} className={`press flex w-[84px] flex-col items-center rounded-2xl border-[2.5px] p-1.5 ${to === f.userId ? 'border-navy bg-gold-soft' : 'border-mist bg-white'}`}>
                <PetRig stage={f.stage as StageId} mood="happy" size={62} palette={paletteFor(f.userId)} cosmetics={f.cosmetics} animated={false} />
                <span className="w-full truncate text-center text-sm font-bold">{f.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2.5">
          {TREAT.chips.map((c) => (
            <Chip key={c} active={amount === c} onClick={() => setAmount(c)} disabled={busy}>
              {c}
            </Chip>
          ))}
        </div>
        <input value={note} maxLength={TREAT.noteMax} onChange={(e) => setNote(e.target.value)} placeholder={t('treat.note')} aria-label={t('treat.note')} className="h-12 rounded-2xl border-[2.5px] border-mist px-4 outline-none focus:border-navy" />
        <p className="text-xs text-slate">{t('treat.public')}</p>
        {msg && <p className="rounded-2xl bg-cream px-4 py-3 text-sm font-semibold">{msg}</p>}
        <Button variant="gold" onClick={send} disabled={!friend || phase === 'checking'} loading={busy}>
          {phase === 'approving' ? t('feed.waiting') : phase === 'confirming' ? t('treat.confirming') : t('treat.cta', { amount: formatNim(nim(amount)) })}
        </Button>
      </div>
    </Sheet>
  )
}
