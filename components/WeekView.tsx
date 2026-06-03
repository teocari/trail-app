'use client'

import { TrainingWeek, SessionStatus } from '@/lib/types'
import { getPhaseLabel, getPhaseColor, computeAdaptation } from '@/lib/training'
import SessionCard from './SessionCard'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TrendingUp, Mountain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  week: TrainingWeek
  onStatusChange: (sessionId: string, status: SessionStatus) => void
  isCurrentWeek?: boolean
}

export default function WeekView({ week, onStatusChange, isCurrentWeek = false }: Props) {
  const [expanded, setExpanded] = useState(isCurrentWeek)
  const phaseColor = getPhaseColor(week.phase)
  const adaptation = computeAdaptation(week)

  const done = week.sessions.filter(s => s.status === 'done').length
  const missed = week.sessions.filter(s => s.status === 'missed').length
  const total = week.sessions.length

  const startStr = format(parseISO(week.startDate), 'd MMM', { locale: fr })
  const endStr = format(parseISO(week.endDate), 'd MMM yyyy', { locale: fr })

  return (
    <div className={`rounded-xl border overflow-hidden ${isCurrentWeek ? 'border-accent/50' : 'border-surface-2'}`}>
      {/* Week header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 bg-surface hover:bg-surface-2 transition-colors text-left"
      >
        {isCurrentWeek && (
          <span className="flex-shrink-0 text-xs bg-accent text-black font-bold px-2 py-0.5 rounded-full">
            CETTE SEMAINE
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-300">
              Semaine {week.weekNumber + 1}
            </span>
            <span className="text-xs text-gray-500">{startStr} – {endStr}</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ color: phaseColor, backgroundColor: `${phaseColor}20` }}
            >
              {getPhaseLabel(week.phase)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <TrendingUp size={11} />
              {week.targetVolumeKm} km
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Mountain size={11} />
              {week.targetElevation.toLocaleString()} m D+
            </span>
            <span className="text-xs text-gray-400">
              {done}/{total} séances
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:block w-20">
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {expanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>

      {/* Adaptation alert */}
      {expanded && adaptation.suggestion && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-3 bg-hard/10 border border-hard/30 rounded-lg">
          <AlertCircle size={14} className="text-hard flex-shrink-0 mt-0.5" />
          <p className="text-xs text-hard">{adaptation.suggestion}</p>
        </div>
      )}

      {/* Notes */}
      {expanded && week.notes && (
        <div className="mx-4 mt-3 px-3 py-2 bg-surface-2 rounded-lg">
          <p className="text-xs text-gray-400 italic">{week.notes}</p>
        </div>
      )}

      {/* Sessions */}
      {expanded && (
        <div className="p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {week.sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onStatusChange={(status) => onStatusChange(session.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
