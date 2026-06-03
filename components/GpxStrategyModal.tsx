'use client'

import { useState } from 'react'
import { Race, GpxSegment, RacePaceCheckpoint, RaceNutritionCheckpoint } from '@/lib/types'
import { X, MapPin, Clock, Utensils } from 'lucide-react'

interface Props {
  race: Race
  onClose: () => void
}

type Tab = 'profil' | 'allures' | 'nutrition'

function formatMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = Math.round(totalMin % 60)
  if (h === 0) return `${m}min`
  return `${h}h${String(m).padStart(2, '0')}`
}

function formatGoalTime(goalTimeMin: number): string {
  const h = Math.floor(goalTimeMin / 60)
  const m = goalTimeMin % 60
  return `${h}h${String(m).padStart(2, '0')}min`
}

const segmentColors: Record<'climb' | 'descent' | 'flat', string> = {
  climb: '#22c55e',
  descent: '#f97316',
  flat: '#3b82f6',
}

const segmentLabels: Record<'climb' | 'descent' | 'flat', string> = {
  climb: 'Montée',
  descent: 'Descente',
  flat: 'Plat',
}

export default function GpxStrategyModal({ race, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('profil')
  const gpx = race.gpxAnalysis
  if (!gpx) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profil', label: 'Profil altimétrique', icon: <MapPin size={14} /> },
    { id: 'allures', label: 'Stratégie d\'allures', icon: <Clock size={14} /> },
    { id: 'nutrition', label: 'Stratégie nutritionnelle', icon: <Utensils size={14} /> },
  ]

  // SVG elevation profile
  const totalNutritionGels = gpx.nutritionCheckpoints.reduce((s, c) => s + c.gels, 0)
  const totalNutritionWaterL = Math.round(gpx.nutritionCheckpoints.reduce((s, c) => s + c.waterMl, 0) / 1000 * 10) / 10
  const totalCalories = gpx.nutritionCheckpoints.length > 0
    ? gpx.nutritionCheckpoints[gpx.nutritionCheckpoints.length - 1].caloriesTotal
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-background overflow-hidden">
      <div className="flex flex-col w-full max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-2 bg-surface flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{race.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
              <span>{gpx.totalDistanceKm.toFixed(1)} km</span>
              <span>{gpx.totalElevationGain.toLocaleString()} m D+</span>
              <span>Estimé : {formatMin(gpx.estimatedFinishTimeMin)}</span>
              {race.goalTimeMin && (
                <span className="text-accent font-semibold">Objectif : {formatGoalTime(race.goalTimeMin)}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-4">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-2 bg-surface flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: Elevation profile */}
          {tab === 'profil' && (
            <div className="space-y-4">
              <ElevationChart gpx={gpx} />

              {/* Key stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-gray-500">Altitude max</p>
                  <p className="text-white font-bold text-sm">{gpx.maxElevationM} m</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-gray-500">Altitude min</p>
                  <p className="text-white font-bold text-sm">{gpx.minElevationM} m</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-gray-500">D+</p>
                  <p className="text-white font-bold text-sm">{gpx.totalElevationGain.toLocaleString()} m</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-gray-500">D-</p>
                  <p className="text-white font-bold text-sm">{gpx.totalElevationLoss.toLocaleString()} m</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-4">
                {(['climb', 'descent', 'flat'] as const).map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: segmentColors[t] }} />
                    <span className="text-xs text-gray-400">{segmentLabels[t]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Pace strategy */}
          {tab === 'allures' && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl p-4">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Temps estimé</p>
                    <p className="text-white font-bold">{formatMin(gpx.estimatedFinishTimeMin)}</p>
                  </div>
                  {race.goalTimeMin && (
                    <div>
                      <p className="text-xs text-gray-500">Objectif</p>
                      <p className="text-accent font-bold">{formatGoalTime(race.goalTimeMin)}</p>
                    </div>
                  )}
                  {race.goalTimeMin && (
                    <div>
                      <p className="text-xs text-gray-500">Écart</p>
                      <p className={`font-bold text-sm ${gpx.estimatedFinishTimeMin <= race.goalTimeMin ? 'text-easy' : 'text-race'}`}>
                        {gpx.estimatedFinishTimeMin <= race.goalTimeMin ? '-' : '+'}
                        {formatMin(Math.abs(gpx.estimatedFinishTimeMin - race.goalTimeMin))}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-2">
                      <th className="text-left py-2 pr-3">Distance</th>
                      <th className="text-left py-2 pr-3">Temps estimé</th>
                      <th className="text-left py-2 pr-3">Allure</th>
                      <th className="text-left py-2 pr-3">Type</th>
                      <th className="text-left py-2 pr-3">Altitude</th>
                      <th className="text-left py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpx.paceCheckpoints.map((cp, i) => (
                      <tr
                        key={i}
                        className={`border-b border-surface-2 ${i % 2 === 0 ? 'bg-surface' : 'bg-background'}`}
                      >
                        <td className="py-2 pr-3 text-white font-semibold">{cp.distanceKm.toFixed(1)} km</td>
                        <td className="py-2 pr-3 text-gray-300">{formatMin(cp.elapsedMin)}</td>
                        <td className="py-2 pr-3 text-gray-300 font-mono">{cp.segmentPace}</td>
                        <td className="py-2 pr-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              color: segmentColors[cp.segmentType],
                              backgroundColor: `${segmentColors[cp.segmentType]}20`,
                            }}
                          >
                            {segmentLabels[cp.segmentType]}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-400">{Math.round(cp.elevationAtPoint)} m</td>
                        <td className="py-2 text-gray-500 max-w-[160px]">{cp.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {gpx.paceCheckpoints.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">Aucun point de contrôle disponible.</p>
              )}
            </div>
          )}

          {/* TAB 3: Nutrition strategy */}
          {tab === 'nutrition' && (
            <div className="space-y-4">
              {/* Intro */}
              <div className="bg-surface rounded-xl p-4">
                <p className="text-sm text-gray-300">
                  Besoins caloriques totaux estimés pour cette course :{' '}
                  <span className="text-white font-bold">{totalCalories.toLocaleString()} kcal</span>.
                  Prévoyez{' '}
                  <span className="text-white font-bold">~{totalNutritionGels} gels</span> et{' '}
                  <span className="text-white font-bold">{totalNutritionWaterL} L d'eau</span> sur le parcours.
                </p>
              </div>

              {/* Alerts */}
              {race.specs?.expectedTempC !== undefined && race.specs.expectedTempC > 25 && (
                <div className="bg-hard/10 border border-hard/30 rounded-lg p-3 text-xs text-hard">
                  <span className="font-bold">Chaleur :</span> Augmentez l'apport en eau et en sodium. Hydratez-vous avant d'avoir soif.
                </div>
              )}
              {race.specs?.maxAltitudeM !== undefined && race.specs.maxAltitudeM > 2500 && (
                <div className="bg-recovery/10 border border-recovery/30 rounded-lg p-3 text-xs text-recovery">
                  <span className="font-bold">Altitude :</span> L'appétit peut diminuer en altitude. Mangez même sans faim pour maintenir votre énergie.
                </div>
              )}
              {race.specs?.hasNightSection && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-xs text-accent">
                  <span className="font-bold">Section nocturne :</span> Prévoyez des aliments faciles à consommer dans l'obscurité (gels, liquides). Caféine possible après minuit.
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[620px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-2">
                      <th className="text-left py-2 pr-3">Km</th>
                      <th className="text-left py-2 pr-3">Temps</th>
                      <th className="text-left py-2 pr-3">Cal. cumulées</th>
                      <th className="text-left py-2 pr-3">À consommer</th>
                      <th className="text-left py-2 pr-3">Eau</th>
                      <th className="text-left py-2 pr-3">Sodium</th>
                      <th className="text-left py-2">Recommandation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpx.nutritionCheckpoints.map((cp, i) => (
                      <tr
                        key={i}
                        className={`border-b border-surface-2 ${i % 2 === 0 ? 'bg-surface' : 'bg-background'}`}
                      >
                        <td className="py-2 pr-3 text-white font-semibold">{cp.distanceKm.toFixed(1)}</td>
                        <td className="py-2 pr-3 text-gray-300">{formatMin(cp.elapsedMin)}</td>
                        <td className="py-2 pr-3 text-gray-300">{cp.caloriesTotal.toLocaleString()} kcal</td>
                        <td className="py-2 pr-3 text-gray-300">{cp.caloriesToConsume} kcal</td>
                        <td className="py-2 pr-3 text-gray-300">{cp.waterMl} ml</td>
                        <td className="py-2 pr-3 text-gray-300">{cp.sodiumMg} mg</td>
                        <td className="py-2 text-gray-400 max-w-[180px]">{cp.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {gpx.nutritionCheckpoints.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">Aucun point nutritionnel disponible.</p>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Total gels</p>
                  <p className="text-white font-bold text-lg">{totalNutritionGels}</p>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Total eau</p>
                  <p className="text-white font-bold text-lg">{totalNutritionWaterL} L</p>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Total calories</p>
                  <p className="text-white font-bold text-lg">{totalCalories.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ElevationChart({ gpx }: { gpx: NonNullable<Race['gpxAnalysis']> }) {
  const width = 800
  const height = 160
  const paddingX = 40
  const paddingY = 20

  const pts = gpx.rawPoints
  if (pts.length < 2) return <div className="h-40 bg-surface rounded-xl flex items-center justify-center text-gray-500 text-xs">Pas de données d'altitude</div>

  const minE = gpx.minElevationM
  const maxE = gpx.maxElevationM
  const totalD = gpx.totalDistanceKm

  const xScale = (dist: number) => paddingX + (dist / totalD) * (width - paddingX * 2)
  const yScale = (ele: number) => paddingY + (1 - (ele - minE) / Math.max(1, maxE - minE)) * (height - paddingY * 2)

  // Build path string
  const pathParts = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.distFromStartKm).toFixed(1)},${yScale(p.ele).toFixed(1)}`)
  const fillPath = [
    ...pathParts,
    `L${xScale(totalD).toFixed(1)},${height}`,
    `L${xScale(0).toFixed(1)},${height}`,
    'Z',
  ].join(' ')

  // Build colored segments from segments data
  const segmentPaths = gpx.segments.map(seg => {
    const startPts = pts.filter(p => p.distFromStartKm >= seg.startDistKm && p.distFromStartKm <= seg.endDistKm)
    if (startPts.length < 2) return null
    const d = startPts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.distFromStartKm).toFixed(1)},${yScale(p.ele).toFixed(1)}`)
      .join(' ')
    return (
      <path
        key={`${seg.startDistKm}-${seg.endDistKm}`}
        d={d}
        fill="none"
        stroke={segmentColors[seg.type]}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    )
  })

  // Nutrition checkpoints markers
  const nutriMarkers = gpx.nutritionCheckpoints.map((cp, i) => {
    const x = xScale(cp.distanceKm)
    const eleAtPt = pts.reduce((prev, curr) =>
      Math.abs(curr.distFromStartKm - cp.distanceKm) < Math.abs(prev.distFromStartKm - cp.distanceKm) ? curr : prev
    )
    const y = yScale(eleAtPt.ele)
    return (
      <g key={i}>
        <line x1={x} y1={y - 10} x2={x} y2={y + 5} stroke="#f97316" strokeWidth="1.5" strokeDasharray="2,2" />
        <circle cx={x} cy={y - 12} r="4" fill="#f97316" />
      </g>
    )
  })

  // X axis labels
  const xLabels = []
  const labelInterval = Math.ceil(totalD / 8)
  for (let d = 0; d <= totalD; d += labelInterval) {
    xLabels.push(
      <text key={d} x={xScale(d)} y={height + 12} textAnchor="middle" className="fill-gray-500" fontSize="9">
        {d.toFixed(0)}
      </text>
    )
  }

  // Y axis labels
  const yLabels = []
  const elevRange = maxE - minE
  const elevStep = Math.ceil(elevRange / 4 / 100) * 100
  for (let e = Math.ceil(minE / 100) * 100; e <= maxE; e += elevStep) {
    yLabels.push(
      <text key={e} x={paddingX - 4} y={yScale(e) + 3} textAnchor="end" className="fill-gray-500" fontSize="9">
        {e}
      </text>
    )
  }

  return (
    <div className="bg-surface rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-2">Profil altimétrique · markers = ravitaillement</p>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height + 20}`}
          width="100%"
          style={{ minWidth: 300 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Base fill */}
          <path d={fillPath} fill="rgba(59,130,246,0.08)" />
          {/* Segment colored lines */}
          {segmentPaths}
          {/* Nutrition markers */}
          {nutriMarkers}
          {/* Axes */}
          <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height} stroke="#334155" strokeWidth="1" />
          <line x1={paddingX} y1={height} x2={width - paddingX} y2={height} stroke="#334155" strokeWidth="1" />
          {xLabels}
          {yLabels}
          {/* X axis unit */}
          <text x={width - paddingX + 4} y={height + 12} className="fill-gray-500" fontSize="9">km</text>
          {/* Y axis unit */}
          <text x={paddingX - 4} y={paddingY - 4} textAnchor="end" className="fill-gray-500" fontSize="9">m</text>
        </svg>
      </div>
    </div>
  )
}
