'use client'

import { useState, useEffect } from 'react'
import { useTrailStore } from '@/lib/store'
import { AthleteProfile, RunnerLevel, RaceType } from '@/lib/types'
import { X, User } from 'lucide-react'

const LEVELS: { value: RunnerLevel; label: string }[] = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'confirme', label: 'Confirmé' },
  { value: 'elite', label: 'Élite' },
]

const RACE_TYPES: { value: RaceType; label: string }[] = [
  { value: 'XC', label: 'Course sur route' },
  { value: 'Trail', label: 'Trail' },
  { value: 'Ultra', label: 'Ultra-Trail' },
]

export default function ProfileModal() {
  const { profile, showProfileEdit, setShowProfileEdit, setProfile } = useTrailStore()

  const [form, setForm] = useState<AthleteProfile>({
    firstName: '',
    level: 'intermediaire',
    yearsTrail: 2,
    weeklyKm: 50,
    weeklyElevation: 2000,
    pace10kmMin: 48,
    pace10kmSec: 0,
    maxHR: 0,
    bodyWeightKg: 70,
    preferredRaceType: 'Trail',
    trainingDaysPerWeek: 6,
  })

  useEffect(() => {
    if (profile && showProfileEdit) {
      setForm({ ...profile })
    }
  }, [profile, showProfileEdit])

  if (!showProfileEdit) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setProfile(form)
    setShowProfileEdit(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-surface-2 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2 sticky top-0 bg-surface rounded-t-2xl">
          <div className="flex items-center gap-2">
            <User size={18} className="text-accent" />
            <h2 className="text-white font-bold text-sm">Mon profil</h2>
          </div>
          <button
            onClick={() => setShowProfileEdit(false)}
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          {/* Identité */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Identité</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Prénom *</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Ex: Jean"
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Niveau</label>
                <select
                  value={form.level}
                  onChange={e => setForm({ ...form, level: e.target.value as RunnerLevel })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                >
                  {LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Années de trail</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.yearsTrail}
                  onChange={e => setForm({ ...form, yearsTrail: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Type de course préféré</label>
                <select
                  value={form.preferredRaceType}
                  onChange={e => setForm({ ...form, preferredRaceType: e.target.value as RaceType })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                >
                  {RACE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Volume */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Volume hebdomadaire</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Km/semaine</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={form.weeklyKm}
                  onChange={e => setForm({ ...form, weeklyKm: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">D+ / semaine (m)</label>
                <input
                  type="number"
                  min={0}
                  max={30000}
                  value={form.weeklyElevation}
                  onChange={e => setForm({ ...form, weeklyElevation: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-400 block mb-1.5">Jours d'entraînement par semaine</label>
              <div className="grid grid-cols-5 gap-2">
                {[3, 4, 5, 6, 7].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, trainingDaysPerWeek: d })}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all border ${
                      (form.trainingDaysPerWeek ?? 6) === d
                        ? 'bg-accent text-black border-accent'
                        : 'bg-surface-2 text-gray-400 border-surface-2 hover:text-white'
                    }`}
                  >
                    {d}j
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(form.trainingDaysPerWeek ?? 6) <= 3 ? 'Amateur — 3 séances clés'
                 : (form.trainingDaysPerWeek ?? 6) === 4 ? 'Régulier — volume modéré'
                 : (form.trainingDaysPerWeek ?? 6) === 5 ? 'Sérieux — bon compromis'
                 : (form.trainingDaysPerWeek ?? 6) === 6 ? 'Avancé — programme complet'
                 : 'Élite / Pro — entraînement bi-quotidien possible'}
              </p>
            </div>
          </section>

          {/* Performance */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Performance</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Allure 10km — minutes</label>
                <input
                  type="number"
                  min={30}
                  max={90}
                  value={form.pace10kmMin}
                  onChange={e => setForm({ ...form, pace10kmMin: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Allure 10km — secondes</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={form.pace10kmSec}
                  onChange={e => setForm({ ...form, pace10kmSec: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">FC max (bpm, 0 = inconnu)</label>
                <input
                  type="number"
                  min={0}
                  max={250}
                  value={form.maxHR}
                  onChange={e => setForm({ ...form, maxHR: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Poids corporel (kg)</label>
                <input
                  type="number"
                  min={30}
                  max={200}
                  value={form.bodyWeightKg}
                  onChange={e => setForm({ ...form, bodyWeightKg: Number(e.target.value) })}
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowProfileEdit(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent text-black font-semibold text-sm rounded-lg hover:bg-easy/90 transition-colors"
            >
              Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
