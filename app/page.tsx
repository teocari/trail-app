'use client'

import { useTrailStore } from '@/lib/store'
import { getCurrentWeek, getWeeksUntilRace, getPhaseLabel, getPhaseColor, computeWeekStats } from '@/lib/training'
import SessionCard from '@/components/SessionCard'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trophy, TrendingUp, Mountain, CheckCircle2, AlertCircle, Activity, Target, Flame } from 'lucide-react'
import Link from 'next/link'

const TODAY = new Date('2026-06-03')

export default function DashboardPage() {
  const { races, trainingWeeks, updateSessionStatus } = useTrailStore()

  const currentWeek = getCurrentWeek(trainingWeeks, TODAY)
  const aRace = races.filter(r => r.priority === 'A').sort((a, b) => a.date.localeCompare(b.date))[0]
  const nextRace = races.sort((a, b) => a.date.localeCompare(b.date)).find(r => r.date >= format(TODAY, 'yyyy-MM-dd'))

  const weeksToArace = aRace ? getWeeksUntilRace(aRace, TODAY) : 0
  const weekStats = computeWeekStats(trainingWeeks)

  // Last 8 weeks stats for trend
  const currentWeekNum = currentWeek?.weekNumber ?? 0
  const trendWeeks = weekStats.filter(w => w.weekNumber >= Math.max(0, currentWeekNum - 7) && w.weekNumber <= currentWeekNum)

  const todaySessions = currentWeek?.sessions.filter(s => s.date === format(TODAY, 'yyyy-MM-dd')) ?? []
  const currentPhase = currentWeek?.phase ?? 'Base'

  const plannedThisWeek = currentWeek?.sessions.length ?? 0
  const doneThisWeek = currentWeek?.sessions.filter(s => s.status === 'done').length ?? 0
  const kmThisWeek = currentWeek?.sessions.filter(s => s.status === 'done' || s.status === 'partial').reduce((s, sess) => s + sess.distanceKm, 0) ?? 0
  const elevThisWeek = currentWeek?.sessions.filter(s => s.status === 'done' || s.status === 'partial').reduce((s, sess) => s + sess.elevationGain, 0) ?? 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-gray-400 text-sm mt-1">
          {format(TODAY, 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Current phase */}
        <div className="col-span-2 lg:col-span-1 bg-surface rounded-xl p-4 border border-surface-2">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">Phase actuelle</span>
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: getPhaseColor(currentPhase) }}
          >
            {getPhaseLabel(currentPhase)}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Semaine {(currentWeek?.weekNumber ?? 0) + 1}
          </p>
        </div>

        {/* Sessions this week */}
        <div className="bg-surface rounded-xl p-4 border border-surface-2">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">Séances</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {doneThisWeek}<span className="text-sm text-gray-400">/{plannedThisWeek}</span>
          </div>
          <div className="h-1 bg-surface-2 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-easy rounded-full"
              style={{ width: `${plannedThisWeek > 0 ? (doneThisWeek / plannedThisWeek) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Km this week */}
        <div className="bg-surface rounded-xl p-4 border border-surface-2">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">Kilomètres</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {kmThisWeek}<span className="text-sm text-gray-400"> km</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Objectif: {currentWeek?.targetVolumeKm ?? 0} km
          </p>
        </div>

        {/* D+ this week */}
        <div className="bg-surface rounded-xl p-4 border border-surface-2">
          <div className="flex items-center gap-2 mb-2">
            <Mountain size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">Dénivelé</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {elevThisWeek.toLocaleString()}<span className="text-sm text-gray-400"> m</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Objectif: {(currentWeek?.targetElevation ?? 0).toLocaleString()} m D+
          </p>
        </div>
      </div>

      {/* Next race countdown */}
      {aRace && (
        <div className="bg-surface rounded-xl p-5 border border-race/30 bg-race/5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={16} className="text-race" />
                <span className="text-xs font-semibold text-race uppercase tracking-wide">Course A — Objectif Principal</span>
              </div>
              <h2 className="text-xl font-bold text-white">{aRace.name}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {format(parseISO(aRace.date), 'dd MMMM yyyy', { locale: fr })} · {aRace.distanceKm} km · {aRace.elevationGain.toLocaleString()} m D+
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-race">{weeksToArace}</div>
              <div className="text-sm text-gray-400">semaines</div>
            </div>
          </div>

          {/* Timeline bar */}
          <div className="mt-4">
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-race rounded-full"
                style={{ width: `${Math.max(2, 100 - (weeksToArace / 16) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Two column: Today + all races */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today sessions */}
        <div className="bg-surface rounded-xl border border-surface-2 p-5">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Flame size={16} className="text-hard" />
            Séances d'aujourd'hui
          </h2>
          {todaySessions.length > 0 ? (
            <div className="space-y-2">
              {todaySessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onStatusChange={(status) => {
                    if (currentWeek) updateSessionStatus(currentWeek.weekNumber, session.id, status)
                  }}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-gray-500">
              <CheckCircle2 size={32} className="mb-2 text-easy" />
              <p className="text-sm">Repos ou pas de séance aujourd'hui</p>
            </div>
          )}
          <Link
            href="/plan"
            className="block mt-3 text-center text-xs text-accent hover:underline"
          >
            Voir le plan complet →
          </Link>
        </div>

        {/* Races list */}
        <div className="bg-surface rounded-xl border border-surface-2 p-5">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Target size={16} className="text-race" />
            Prochaines courses
          </h2>
          <div className="space-y-2">
            {races
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(race => {
                const weeks = getWeeksUntilRace(race, TODAY)
                const priorityColors = { A: '#ef4444', B: '#f97316', C: '#6b7280' }
                return (
                  <div key={race.id} className="flex items-center gap-3 p-2.5 bg-surface-2 rounded-lg">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: priorityColors[race.priority] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{race.name}</p>
                      <p className="text-xs text-gray-400">
                        {race.distanceKm} km · {race.elevationGain.toLocaleString()} m D+
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold" style={{ color: priorityColors[race.priority] }}>
                        {weeks}S
                      </p>
                      <p className="text-xs text-gray-500">Course {race.priority}</p>
                    </div>
                  </div>
                )
              })}
          </div>
          <Link
            href="/races"
            className="block mt-3 text-center text-xs text-accent hover:underline"
          >
            Gérer les courses →
          </Link>
        </div>
      </div>

      {/* Fitness / Fatigue trend — last 8 weeks */}
      {trendWeeks.length > 1 && (
        <div className="bg-surface rounded-xl border border-surface-2 p-5">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-recovery" />
            Tendance forme / fatigue — 8 dernières semaines
          </h2>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 min-w-0" style={{ height: 100 }}>
              {trendWeeks.map((ws) => (
                <div key={ws.weekNumber} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
                    <div
                      className="flex-1 bg-easy/70 rounded-t"
                      style={{ height: `${ws.fitnessScore}%` }}
                      title={`Forme: ${ws.fitnessScore}`}
                    />
                    <div
                      className="flex-1 bg-race/60 rounded-t"
                      style={{ height: `${ws.fatigueScore}%` }}
                      title={`Fatigue: ${ws.fatigueScore}`}
                    />
                  </div>
                  <span className="text-xs text-gray-600">S{ws.weekNumber + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-easy/70" />
              <span className="text-xs text-gray-400">Forme</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-race/60" />
              <span className="text-xs text-gray-400">Fatigue</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
