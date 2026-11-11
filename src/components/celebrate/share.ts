'use client'
// Web Share API with a copy-link fallback (docs/05 S18).
export async function shareCard(opts: { kind: 'evolved' | 'streak' | 'saved'; userId: string; text: string }): Promise<'shared' | 'copied' | 'failed'> {
  const url = `${location.origin}/s/${opts.kind}/${opts.userId}`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Sprout', text: opts.text, url })
      return 'shared'
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(`${opts.text} ${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
