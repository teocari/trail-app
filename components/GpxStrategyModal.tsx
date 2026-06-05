'use client'

import { useState, useRef, useCallback } from 'react'
import { Race, GpxAnalysis, RaceKeyWaypoint, GradientClass } from '@/lib/types'
import { GRADIENT_COLORS } from '@/lib/gpx'
import { X, MapPin, Clock, Utensils, Mountain, Navigation } from 'lucide-react'

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

const URGENCY_CONFIG = {
  critical:  { label: 'Critique',   color: '#ef4444', bg: '#ef444420' },
  important: { label: 'Important',  color: '#f97316', bg: '#f9731620' },
  routine:   { label: 'Routine',    color: '#22c55e', bg: '#22c55e20' },
}

const TIMING_ICONS: Record<string, string> = {
  before_climb: '🔺',
  at_summit:    '🏔️',
  on_descent:   '🔻',
  checkpoint:   '🏁',
  regular:      '▶',
}

const WAYPOINT_COLORS: Record<RaceKeyWaypoint['type'], string> = {
  summit:     '#f97316',
  valley:     '#38bdf8',
  checkpoint: '#8b5cf6',
  start:      '#22c55e',
  finish:     '#ef4444',
}

// ─── Tooltip data ──────────────────────────────────────────────────────────────
interface TooltipData {
  x: number
  distKm: number
  elevationM: number
  gradient: number
  gradientClass: GradientClass
  expectedTimeMin: number
}

// ─── Elevation Chart ───────────────────────────────────────────────────────────
function ElevationChart({ gpx }: { gpx: GpxAnalysis }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [hoveredWaypoint, setHoveredWaypoint] = useState<RaceKeyWaypoint | null>(null)

  const W = 800
  const H = 200
  const PX = 48
  const PY = 20

  const pts = gpx.rawPoints
  if (pts.length < 2) {
    return (
      <div className="h-48 bg-surface rounded-xl flex items-center justify-center text-gray-500 text-xs">
        Pas de données d'altitude
      </div>
    )
  }

  const minE = gpx.minElevationM
  const maxE = gpx.maxElevationM
  const totalD = gpx.totalDistanceKm

  const xScale = (dist: number) => PX + (dist / totalD) * (W - PX * 2)
  const yScale = (ele: number) => PY + (1 - (ele - minE) / Math.max(1, maxE - minE)) * (H - PY * 2)

  // Get point data at SVG x position
  const getSvgData = useCallback((clientX: number): TooltipData | null => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = ((clientX - rect.left) / rect.width) * W
    if (svgX < PX || svgX > W - PX) return null

    const distKm = ((svgX - PX) / (W - PX * 2)) * totalD

    // Find closest point
    let closest = pts[0]
    let minDist = Infinity
    for (const p of pts) {
      const d = Math.abs(p.distFromStartKm - distKm)
      if (d < minDist) { minDist = d; closest = p }
    }

    // Find segment
    const seg = gpx.segments.find(s => distKm >= s.startDistKm && distKm <= s.endDistKm)
      ?? gpx.segments[gpx.segments.length - 1]

    // Estimate time at this distance
    let elapsedMin = 0
    for (const s of gpx.segments) {
      if (distKm <= s.endDistKm) {
        const frac = Math.max(0, (distKm - s.startDistKm) / Math.max(0.001, s.distanceKm))
        elapsedMin += frac * s.expectedTimeMin
        break
      }
      elapsedMin += s.expectedTimeMin
    }

    return {
      x: svgX,
      distKm: Math.round(distKm * 10) / 10,
      elevationM: Math.round(closest.ele),
      gradient: seg ? Math.round(seg.gradient * 10) / 10 : 0,
      gradientClass: seg ? seg.gradientClass : 'flat',
      expectedTimeMin: Math.round(elapsedMin),
    }
  }, [pts, gpx, totalD])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip(getSvgData(e.clientX))
  }, [getSvgData])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) setTooltip(getSvgData(touch.clientX))
  }, [getSvgData])

  // ── Assign a gradient class color to each raw point based on the segment it belongs to ──
  // This avoids empty segments (too few points per segment) by working point-by-point
  type ColoredRun = { color: string; points: { x: number; y: number }[] }
  const coloredRuns: ColoredRun[] = []

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    // Find the segment that contains this point
    const seg = gpx.segments.find(
      s => p.distFromStartKm >= s.startDistKm - 0.001 && p.distFromStartKm <= s.endDistKm + 0.001
    ) ?? gpx.segments[gpx.segments.length - 1]

    const gc = seg?.gradientClass ?? 'flat'
    const color = GRADIENT_COLORS[gc]?.hex ?? '#22c55e'
    const px = xScale(p.distFromStartKm)
    const py = yScale(p.ele)

    const last = coloredRuns[coloredRuns.length - 1]
    if (last && last.color === color) {
      last.points.push({ x: px, y: py })
    } else {
      // Start new run; include last point of previous run for continuity
      const carry = last?.points[last.points.length - 1]
      coloredRuns.push({ color, points: carry ? [carry, { x: px, y: py }] : [{ x: px, y: py }] })
    }
  }

  // Single background fill (dark, covers entire area)
  const bgFillPath = pts.length >= 2 ? [
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.distFromStartKm).toFixed(1)},${yScale(p.ele).toFixed(1)}`).join(' '),
    `L${xScale(pts[pts.length - 1].distFromStartKm).toFixed(1)},${H}`,
    `L${xScale(pts[0].distFromStartKm).toFixed(1)},${H}`,
    'Z',
  ].join(' ') : ''

  // Colored line strokes per run
  const coloredStrokes = coloredRuns.filter(r => r.points.length >= 2).map((run, ri) => {
    const d = run.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    return (
      <path key={ri} d={d} fill="none" stroke={run.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    )
  })

  // Waypoint markers
  const waypointMarkers = gpx.keyWaypoints
    .filter(wp => wp.type !== 'start' && wp.type !== 'finish')
    .map(wp => {
      const x = xScale(wp.distanceKm)
      const y = yScale(wp.elevationM)
      const color = WAYPOINT_COLORS[wp.type]
      const isHovered = hoveredWaypoint?.distanceKm === wp.distanceKm
      return (
        <g
          key={`wp-${wp.distanceKm}`}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoveredWaypoint(wp)}
          onMouseLeave={() => setHoveredWaypoint(null)}
        >
          {wp.type === 'summit' ? (
            <polygon
              points={`${x},${y - 10} ${x - 6},${y + 2} ${x + 6},${y + 2}`}
              fill={isHovered ? color : `${color}cc`}
              stroke={color}
              strokeWidth="1"
            />
          ) : (
            <polygon
              points={`${x},${y + 10} ${x - 6},${y - 2} ${x + 6},${y - 2}`}
              fill={isHovered ? color : `${color}cc`}
              stroke={color}
              strokeWidth="1"
            />
          )}
        </g>
      )
    })

  // Cursor line
  const cursorX = tooltip?.x

  // X axis labels
  const xLabels = []
  const labelInterval = Math.max(5, Math.ceil(totalD / 10 / 5) * 5)
  for (let d = 0; d <= totalD; d += labelInterval) {
    xLabels.push(
      <text key={d} x={xScale(d)} y={H + 14} textAnchor="middle" fill="#6b7280" fontSize="9">
        {d.toFixed(0)}
      </text>
    )
  }

  // Y axis labels
  const yLabels = []
  const elevRange = maxE - minE
  const elevStep = Math.max(100, Math.ceil(elevRange / 4 / 100) * 100)
  for (let e = Math.ceil(minE / 100) * 100; e <= maxE; e += elevStep) {
    yLabels.push(
      <text key={e} x={PX - 5} y={yScale(e) + 3} textAnchor="end" fill="#6b7280" fontSize="9">
        {e}
      </text>
    )
  }

  const tooltipColor = tooltip ? (GRADIENT_COLORS[tooltip.gradientClass]?.hex ?? '#22c55e') : '#22c55e'
  const tooltipLabel = tooltip ? (GRADIENT_COLORS[tooltip.gradientClass]?.label ?? '') : ''

  return (
    <div className="bg-surface rounded-xl p-3 space-y-3">
      <p className="text-xs text-gray-500">Profil altimétrique coloré par type de terrain · ▲ sommet · ▼ vallée</p>

      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H + 20}`}
          width="100%"
          style={{ minWidth: 280, touchAction: 'none' }}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setTooltip(null)}
        >
          {/* Background fill (single dark area) */}
          {bgFillPath && <path d={bgFillPath} fill="#1e293b60" />}

          {/* Colored strokes per gradient class */}
          {coloredStrokes}

          {/* Waypoint markers */}
          {waypointMarkers}

          {/* Cursor line */}
          {cursorX !== undefined && (
            <line x1={cursorX} y1={PY} x2={cursorX} y2={H} stroke="#ffffff40" strokeWidth="1" />
          )}

          {/* Axes */}
          <line x1={PX} y1={PY} x2={PX} y2={H} stroke="#334155" strokeWidth="1" />
          <line x1={PX} y1={H} x2={W - PX} y2={H} stroke="#334155" strokeWidth="1" />
          {xLabels}
          {yLabels}
          <text x={W - PX + 4} y={H + 14} fill="#6b7280" fontSize="9">km</text>
          <text x={PX - 4} y={PY - 4} textAnchor="end" fill="#6b7280" fontSize="9">m</text>
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="bg-surface-2 border rounded-lg px-3 py-2 text-xs space-y-0.5 pointer-events-none"
          style={{ borderColor: tooltipColor }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tooltipColor }} />
            <span className="font-semibold" style={{ color: tooltipColor }}>{tooltipLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-300">
            <span>Distance</span><span className="text-white font-mono">{tooltip.distKm} km</span>
            <span>Altitude</span><span className="text-white font-mono">{tooltip.elevationM} m</span>
            <span>Pente</span><span className="text-white font-mono">{tooltip.gradient > 0 ? '+' : ''}{tooltip.gradient}%</span>
            <span>Temps estimé</span><span className="text-white font-mono">{formatMin(tooltip.expectedTimeMin)}</span>
          </div>
        </div>
      )}

      {/* Hovered waypoint card */}
      {hoveredWaypoint && (
        <div className="bg-surface-2 border rounded-lg px-3 py-2 text-xs" style={{ borderColor: WAYPOINT_COLORS[hoveredWaypoint.type] }}>
          <div className="font-semibold text-white">{hoveredWaypoint.name}</div>
          <div className="text-gray-400 mt-0.5">{hoveredWaypoint.notes}</div>
          <div className="text-gray-500 mt-0.5">Temps estimé : {formatMin(hoveredWaypoint.expectedTimeMin)}</div>
        </div>
      )}

      {/* Gradient legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {(Object.entries(GRADIENT_COLORS) as [GradientClass, typeof GRADIENT_COLORS[GradientClass]][]).map(([gc, info]) => (
          <div key={gc} className="flex items-center gap-1">
            <div className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: info.hex }} />
            <span className="text-[10px] text-gray-500">{info.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
export default function GpxStrategyModal({ race, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('profil')
  const gpx = race.gpxAnalysis
  if (!gpx) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profil',    label: 'Profil altimétrique',     icon: <Mountain size={13} /> },
    { id: 'allures',   label: 'Temps de passage',         icon: <Clock size={13} /> },
    { id: 'nutrition', label: 'Stratégie nutritionnelle', icon: <Utensils size={13} /> },
  ]

  const totalNutritionGels = gpx.nutritionCheckpoints.reduce((s, c) => s + c.gels, 0)
  const totalNutritionWaterL = Math.round(
    gpx.nutritionCheckpoints.reduce((s, c) => s + c.waterMl, 0) / 1000 * 10
  ) / 10
  const totalCalories = gpx.nutritionCheckpoints.length > 0
    ? gpx.nutritionCheckpoints[gpx.nutritionCheckpoints.length - 1].caloriesTotal
    : 0
  const totalCarbsG = gpx.nutritionCheckpoints.reduce((s, c) => s + c.carbsG, 0)
  const totalSodiumMg = gpx.nutritionCheckpoints.reduce((s, c) => s + c.sodiumMg, 0)
  const totalBars = gpx.nutritionCheckpoints.filter(c => c.barProduct).length
  const caffeineGels = gpx.nutritionCheckpoints.filter(c => c.gelProduct.includes('CAF')).length

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
              <span>{gpx.totalElevationLoss.toLocaleString()} m D-</span>
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

          {/* ── TAB 1: Elevation profile ── */}
          {tab === 'profil' && (
            <div className="space-y-4">
              {/* Warning if analysis might be stale */}
              <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-xs text-yellow-300">
                <span>⚠️</span>
                <span>Si les couleurs ou allures semblent incorrectes, supprime et recrée la course en ré-important le fichier GPX pour bénéficier du calcul de gradient amélioré.</span>
              </div>
              <ElevationChart gpx={gpx} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Altitude max', value: `${gpx.maxElevationM} m` },
                  { label: 'Altitude min', value: `${gpx.minElevationM} m` },
                  { label: 'D+', value: `${gpx.totalElevationGain.toLocaleString()} m` },
                  { label: 'D-', value: `${gpx.totalElevationLoss.toLocaleString()} m` },
                ].map(s => (
                  <div key={s.label} className="bg-surface rounded-lg p-3">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-white font-bold text-sm mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Key waypoints list */}
              {gpx.keyWaypoints.length > 2 && (
                <div className="bg-surface rounded-xl p-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Points clés du parcours</h3>
                  <div className="space-y-2">
                    {gpx.keyWaypoints.map((wp, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: WAYPOINT_COLORS[wp.type] }}
                        />
                        <span className="text-gray-400 w-14 flex-shrink-0">{wp.distanceKm.toFixed(1)} km</span>
                        <span className="text-white font-medium flex-1">{wp.name}</span>
                        <span className="text-gray-500">{formatMin(wp.expectedTimeMin)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Pace / passage times ── */}
          {tab === 'allures' && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="bg-surface rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Résumé</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Distance</p>
                    <p className="text-white font-bold">{gpx.totalDistanceKm.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">D+ / D-</p>
                    <p className="text-white font-bold">{gpx.totalElevationGain.toLocaleString()} / {gpx.totalElevationLoss.toLocaleString()} m</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Temps estimé</p>
                    <p className="text-white font-bold">{formatMin(gpx.estimatedFinishTimeMin)}</p>
                  </div>
                  {race.goalTimeMin && (
                    <div>
                      <p className="text-xs text-gray-500">Objectif / Écart</p>
                      <p className="text-accent font-bold">
                        {formatGoalTime(race.goalTimeMin)}{' '}
                        <span className={`text-xs ${gpx.estimatedFinishTimeMin <= race.goalTimeMin ? 'text-green-400' : 'text-red-400'}`}>
                          ({gpx.estimatedFinishTimeMin <= race.goalTimeMin ? '-' : '+'}
                          {formatMin(Math.abs(gpx.estimatedFinishTimeMin - race.goalTimeMin))})
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-2">
                      <th className="text-left py-2 pr-3">Distance</th>
                      <th className="text-left py-2 pr-3">Altitude</th>
                      <th className="text-left py-2 pr-3">Type</th>
                      <th className="text-left py-2 pr-3">Temps estimé</th>
                      {race.goalTimeMin && <th className="text-left py-2 pr-3">Objectif</th>}
                      <th className="text-left py-2 pr-3">Allure</th>
                      <th className="text-left py-2 pr-3">Pente</th>
                      <th className="text-left py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpx.paceCheckpoints.map((cp, i) => {
                      const wp = gpx.keyWaypoints.find(w => Math.abs(w.distanceKm - cp.distanceKm) < 0.3)
                      const rowColor = wp
                        ? wp.type === 'summit' ? 'bg-orange-500/5'
                        : wp.type === 'valley' ? 'bg-blue-500/5'
                        : wp.type === 'start' || wp.type === 'finish' ? 'bg-accent/5'
                        : i % 2 === 0 ? 'bg-surface' : 'bg-background'
                        : i % 2 === 0 ? 'bg-surface' : 'bg-background'

                      // Goal pace (proportional)
                      const goalPaceDisplay = race.goalTimeMin
                        ? formatMin(Math.round((cp.distanceKm / gpx.totalDistanceKm) * race.goalTimeMin))
                        : null

                      return (
                        <tr key={i} className={`border-b border-surface-2 ${rowColor}`}>
                          <td className="py-2 pr-3 text-white font-semibold">{cp.distanceKm.toFixed(1)} km</td>
                          <td className="py-2 pr-3 text-gray-400">{cp.elevationAtPoint} m</td>
                          <td className="py-2 pr-3">
                            {wp ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{ color: WAYPOINT_COLORS[wp.type], backgroundColor: `${WAYPOINT_COLORS[wp.type]}20` }}
                              >
                                {wp.type === 'summit' ? '▲ Sommet'
                                  : wp.type === 'valley' ? '▼ Vallée'
                                  : wp.type === 'start' ? '▶ Départ'
                                  : wp.type === 'finish' ? '🏁 Arrivée'
                                  : '◆ Point'}
                              </span>
                            ) : (
                              <span className="text-gray-600">km {cp.distanceKm.toFixed(0)}</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-gray-300">{formatMin(cp.elapsedMin)}</td>
                          {race.goalTimeMin && <td className="py-2 pr-3 text-accent/70">{goalPaceDisplay}</td>}
                          <td className="py-2 pr-3 text-gray-300 font-mono text-[11px]">{cp.segmentPace}</td>
                          <td className="py-2 pr-3">
                            <span className={`font-mono ${cp.gradient > 0 ? 'text-orange-400' : cp.gradient < 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                              {cp.gradient > 0 ? '+' : ''}{cp.gradient}%
                            </span>
                          </td>
                          <td className="py-2 text-gray-500 max-w-[160px] text-[10px]">{cp.notes}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {gpx.paceCheckpoints.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">Aucun point de passage disponible.</p>
              )}
            </div>
          )}

          {/* ── TAB 3: Nutrition strategy ── */}
          {tab === 'nutrition' && (
            <div className="space-y-4">
              {/* Header card: totals */}
              <div className="bg-surface rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Besoins totaux estimés</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Calories', value: `${totalCalories.toLocaleString()} kcal` },
                    { label: 'Glucides', value: `${totalCarbsG} g` },
                    { label: 'Eau', value: `${totalNutritionWaterL} L` },
                    { label: 'Sodium', value: `${Math.round(totalSodiumMg / 1000 * 10) / 10} g` },
                  ].map(s => (
                    <div key={s.label} className="bg-surface-2 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-white font-bold text-sm mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences display */}
              {race.nutritionPrefs && (
                <div className="bg-surface rounded-xl p-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Préférences nutrition</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {race.nutritionPrefs.gelCarbsPerDose > 0 && (
                      <span className="bg-surface-2 rounded px-2 py-1 text-gray-300">
                        Gel : {race.nutritionPrefs.gelCarbsPerDose}g/dose
                      </span>
                    )}
                    {race.nutritionPrefs.barCarbsPerDose > 0 && (
                      <span className="bg-surface-2 rounded px-2 py-1 text-gray-300">
                        Barre : {race.nutritionPrefs.barCarbsPerDose}g/dose
                      </span>
                    )}
                    {race.nutritionPrefs.drinkCarbsPer500ml > 0 && (
                      <span className="bg-surface-2 rounded px-2 py-1 text-gray-300">
                        Boisson : {race.nutritionPrefs.drinkCarbsPer500ml}g/500ml
                      </span>
                    )}
                    {race.nutritionPrefs.electrolyteOk && (
                      <span className="bg-surface-2 rounded px-2 py-1 text-gray-300">
                        Électrolytes : ✓
                      </span>
                    )}
                    <span className="bg-surface-2 rounded px-2 py-1 text-gray-300">
                      Estomac : {race.nutritionPrefs.stomachSensitivity}
                    </span>
                    {race.nutritionPrefs.caffeineOk && (
                      <span className="bg-accent/10 text-accent border border-accent/30 rounded px-2 py-1">
                        Caféine ✓
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Alerts */}
              {race.specs?.expectedTempC !== undefined && race.specs.expectedTempC > 25 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                  <span className="font-bold">Chaleur {race.specs.expectedTempC}°C :</span> Eau +30%, sodium +40%. Hydratez-vous avant d'avoir soif.
                </div>
              )}
              {race.specs?.maxAltitudeM !== undefined && race.specs.maxAltitudeM > 2500 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-400">
                  <span className="font-bold">Altitude {race.specs.maxAltitudeM}m :</span> L'appétit diminue en altitude. Mangez même sans faim.
                </div>
              )}
              {race.specs?.hasNightSection && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-xs text-accent">
                  <span className="font-bold">Section nocturne :</span> Gels et liquides faciles dans l'obscurité. Caféine après minuit.
                </div>
              )}

              {/* Timeline table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-2">
                      <th className="text-left py-2 pr-3">Km</th>
                      <th className="text-left py-2 pr-3">Temps</th>
                      <th className="text-left py-2 pr-3">Terrain</th>
                      <th className="text-left py-2 pr-3">Urgence</th>
                      <th className="text-left py-2 pr-3">Produit gel</th>
                      <th className="text-left py-2 pr-3">Boisson / Barre</th>
                      <th className="text-left py-2 pr-3">Électrolytes</th>
                      <th className="text-left py-2 pr-3">Glucides</th>
                      <th className="text-left py-2 pr-3">Eau</th>
                      <th className="text-left py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpx.nutritionCheckpoints.map((cp, i) => {
                      const urgCfg = URGENCY_CONFIG[cp.urgency]
                      return (
                        <tr key={i} className={`border-b border-surface-2 ${i % 2 === 0 ? 'bg-surface' : 'bg-background'}`}>
                          <td className="py-2 pr-3 text-white font-semibold">{cp.distanceKm.toFixed(1)}</td>
                          <td className="py-2 pr-3 text-gray-300">{formatMin(cp.elapsedMin)}</td>
                          <td className="py-2 pr-3 text-gray-400 text-[11px]">
                            {TIMING_ICONS[cp.timing]} {cp.timing.replace('_', ' ')}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{ color: urgCfg.color, backgroundColor: urgCfg.bg }}
                            >
                              {urgCfg.label}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-gray-300 max-w-[180px] text-[11px]">{cp.gelProduct}</td>
                          <td className="py-2 pr-3 text-gray-400 max-w-[140px] text-[11px]">{cp.drinkProduct || cp.barProduct || '—'}</td>
                          <td className="py-2 pr-3 text-gray-400 max-w-[160px] text-[11px]">{cp.electrolyteProduct}</td>
                          <td className="py-2 pr-3 text-gray-300 font-mono">{cp.carbsG}g</td>
                          <td className="py-2 pr-3 text-gray-300 font-mono">{cp.waterMl}ml</td>
                          <td className="py-2 text-gray-500 max-w-[140px] text-[10px]">{cp.recommendation}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {gpx.nutritionCheckpoints.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">Aucun point nutritionnel disponible.</p>
              )}

              {/* Pack list summary */}
              <div className="bg-surface rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Résumé pack course</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total gels', value: `${totalNutritionGels}`, sub: caffeineGels > 0 ? `dont ${caffeineGels} caféine` : undefined },
                    { label: 'Total barres', value: `${totalBars}` },
                    { label: 'Total eau', value: `${totalNutritionWaterL} L` },
                    { label: 'Sodium total', value: `${(totalSodiumMg / 1000).toFixed(1)} g` },
                  ].map(s => (
                    <div key={s.label} className="bg-surface-2 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-white font-bold text-lg">{s.value}</p>
                      {s.sub && <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
