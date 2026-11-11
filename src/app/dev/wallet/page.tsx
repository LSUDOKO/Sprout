import { notFound } from 'next/navigation'
import { WalletDebug } from './WalletDebug'

// Dev-only (docs/13 M1): compare listAccounts() with the address derived from sign().
export default function Page() {
  if (process.env.NODE_ENV === 'production' && process.env.SPROUT_DEV_PAGES !== '1') notFound()
  return <WalletDebug />
}
