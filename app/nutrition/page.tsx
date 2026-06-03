'use client'

import { useState, useMemo } from 'react'
import { useTrailStore } from '@/lib/store'
import NutritionDayComponent from '@/components/NutritionDay'
import { generateNutritionDay, inferDayLoad, getDayLoadLabel, getDayLoadColor } from '@/lib/nutrition'
import { DayLoad } from '@/lib/types'
import { getCurrentWeek } from '@/lib/training'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Utensils, Info, Flame, Droplets } from 'lucide-react'

const TODAY = new Date('2026-06-03')
const TODAY_STR = format(TODAY, 'yyyy-MM-dd')

const DAY_LOADS: DayLoad[] = ['REST', 'EASY', 'MODERATE', 'HARD', 'RACE']

export default function NutritionPage() {
  const { trainingWeeks } = useTrailStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [overrides, setOverrides] = useState<Record<string, DayLoad>>({})

  const currentWeek = getCurrentWeek(trainingWeeks, TODAY)
  const baseWeekNumber = (currentWeek?.weekNumber ?? 0) + weekOffset
  const targetWeek = trainingWeeks[Math.max(0, Math.min(baseWeekNumber, trainingWeeks.length - 1))]

  const weekDays = useMemo(() => {
    if (!targetWeek) return []
    const start = parseISO(targetWeek.startDate)
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const daySessions = targetWeek.sessions.filter(s => s.date === dateStr)

      let load: DayLoad = overrides[dateStr] ?? inferDayLoad(
        daySessions.map(s => ({ type: s.type, zone: s.zone }))
      )

      return {
        date: dateStr,
        dayLabel: format(date, 'EEEE d MMM', { locale: fr }),
        load,
        nutrition: generateNutritionDay(dateStr, load),
        isToday: dateStr === TODAY_STR,
      }
    })
  }, [targetWeek, overrides])

  const totalCaloriesWeek = weekDays.reduce((sum, d) => sum + d.nutrition.totalCalories, 0)
  const avgCalories = Math.round(totalCaloriesWeek / 7)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Utensils className="text-easy" size={24} />
          Nutrition
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Plans nutritionnels adaptés à votre charge d'entraînement quotidienne
        </p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-surface border border-surface-2 rounded-xl px-4 py-3">
        <button
          onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
          disabled={weekOffset === 0}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 px-2 py-1"
        >
          ← Semaine préc.
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {weekOffset === 0 ? 'Semaine en cours' : `Semaine +${weekOffset}`}
          </p>
          {targetWeek && (
            <p className="text-xs text-gray-400">
              {format(parseISO(targetWeek.startDate), 'd MMM', { locale: fr })} –{' '}
              {format(parseISO(targetWeek.endDate), 'd MMM yyyy', { locale: fr })}
            </p>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(o => Math.min(trainingWeeks.length - 1, o + 1))}
          disabled={baseWeekNumber >= trainingWeeks.length - 1}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 px-2 py-1"
        >
          Semaine suiv. →
        </button>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{avgCalories}</p>
          <p className="text-xs text-gray-400">kcal moy/jour</p>
        </div>
        <div className="bg-surface border border-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{totalCaloriesWeek.toLocaleString()}</p>
          <p className="text-xs text-gray-400">kcal total semaine</p>
        </div>
        <div className="bg-surface border border-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-easy">
            {weekDays.filter(d => d.load === 'EASY' || d.load === 'MODERATE').length}
          </p>
          <p className="text-xs text-gray-400">jours modérés</p>
        </div>
        <div className="bg-surface border border-surface-2 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-hard">
            {weekDays.filter(d => d.load === 'HARD' || d.load === 'RACE').length}
          </p>
          <p className="text-xs text-gray-400">jours intensifs</p>
        </div>
      </div>

      {/* Load distribution info */}
      <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-800/30 rounded-xl">
        <Info size={14} className="text-recovery flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300">
          La charge journalière est automatiquement inférée depuis votre plan d'entraînement. Vous pouvez l'ajuster manuellement pour chaque jour.
        </p>
      </div>

      {/* Days */}
      <div className="space-y-3">
        {weekDays.map(({ date, dayLabel, load, nutrition, isToday }) => (
          <div key={date}>
            {/* Day label + load override */}
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-gray-300'}`}>
                {isToday ? `Aujourd'hui · ` : ''}{dayLabel}
              </p>
              <div className="flex gap-1">
                {DAY_LOADS.map(dl => (
                  <button
                    key={dl}
                    onClick={() => setOverrides(prev => ({ ...prev, [date]: dl }))}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                      load === dl
                        ? 'font-semibold'
                        : 'text-gray-600 border-gray-700 hover:text-gray-300'
                    }`}
                    style={load === dl ? {
                      color: getDayLoadColor(dl),
                      borderColor: getDayLoadColor(dl),
                      backgroundColor: `${getDayLoadColor(dl)}15`,
                    } : {}}
                  >
                    {getDayLoadLabel(dl)}
                  </button>
                ))}
              </div>
            </div>
            <NutritionDayComponent day={nutrition} isToday={isToday} />
          </div>
        ))}
      </div>

      {/* Nutrition principles */}
      <div className="bg-surface border border-surface-2 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Principes nutritionnels pour trail élite</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              title: '🔋 Glucides = carburant principal',
              desc: 'Augmenter les glucides avant et pendant les jours durs. 6-10g/kg/jour selon l\'intensité.',
            },
            {
              title: '💪 Protéines pour la récupération',
              desc: '1.8-2.2g/kg/jour pour l\'élite. Consommer dans les 30min post-effort pour optimiser la récup.',
            },
            {
              title: '🫒 Graisses de qualité',
              desc: 'Huile d\'olive, avocat, noix pour les jours de repos. Réduire avant les compétitions.',
            },
            {
              title: '💧 Hydratation stratégique',
              desc: 'Urine claire = bien hydraté. +500ml/h d\'effort intense. Électrolytes pour les longues sorties.',
            },
            {
              title: '⏰ Timing nutritionnel',
              desc: 'Repas principal 3h avant l\'effort. Collation 30-60min avant. Fenêtre anabolique de 30min post-effort.',
            },
            {
              title: '🔬 Suppléments recommandés',
              desc: 'Magnésium (récupération musculaire), Fer (élite endurance), Vitamine D3, Oméga-3.',
            },
          ].map(item => (
            <div key={item.title} className="bg-surface-2 rounded-lg p-3">
              <p className="text-xs font-semibold text-white mb-1">{item.title}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Race nutrition */}
        <div className="border-t border-surface-2 pt-4">
          <h4 className="text-xs font-bold text-race mb-2">🏁 Nutrition en course (Ultra/Trail)</h4>
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-xs font-semibold text-white">Pendant l'effort</p>
              <p className="text-xs text-gray-400 mt-1">60-90g glucides/heure · Alterner solide/liquide · Gels toutes les 45min</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-xs font-semibold text-white">Ravitaillements</p>
              <p className="text-xs text-gray-400 mt-1">Soupe, riz, pomme de terre salée, banane, coca-cola (après 60km)</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-xs font-semibold text-white">La nuit (Ultra)</p>
              <p className="text-xs text-gray-400 mt-1">Café, aliments salés, bouillon chaud, chips, éviter le sucré pur</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
