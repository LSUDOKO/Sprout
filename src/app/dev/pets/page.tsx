import { notFound } from 'next/navigation'
import { PetGallery } from './PetGallery'

// Dev-only visual check of every stage × mood × cosmetic.
export default function Page() {
  if (process.env.NODE_ENV === 'production' && process.env.SPROUT_DEV_PAGES !== '1') notFound()
  return <PetGallery />
}
