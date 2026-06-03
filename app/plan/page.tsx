'use client'

import { useState } from 'react'
import { useTrailStore } from '@/lib/store'
import WeekView from '@/components/WeekView'
import { getCurrentWeek, computeAdaptation, getPhaseLabel, getPhaseColor } from '@/lib/training'
import { SessionStatus } from '@/lib/types'
import { Calendar, Zap, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const TODAY = new Date('2026-06-03')

const PHASE_FILTERS = ['Toutes', 'Base', 'Build', 'Specific', 'Peak', 'Taper'] as const

export default function PlanPage() {
  const { trainingWeeks, updateSessionStatus, applyAdaptation } = useTrailStore()
  const [phaseFilter, setPhaseFilter] = useState<string>('Toutes')
  const [showOnlyCurrent, setShowOnlyCurrent] = useState(false)

  const currentWeek = getCurrentWeek(trainingWeeks, TODAY)

  const handleStatusChange = (weekNumber: number, sessionId: string, status: SessionStatus) => {
    updateSessionStatus(weekNumber, sessionId, status)

    // After updating, check if we need to apply adaptation to next week
    const updatedWeek = trainingWeeks.find(w => w.weekNumber === weekNumber)
    if (!updatedWeek) return

    // We need to simulate the update
    const fakeWeek = {
      ...updatedWeek,
      sessions: updatedWeek.sessions.map(s =>
        s.id === sessionId ? { ...s, status } : s
      ),
    }
    const adapt = computeAdaptation(fakeWeek)
    if (adapt.ratio !== 1.0) {
      applyAdaptation(weekNumber + 1, adapt.ratio)
    }
  }

  const filteredWeeks = trainingWeeks.filter(w => {
    if (showOnlyCurrent) return w.weekNumber === currentWeek?.weekNumber
    if (phaseFilter === 'Toutes') return true
    return w.phase === phaseFilter
  })

  const phases = Array.from(new Set(trainingWeeks.map(w => w.phase)))
  const totalWeeks = trainingWeeks.length

  // Stats
  const totalPlanned = trainingWeeks.reduce((sum, w) => sum + w.sessions.length, 0)
  const totalDone = trainingWeeks.reduce((sum, w) => sum + w.sessions.filter(s => s.status === 'done').length, 0)
  const totalMissed = trainingWeeks.reduce((sum, w) => sum + w.sessions.filter(s => s.status === 'missed').length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-recovery" size={24} />
          Plan d'Entraînement
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Plan périodisé sur {totalWeeks} semaines · Polarisé 80/20
        </p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{totalWeeks}</p>
          <p className="text-xs text-gray-400">Semaines</p>
        </div>
        <div className="bg-surface border border-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-easy">{totalDone}</p>
          <p className="text-xs text-gray-400">Séances terminées</p>
        </div>
        <div className="bg-surface border border-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-race">{totalMissed}</p>
          <p className="text-xs text-gray-400">Séances manquées</p>
        </div>
      </div>

      {/* Adaptation info */}
      {currentWeek && (() => {
        const adapt = computeAdaptation(currentWeek)
        if (!adapt.suggestion) return null
        return (
          <div className="flex items-start gap-2 p-3 bg-hard/10 border border-hard/30 rounded-xl">
            <AlertCircle size={16} className="text-hard flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-hard">Adaptation suggérée</p>
              <p className="text-xs text-gray-300 mt-0.5">{adapt.suggestion}</p>
            </div>
          </div>
        )
      })()}

      {/* Phase legend */}
      <div className="flex flex-wrap gap-2">
        {phases.map(phase => (
          <div key={phase} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getPhaseColor(phase) }}
            />
            <span className="text-xs text-gray-400">{getPhaseLabel(phase)}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setShowOnlyCurrent(!showOnlyCurrent)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
            showOnlyCurrent
              ? 'bg-accent/10 border-accent/50 text-accent'
              : 'bg-surface border-surface-2 text-gray-400 hover:text-white'
          }`}
        >
          <Zap size={12} />
          Semaine en cours
        </button>
        <div className="w-px h-4 bg-surface-2" />
        {PHASE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setPhaseFilter(f); setShowOnlyCurrent(false) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              phaseFilter === f && !showOnlyCurrent
                ? 'bg-recovery/10 border-recovery/50 text-recovery'
                : 'bg-surface border-surface-2 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'Toutes' ? f : getPhaseLabel(f as any)}
          </button>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {filteredWeeks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={40} className="mx-auto mb-3 text-gray-600" />
            <p>Aucune semaine correspondant au filtre</p>
          </div>
        ) : (
          filteredWeeks.map(week => (
            <WeekView
              key={week.weekNumber}
              week={week}
              isCurrentWeek={week.weekNumber === currentWeek?.weekNumber}
              onStatusChange={(sessionId, status) =>
                handleStatusChange(week.weekNumber, sessionId, status)
              }
            />
          ))
        )}
      </div>

      {/* Zones reference */}
      <div className="bg-surface border border-surface-2 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Référence des zones d'intensité (RPE)</h3>
        <div className="grid sm:grid-cols-5 gap-2">
          {[
            { zone: 'Z1', rpe: '1–3', desc: 'Très facile, conversation aisée', color: '#22c55e' },
            { zone: 'Z2', rpe: '3–4', desc: 'Facile, respiration nasale', color: '#86efac' },
            { zone: 'Z3', rpe: '5–6', desc: 'Modéré, seuil aérobie', color: '#eab308' },
            { zone: 'Z4', rpe: '7–8', desc: 'Difficile, seuil lactique', color: '#f97316' },
            { zone: 'Z5', rpe: '9–10', desc: 'Maximum, VO2max', color: '#ef4444' },
          ].map(z => (
            <div
              key={z.zone}
              className="rounded-lg p-2.5 text-center"
              style={{ backgroundColor: `${z.color}15`, borderColor: `${z.color}30`, borderWidth: 1 }}
            >
              <p className="font-bold text-sm" style={{ color: z.color }}>{z.zone}</p>
              <p className="text-xs text-gray-400">RPE {z.rpe}</p>
              <p className="text-xs text-gray-500 mt-1">{z.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          <span className="text-white">80/20 polarisé</span> : 80% du volume en Z1-Z2, 20% en Z4-Z5. Éviter Z3 systématiquement.
        </p>
      </div>
    </div>
  )
}
