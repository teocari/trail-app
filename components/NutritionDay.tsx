'use client'

import { NutritionDay as NutritionDayType } from '@/lib/types'
import { getDayLoadLabel, getDayLoadColor } from '@/lib/nutrition'
import { Droplets, Flame, ChevronDown, ChevronUp, ShoppingBag, Lightbulb } from 'lucide-react'
import { useState } from 'react'

import { Meal } from '@/lib/types'

function MealCard({ label, meal }: { label: string; meal: Meal }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-surface-2 rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-300">{label}</span>
          <span className="text-xs text-gray-500">{meal.calories} kcal</span>
        </div>
        <p className="text-xs font-medium text-white">{meal.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{meal.description}</p>
        <div className="flex gap-3 mt-1.5">
          <span className="text-xs text-blue-400">{meal.protein}g prot</span>
          <span className="text-xs text-yellow-400">{meal.carbs}g gluc</span>
          <span className="text-xs text-orange-400">{meal.fat}g lip</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-accent transition-colors"
        >
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {open ? 'Masquer les détails' : 'Marques & pourquoi ce repas'}
        </button>
      </div>
      {open && (
        <div className="border-t border-surface px-3 pb-3 pt-2 space-y-2">
          <div className="flex items-start gap-1.5">
            <ShoppingBag size={12} className="text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-accent mb-1">Marques recommandées</p>
              <ul className="space-y-0.5">
                {meal.brands.map((b, i) => (
                  <li key={i} className="text-xs text-gray-400">· {b}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Lightbulb size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-yellow-400 mb-1">Pourquoi ce repas ?</p>
              <p className="text-xs text-gray-400 leading-relaxed">{meal.performanceRationale}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  day: NutritionDayType
  isToday?: boolean
}

export default function NutritionDay({ day, isToday = false }: Props) {
  const [expanded, setExpanded] = useState(isToday)
  const loadColor = getDayLoadColor(day.load)
  const loadLabel = getDayLoadLabel(day.load)

  const proteinPct = Math.round((day.protein * 4 / day.totalCalories) * 100)
  const carbsPct = Math.round((day.carbs * 4 / day.totalCalories) * 100)
  const fatPct = Math.round((day.fat * 9 / day.totalCalories) * 100)

  return (
    <div className={`rounded-xl border bg-surface overflow-hidden ${isToday ? 'border-accent/50' : 'border-surface-2'}`}>
      {/* Header button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors text-left"
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: loadColor }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isToday && (
              <span className="text-xs bg-accent text-black font-bold px-2 py-0.5 rounded-full">
                AUJOURD'HUI
              </span>
            )}
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ color: loadColor, backgroundColor: `${loadColor}20` }}
            >
              {loadLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Flame size={11} />
              {day.totalCalories} kcal
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Droplets size={11} />
              {day.hydrationLiters} L
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Macros */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Macronutriments</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-surface-2 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-blue-400">{day.protein}g</p>
                <p className="text-xs text-gray-500">Protéines</p>
                <p className="text-xs text-gray-600">{proteinPct}%</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-yellow-400">{day.carbs}g</p>
                <p className="text-xs text-gray-500">Glucides</p>
                <p className="text-xs text-gray-600">{carbsPct}%</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-orange-400">{day.fat}g</p>
                <p className="text-xs text-gray-500">Lipides</p>
                <p className="text-xs text-gray-600">{fatPct}%</p>
              </div>
            </div>
            {/* Macro bar */}
            <div className="h-2 rounded-full overflow-hidden flex">
              <div className="bg-blue-400 h-full" style={{ width: `${proteinPct}%` }} />
              <div className="bg-yellow-400 h-full" style={{ width: `${carbsPct}%` }} />
              <div className="bg-orange-400 h-full" style={{ width: `${fatPct}%` }} />
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Repas</p>

            {[
              { label: '🌅 Petit-déjeuner', meal: day.breakfast },
              { label: '☀️ Déjeuner', meal: day.lunch },
              { label: '🌙 Dîner', meal: day.dinner },
            ].map(({ label, meal }) => (
              <MealCard key={label} label={label} meal={meal} />
            ))}
          </div>

          {/* Snacks */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Collations</p>
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-300 mb-1">⚡ Avant l'effort</p>
              <p className="text-xs text-gray-400">{day.preWorkoutSnack}</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-300 mb-1">🔋 Après l'effort</p>
              <p className="text-xs text-gray-400">{day.postWorkoutSnack}</p>
            </div>
          </div>

          {/* Hydration */}
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Droplets size={14} className="text-recovery" />
              <span className="text-xs font-semibold text-recovery">Hydratation cible</span>
            </div>
            <p className="text-sm font-bold text-white mt-1">{day.hydrationLiters} litres</p>
            <p className="text-xs text-gray-400">Boire régulièrement tout au long de la journée</p>
          </div>
        </div>
      )}
    </div>
  )
}
