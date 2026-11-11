import { AppGate } from '@/components/AppGate'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppGate>{children}</AppGate>
}
