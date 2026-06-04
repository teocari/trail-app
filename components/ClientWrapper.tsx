'use client'

import { useEffect, useState } from 'react'
import { useTrailStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import Onboarding from './Onboarding'
import ProfileModal from './ProfileModal'
import AuthModal from './AuthModal'
import { Loader2 } from 'lucide-react'

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const profile = useTrailStore(s => s.profile)
  const userId = useTrailStore(s => s.userId)
  const setUserId = useTrailStore(s => s.setUserId)
  const loadFromCloud = useTrailStore(s => s.loadFromCloud)
  const [showAuthModal, setShowAuthModal] = useState(false)
  // True while we're loading cloud data after auth — prevents flash of onboarding
  const [isLoadingCloud, setIsLoadingCloud] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsLoadingCloud(true)
        setUserId(session.user.id)
        await loadFromCloud(session.user.id)
        setIsLoadingCloud(false)
      } else {
        setUserId(null)
        setIsLoadingCloud(false)
      }
    })

    // Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        await loadFromCloud(session.user.id)
      }
      setIsLoadingCloud(false)
    })

    return () => { subscription.unsubscribe() }
  }, [setUserId, loadFromCloud])

  // While checking session / loading cloud data, show spinner
  if (isLoadingCloud) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-[#22c55e] animate-spin" />
          <p className="text-gray-400 text-sm">Chargement de ton programme…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Show onboarding only when no profile (guest or new user) */}
      {!profile && <Onboarding />}

      <ProfileModal />

      {/* Auth modal triggered from banner */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Banner for unauthenticated users who have a profile (guests) */}
      {!userId && profile && (
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
