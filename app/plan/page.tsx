'use client'

import { useState } from 'react'
import { useTrailStore } from '@/lib/store'
import WeekView from '@/components/WeekView'
import { getCurrentWeek, computeAdaptation, getPhaseLabel, getPhaseColor } from '@/lib/training'
import type { TrainingWeekExtended } from '@/lib/training'
import { SessionStatus } from '@/lib/types'
import { Calendar, Zap, AlertCircle, Trophy, Flag, ChevronDown, ChevronUp } from 'lucide-react'

const TODAY = new Date('2026-06-03')

const PHASE_FILTERS = ['Toutes', 'Base', 'Build', 'Specific', 'Peak', 'Taper'] as const

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    A: 'bg-red-900/40 text-red-300 border-red-500/40',
    B: 'bg-orange-900/40 text-orange-300 border-orange-500/40',
    C: 'bg-gray-700/60 text-gray-300 border-gray-500/40',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[priority] ?? styles['C']}`}>
      {priority}
    </span>
  )
}

// Group weeks by blockLabel
function groupWeeksByBlock(weeks: TrainingWeekExtended[]) {
  const groups: { label: string; priority?: string; isRecovery: boolean; weeks: TrainingWeekExtended[] }[] = []
  let currentLabel: string | undefined = undefined
  for (const week of weeks) {
    const label = week.blockLabel ?? 'Plan'
    if (label !== currentLabel) {
      currentLabel = label
      groups.push({
        label,
        priority: week.targetRacePriority,
        isRecovery: !!week.isPostRaceRecovery,
        weeks: [week],
      })
    } else {
      groups[groups.length - 1].weeks.push(week)
    }
  }
  return groups
}

export default function PlanPage() {
  const { trainingWeeks, updateSessionStatus, applyAdaptation } = useTrailStore()
  const [phaseFilter, setPhaseFilter] = useState<string>('Toutes')
  const [showOnlyCurrent, setShowOnlyCurrent] = useState(false)
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())

  const extendedWeeks = trainingWeeks as TrainingWeekExtended[]
  const currentWeek = getCurrentWeek(trainingWeeks, TODAY)

  const handleStatusChange = (weekNumber: number, sessionId: string, status: SessionStatus) => {
    updateSessionStatus(weekNumber, sessionId, status)
    const updatedWeek = trainingWeeks.find(w => w.weekNumber === weekNumber)
    if (!updatedWeek) return
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

  const filteredWeeks = extendedWeeks.filter(w => {
    if (showOnlyCurrent) return w.weekNumber === currentWeek?.weekNumber
    if (phaseFilter === 'Toutes') return true
    return w.phase === phaseFilter
  })

  const phases = Array.from(new Set(trainingWeeks.map(w => w.phase)))
  const totalWeeks = trainingWeeks.length

  const totalPlanned = trainingWeeks.reduce((sum, w) => sum + w.sessions.length, 0)
  const totalDone = trainingWeeks.reduce((sum, w) => sum + w.sessions.filter(s => s.status === 'done').length, 0)
  const totalMissed = trainingWeeks.reduce((sum, w) => sum + w.sessions.filter(s => s.status === 'missed').length, 0)

  const groups = groupWeeksByBlock(filteredWeeks)

  const toggleBlock = (label: string) => {
    setCollapsedBlocks(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-recovery" size={24} />
          Plan d'Entraînement
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Plan multi-courses périodisé sur {totalWeeks} semaines
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
            {f === 'Toutes' ? f : getPhaseLabel(f as Parameters<typeof getPhaseLabel>[0])}
          </button>
        ))}
      </div>

      {/* Weeks grouped by race block */}
      <div className="space-y-6">
        {filteredWeeks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={40} className="mx-auto mb-3 text-gray-600" />
            <p>Aucune semaine correspondant au filtre</p>
          </div>
        ) : (
          groups.map(group => {
            const isCollapsed = collapsedBlocks.has(group.label)
            return (
              <div key={group.label} className="space-y-3">
                {/* Block header */}
                <button
                  onClick={() => toggleBlock(group.label)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-slate-500 transition-all group"
                >
                  {group.isRecovery ? (
                    <span className="text-base">🔄</span>
                  ) : (
                    <Trophy size={15} className={
                      group.priority === 'A' ? 'text-red-400' :
                      group.priority === 'B' ? 'text-orange-400' : 'text-gray-400'
                    } />
                  )}
                  <span className="flex-1 text-sm font-semibold text-white text-left">{group.label}</span>
                  {group.priority && !group.isRecovery && (
                    <PriorityBadge priority={group.priority} />
                  )}
                  <span className="text-xs text-gray-500">{group.weeks.length} sem.</span>
                  {isCollapsed
                    ? <ChevronDown size={14} className="text-gray-400 group-hover:text-white" />
                    : <ChevronUp size={14} className="text-gray-400 group-hover:text-white" />
                  }
                </button>

                {/* Weeks */}
                {!isCollapsed && (
                  <div className="space-y-3 pl-2 border-l-2 border-slate-700/50 ml-2">
                    {group.weeks.map(week => {
                      const isRaceWeek = week.phase === 'Race'
                      return (
                        <div key={week.weekNumber} className="space-y-1">
                          {/* Target race label */}
                          {week.targetRaceName && (
                            <div className="flex items-center gap-1.5 ml-2 mb-1">
                              <Flag size={11} className="text-gray-500" />
                              <span className="text-[10px] text-gray-500">
                                Objectif : {week.targetRaceName}
                                {isRaceWeek && (
                                  <span className="ml-1 text-[#22c55e] font-bold">🏁 SEMAINE DE COURSE</span>
                                )}
                              </span>
                            </div>
                          )}
                          <WeekView
                            week={week}
                            isCurrentWeek={week.weekNumber === currentWeek?.weekNumber}
                            onStatusChange={(sessionId, status) =>
                              handleStatusChange(week.weekNumber, sessionId, status)
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
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
          <span className="text-white">Modèle polarisé</span> : 80% du volume en Z1-Z2, 20% en Z4-Z5.
          Pour élite/confirmé : méthode norvégienne double seuil en phases Développement et Spécifique.
        </p>
      </div>
    </div>
  )
}
