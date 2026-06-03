'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mountain, Calendar, Target, Utensils, LayoutDashboard, User } from 'lucide-react'
import { useTrailStore } from '@/lib/store'

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/races', label: 'Courses', icon: Target },
  { href: '/plan', label: 'Plan', icon: Calendar },
  { href: '/nutrition', label: 'Nutrition', icon: Utensils },
]

export default function Navigation() {
  const pathname = usePathname()
  const setShowProfileEdit = useTrailStore(s => s.setShowProfileEdit)

  return (
    <>
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
          <p className="text-xs text-gray-600 text-center">v1.0.0</p>
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
