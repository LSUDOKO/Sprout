'use client'
import { useEffect, useState } from 'react'

/** Pause idle loops while the page is hidden (docs/08 §7). */
export function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden')
    on()
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return visible
}
