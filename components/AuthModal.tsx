'use client'

import { useState } from 'react'
import { X, LogIn, UserPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTrailStore } from '@/lib/store'

interface AuthModalProps {
  onClose: () => void
  defaultTab?: 'login' | 'signup'
}

type Tab = 'connexion' | 'inscription'

export default function AuthModal({ onClose, defaultTab }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>(defaultTab === 'signup' ? 'inscription' : 'connexion')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { setUserId, loadFromCloud } = useTrailStore()

  const handleSignIn = async () => {
    setError(null)
    setSuccess(null)
    if (!email || !password) { setError('Remplis tous les champs.'); return }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); return }
      if (data.user) {
        setUserId(data.user.id)
        await loadFromCloud(data.user.id)
        setSuccess('Connexion réussie !')
        setTimeout(onClose, 800)
      }
    } catch {
      setError('Erreur inattendue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError(null)
    setSuccess(null)
    if (!email || !password || !confirmPassword) { setError('Remplis tous les champs.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); return }
      if (data.user) {
        setUserId(data.user.id)
        // Initialize user_data row
        try {
          await supabase.from('user_data').upsert({
            user_id: data.user.id,
            data: {},
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        } catch {
          // Non-blocking — table may not exist yet
        }
        setSuccess('Compte créé ! Vérifie ton email pour confirmer.')
        setTimeout(onClose, 1500)
      }
    } catch {
      setError('Erreur inattendue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setSuccess(null)
    if (!email) { setError('Entre ton adresse email d\'abord.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email)
      if (err) { setError(err.message); return }
      setSuccess('Email de réinitialisation envoyé !')
    } catch {
      setError('Erreur lors de l\'envoi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {tab === 'connexion' ? 'Se connecter' : 'Créer un compte'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {(['connexion', 'inscription'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(null) }}
              className={`flex-1 py-3 text-sm font-semibold transition-all capitalize ${
                tab === t
                  ? 'text-[#22c55e] border-b-2 border-[#22c55e]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'connexion' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-500/40 rounded-lg">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-900/30 border border-green-500/40 rounded-lg">
              <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-300">{success}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Adresse email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">
              Mot de passe {tab === 'inscription' && <span className="text-gray-500">(min. 8 caractères)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] text-sm"
            />
          </div>

          {/* Confirm password (inscription only) */}
          {tab === 'inscription' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] text-sm"
              />
            </div>
          )}

          {/* Submit */}
          <button
            onClick={tab === 'connexion' ? handleSignIn : handleSignUp}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#22c55e] text-black font-bold py-3 rounded-lg hover:bg-[#16a34a] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : tab === 'connexion' ? (
              <><LogIn size={18} /> Se connecter</>
            ) : (
              <><UserPlus size={18} /> Créer mon compte</>
            )}
          </button>

          {/* Forgot password */}
          {tab === 'connexion' && (
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40"
            >
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
