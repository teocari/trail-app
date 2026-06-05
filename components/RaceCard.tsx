'use client'

import { useState } from 'react'
import { Race } from '@/lib/types'
import { getWeeksUntilRace } from '@/lib/training'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MapPin, TrendingUp, Ruler, Calendar, X, Star, Clock } from 'lucide-react'
import GpxStrategyModal from './GpxStrategyModal'

interface Props {
  race: Race
  onRemove?: () => void
}

const priorityConfig = {
  A: { label: 'Course A', color: '#ef4444', bg: 'bg-race/10 border-race/30' },
  B: { label: 'Course B', color: '#f97316', bg: 'bg-hard/10 border-hard/30' },
  C: { label: 'Course C', color: '#6b7280', bg: 'bg-gray-700/30 border-gray-600/30' },
}

const typeLabels = {
  XC: 'Course sur route',
  Trail: 'Trail',
  Ultra: 'Ultra-Trail',
}

const raceTypeColors = {
  XC: '#22c55e',
  Trail: '#3b82f6',
  Ultra: '#a855f7',
}

function formatGoalTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h${String(m).padStart(2, '0')}min`
}

export default function RaceCard({ race, onRemove }: Props) {
  const [showStrategy, setShowStrategy] = useState(false)
  const weeksLeft = getWeeksUntilRace(race, new Date('2026-06-03'))
  const priority = priorityConfig[race.priority]
  const dateStr = format(parseISO(race.date), 'dd MMMM yyyy', { locale: fr })

  return (
    <>
      <div className={`rounded-xl border bg-surface p-4 space-y-3 ${priority.bg}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-sm">{race.name}</h3>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: priority.color, backgroundColor: `${priority.color}20` }}
              >
                {priority.label}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ color: raceTypeColors[race.type], backgroundColor: `${raceTypeColors[race.type]}15` }}
              >
                {typeLabels[race.type]}
              </span>
            </div>
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-gray-500 hover:text-race transition-colors flex-shrink-0"
              aria-label="Supprimer la course"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Race stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Ruler size={12} className="text-gray-500" />
            <span>{race.distanceKm} km</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <TrendingUp size={12} className="text-gray-500" />
            <span>{race.elevationGain.toLocaleString()} m D+</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} className="text-gray-500" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Star size={12} style={{ color: priority.color }} />
            <span style={{ color: priority.color }} className="font-semibold">
              {weeksLeft > 0 ? `${weeksLeft} semaine${weeksLeft > 1 ? 's' : ''}` : 'Cette semaine !'}
            </span>
          </div>
        </div>

        {/* Goal time */}
        {race.goalTimeMin !== undefined && race.goalTimeMin > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <Clock size={12} className="text-accent" />
            <span>Objectif : <span className="font-semibold text-accent">{formatGoalTime(race.goalTimeMin)}</span></span>
          </div>
        )}

        {/* Countdown bar */}
        {weeksLeft > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Préparation</span>
              <span>{weeksLeft} semaines restantes</span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(5, 100 - (weeksLeft / 16) * 100)}%`,
                  backgroundColor: priority.color,
                }}
              />
            </div>
          </div>
        )}

        {/* GPX strategy button */}
        {race.gpxAnalysis && (
          <button
            onClick={() => setShowStrategy(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-2 hover:bg-accent/10 hover:border-accent/30 border border-transparent text-xs text-gray-300 hover:text-accent transition-all"
          >
            <MapPin size={12} />
            Voir la stratégie
          </button>
        )}
      </div>

      {showStrategy && race.gpxAnalysis && (
        <GpxStrategyModal race={race} onClose={() => setShowStrategy(false)} />
      )}
    </>
  )
}
