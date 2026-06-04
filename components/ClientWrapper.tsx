'use client'

import { useEffect, useState } from 'react'
import { useTrailStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import Onboarding from './Onboarding'
import ProfileModal from './ProfileModal'
import AuthModal from './AuthModal'

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const profile = useTrailStore(s => s.profile)
  const userId = useTrailStore(s => s.userId)
  const setUserId = useTrailStore(s => s.setUserId)
  const loadFromCloud = useTrailStore(s => s.loadFromCloud)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        await loadFromCloud(session.user.id)
      } else {
        setUserId(null)
      }
    })

    // Check current session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        await loadFromCloud(session.user.id)
      }
    })

    return () => { subscription.unsubscribe() }
  }, [setUserId, loadFromCloud])

  return (
    <>
      {/* Auth flow: show onboarding only when authenticated but no profile */}
      {userId && !profile && <Onboarding />}
      {/* Allow onboarding without auth too (existing behavior) */}
      {!userId && !profile && <Onboarding />}

      <ProfileModal />

      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Banner for unauthenticated users */}
      {!userId && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-[#1e293b] border-b border-slate-700 px-4 py-2 flex items-center justify-between lg:pl-64">
          <p className="text-xs text-gray-400">
            💾 Connecte-toi pour sauvegarder ton programme dans le cloud
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-xs font-semibold text-[#22c55e] hover:text-white border border-[#22c55e]/40 hover:border-white/40 px-3 py-1 rounded-lg transition-all"
          >
            Se connecter
          </button>
        </div>
      )}

      {children}
    </>
  )
}
