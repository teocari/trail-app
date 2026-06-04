'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mountain, Calendar, Target, Utensils, LayoutDashboard, User, LogIn, LogOut, Cloud, Loader2, CheckCircle2 } from 'lucide-react'
import { useTrailStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import AuthModal from './AuthModal'

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/races', label: 'Courses', icon: Target },
  { href: '/plan', label: 'Plan', icon: Calendar },
  { href: '/nutrition', label: 'Nutrition', icon: Utensils },
]

export default function Navigation() {
  const pathname = usePathname()
  const setShowProfileEdit = useTrailStore(s => s.setShowProfileEdit)
  const userId = useTrailStore(s => s.userId)
  const isSyncing = useTrailStore(s => s.isSyncing)
  const lastSynced = useTrailStore(s => s.lastSynced)
  const clearUserData = useTrailStore(s => s.clearUserData)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearUserData() // resets profile → triggers onboarding screen
  }

  // Extract a short email display
  const userEmail = userId ? 'Connecté' : null

  return (
    <>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-surface border-r border-surface-2 fixed left-0 top-0 z-40">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-2">
          <Mountain className="text-accent" size={28} />
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">TrailElite</h1>
            <p className="text-xs text-gray-400">Entraînement Trail Pro</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-gray-400 hover:text-white hover:bg-surface-2'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-surface-2 space-y-2">
          <button
            onClick={() => setShowProfileEdit(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-surface-2 transition-all"
          >
            <User size={18} />
            <span className="text-sm font-medium">Mon profil</span>
          </button>

          {userId ? (
            <>
              {/* Sync status */}
              <div className="flex items-center gap-2 px-4 py-1.5">
                {isSyncing ? (
                  <Loader2 size={13} className="text-gray-400 animate-spin" />
                ) : lastSynced ? (
                  <CheckCircle2 size={13} className="text-[#22c55e]" />
                ) : (
                  <Cloud size={13} className="text-gray-500" />
                )}
                <span className="text-xs text-gray-500">
                  {isSyncing ? 'Synchronisation...' : lastSynced ? 'Synchronisé' : 'Cloud activé'}
                </span>
              </div>

              {/* User email display */}
              <div className="px-4 py-1.5">
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-all"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Se déconnecter</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#22c55e] hover:bg-[#22c55e]/10 transition-all border border-[#22c55e]/20"
            >
              <LogIn size={16} />
              <span className="text-sm font-semibold">Se connecter</span>
            </button>
          )}

          <p className="text-xs text-gray-600 text-center">v2.0.0</p>
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-surface-2 flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
                active ? 'text-accent' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setShowProfileEdit(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-500 hover:text-gray-300 transition-all"
        >
          <User size={20} />
          <span className="text-[10px] font-medium">Profil</span>
        </button>
      </nav>
    </>
  )
}
