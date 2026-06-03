'use client'

import { TrainingSession, SessionStatus } from '@/lib/types'
import { getSessionLabel, getSessionColor, getZoneLabel, getZoneColor } from '@/lib/training'
import { CheckCircle2, XCircle, MinusCircle, Clock, TrendingUp, Ruler, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  session: TrainingSession
  onStatusChange?: (status: SessionStatus) => void
  compact?: boolean
}

const statusConfig: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  planned: { label: 'Planifié', color: 'text-gray-400', bg: 'bg-gray-700/30' },
  done: { label: 'Terminé', color: 'text-easy', bg: 'bg-easy/10' },
  missed: { label: 'Manqué', color: 'text-race', bg: 'bg-race/10' },
  partial: { label: 'Partiel', color: 'text-hard', bg: 'bg-hard/10' },
}

const typeIcons: Record<string, string> = {
  EF: '🏃',
  LS: '🏔️',
  T: '⚡',
  I: '🔥',
  V: '⬆️',
  R: '🌊',
  S: '💪',
}

export default function SessionCard({ session, onStatusChange, compact = false }: Props) {
  const color = getSessionColor(session.type)
  const status = statusConfig[session.status]
  const zoneColor = getZoneColor(session.zone)

  if (compact) {
    return (
      <div
        className={`rounded-lg p-3 border ${status.bg} border-surface-2 flex items-center gap-3`}
      >
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-lg">{typeIcons[session.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{getSessionLabel(session.type)}</p>
          <p className="text-xs text-gray-400">{session.durationMin}min · {session.distanceKm}km</p>
        </div>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl p-4 border ${status.bg} border-surface-2 space-y-3`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcons[session.type]}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{getSessionLabel(session.type)}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium ${zoneColor}`}>{getZoneLabel(session.zone)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color} ${status.bg}`}>
            {status.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={10} />
            {format(parseISO(session.date), 'EEEE d MMM', { locale: fr })}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock size={12} />
          <span>{session.durationMin} min</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Ruler size={12} />
          <span>{session.distanceKm} km</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <TrendingUp size={12} />
          <span>{session.elevationGain} m D+</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed">{session.description}</p>

      {/* Actions */}
      {onStatusChange && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onStatusChange('done')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              session.status === 'done' ? 'bg-easy text-black' : 'bg-surface-2 text-gray-400 hover:bg-easy/20 hover:text-easy'
            }`}
          >
            <CheckCircle2 size={13} />
            Terminé
          </button>
          <button
            onClick={() => onStatusChange('partial')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              session.status === 'partial' ? 'bg-hard text-black' : 'bg-surface-2 text-gray-400 hover:bg-hard/20 hover:text-hard'
            }`}
          >
            <MinusCircle size={13} />
            Partiel
          </button>
          <button
            onClick={() => onStatusChange('missed')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              session.status === 'missed' ? 'bg-race text-white' : 'bg-surface-2 text-gray-400 hover:bg-race/20 hover:text-race'
            }`}
          >
            <XCircle size={13} />
            Manqué
          </button>
        </div>
      )}
    </div>
  )
}
