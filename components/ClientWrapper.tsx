'use client'

import { useTrailStore } from '@/lib/store'
import Onboarding from './Onboarding'
import ProfileModal from './ProfileModal'

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const profile = useTrailStore(s => s.profile)

  return (
    <>
      {!profile && <Onboarding />}
      <ProfileModal />
      {children}
    </>
  )
}
