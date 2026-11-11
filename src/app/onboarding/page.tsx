import { Suspense } from 'react'
import { Onboarding } from './Onboarding'

export const metadata = { title: 'Welcome · Sprout' }
export default function Page() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  )
}
