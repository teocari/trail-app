'use client'

import {
  AthleteProfile,
  GpxPoint,
  GpxSegment,
  GpxAnalysis,
  RacePaceCheckpoint,
  RaceNutritionCheckpoint,
  RaceSpecs,
  GradientClass,
  RaceKeyWaypoint,
  NutritionPreferences,
  GelBrand,
  BarBrand,
  ElectrolyteBrand,
} from './types'
import { computeAthleteZonePaces } from './training'

// ─── Gradient color map ────────────────────────────────────────────────────────
export const GRADIENT_COLORS: Record<GradientClass, { hex: string; label: string; description: string }> = {
  very_steep_up:    { hex: '#dc2626', label: 'Montée très raide',    description: '> 20% — marche nordique obligatoire' },
  steep_up:         { hex: '#ea580c', label: 'Montée raide',         description: '10-20% — marche rapide / trot' },
  moderate_up:      { hex: '#f97316', label: 'Montée modérée',       description: '5-10% — jogging lent' },
  false_flat_up:    { hex: '#eab308', label: 'Faux plat montant',    description: '2-5% — effort léger' },
  flat:             { hex: '#22c55e', label: 'Plat',                 description: '-2% à 2% — allure de course' },
  false_flat_down:  { hex: '#86efac', label: 'Faux plat descendant', description: '-2% à -5% — allure libre' },
  moderate_down:    { hex: '#38bdf8', label: 'Descente modérée',     description: '-5% à -10% — technique' },
  steep_down:       { hex: '#3b82f6', label: 'Descente raide',       description: '-10% à -20% — freinage actif' },
  very_steep_down:  { hex: '#1d4ed8', label: 'Descente très raide',  description: '< -20% — très technique' },
}

export function classifyGradient(pct: number): GradientClass {
  if (pct > 20)  return 'very_steep_up'
  if (pct > 10)  return 'steep_up'
  if (pct > 5)   return 'moderate_up'
  if (pct > 2)   return 'false_flat_up'
  if (pct >= -2) return 'flat'
  if (pct >= -5) return 'false_flat_down'
  if (pct >= -10) return 'moderate_down'
  if (pct >= -20) return 'steep_down'
  return 'very_steep_down'
}

function gradientClassToLegacy(gc: GradientClass): 'climb' | 'descent' | 'flat' {
  if (['very_steep_up', 'steep_up', 'moderate_up', 'false_flat_up'].includes(gc)) return 'climb'
  if (['false_flat_down', 'moderate_down', 'steep_down', 'very_steep_down'].includes(gc)) return 'descent'
  return 'flat'
}

// ─── Haversine ─────────────────────────────────────────────────────────────────
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Parse GPX ─────────────────────────────────────────────────────────────────
export function parseGpx(gpxString: string): GpxPoint[] {
  if (typeof window === 'undefined') return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxString, 'application/xml')
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))
  if (trkpts.length === 0) return []

  const raw: GpxPoint[] = []
  let cumDist = 0
  let prevLat: number | null = null
  let prevLon: number | null = null

  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0')
    const lon = parseFloat(pt.getAttribute('lon') ?? '0')
    const eleEl = pt.querySelector('ele')
    const ele = eleEl ? parseFloat(eleEl.textContent ?? '0') : 0

    if (prevLat !== null && prevLon !== null) {
      cumDist += haversineKm(prevLat, prevLon, lat, lon)
    }
    raw.push({ lat, lon, ele, distFromStartKm: cumDist })
    prevLat = lat
    prevLon = lon
  }

  // 5-point moving average elevation smoothing
  const smoothed = raw.map((p, i) => {
    const start = Math.max(0, i - 2)
    const end = Math.min(raw.length - 1, i + 2)
    const count = end - start + 1
    let sum = 0
    for (let j = start; j <= end; j++) sum += raw[j].ele
    return { ...p, ele: sum / count }
  })

  // Thin to max 800 points
  if (smoothed.length <= 800) return smoothed
  const step = smoothed.length / 800
  const thinned: GpxPoint[] = []
  for (let i = 0; i < 800; i++) {
    thinned.push(smoothed[Math.round(i * step)])
  }
  thinned[799] = smoothed[smoothed.length - 1]
  return thinned
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function parsePaceToSec(paceStr: string): number {
  const match = paceStr.match(/(\d+):(\d+)/)
  if (!match) return 360
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

function getElevationAtDist(points: GpxPoint[], distKm: number): number {
  for (let i = 1; i < points.length; i++) {
    if (points[i].distFromStartKm >= distKm) {
      const frac = (distKm - points[i - 1].distFromStartKm) /
        Math.max(0.0001, points[i].distFromStartKm - points[i - 1].distFromStartKm)
      return points[i - 1].ele + frac * (points[i].ele - points[i - 1].ele)
    }
  }
  return points[points.length - 1]?.ele ?? 0
}

// Nutrition product helpers
interface GelData { name: string; carbsG: number; sodiumMg: number; needsWater: boolean; hasCaffeine?: boolean }
interface BarData { name: string; carbsG: number; notes: string }
interface ElectrolyteData { name: string; sodiumMg: number; notes: string }

const GEL_PRODUCTS: Record<GelBrand, GelData> = {
  maurten:  { name: 'Maurten Gel 100',      carbsG: 25, sodiumMg: 55,  needsWater: false },
  sis:      { name: 'SiS Go Isotonic',       carbsG: 22, sodiumMg: 118, needsWater: false },
  gu:       { name: 'GU Energy Gel',         carbsG: 22, sodiumMg: 60,  needsWater: true  },
  generic:  { name: 'Gel énergétique',       carbsG: 22, sodiumMg: 50,  needsWater: true  },
}

const BAR_PRODUCTS: Record<BarBrand, BarData> = {
  maurten_bar: { name: 'Maurten Solid 225',      carbsG: 48, notes: 'Utiliser <8h de course' },
  clif:        { name: 'Clif Bar',               carbsG: 44, notes: 'Facilement mâchable' },
  real_food:   { name: 'Alimentation solide',    carbsG: 40, notes: 'Riz, banane, dattes, pain' },
  mix:         { name: 'Mix gels + barres',       carbsG: 35, notes: 'Variété selon les ravitaillements' },
}

const ELECTROLYTE_PRODUCTS: Record<ElectrolyteBrand, ElectrolyteData> = {
  precision_hydration: { name: 'Precision Hydration 1000', sodiumMg: 1000, notes: 'Par comprimé dans 500ml' },
  sis_hydro:           { name: 'SiS Hydro Tab',            sodiumMg: 360,  notes: 'Par comprimé dans 500ml' },
  maurten_caf:         { name: 'Maurten Drink Mix 320',    sodiumMg: 170,  notes: 'Boisson complète 80g carbs' },
  tabs:                { name: 'Comprimés génériques',     sodiumMg: 400,  notes: 'Comprimé dans 500ml' },
}

// ─── Main analyzeGpx ──────────────────────────────────────────────────────────
export function analyzeGpx(
  points: GpxPoint[],
  profile: AthleteProfile,
  specs: RaceSpecs,
  goalTimeMin?: number,
  nutritionPrefs?: NutritionPreferences,
): GpxAnalysis {
  const emptyResult: GpxAnalysis = {
    rawPoints: points,
    segments: [],
    totalDistanceKm: 0,
    totalElevationGain: 0,
    totalElevationLoss: 0,
    maxElevationM: 0,
    minElevationM: 0,
    avgGradientClimb: 0,
    paceCheckpoints: [],
    nutritionCheckpoints: [],
    keyWaypoints: [],
    estimatedFinishTimeMin: 0,
  }

  if (points.length < 2) return emptyResult

  const zonePaces = computeAthleteZonePaces(profile)

  // Elevation stats
  let elevGain = 0
  let elevLoss = 0
  let maxElev = points[0].ele
  let minElev = points[0].ele

  for (let i = 1; i < points.length; i++) {
    const diff = points[i].ele - points[i - 1].ele
    if (diff > 0) elevGain += diff
    else elevLoss += Math.abs(diff)
    if (points[i].ele > maxElev) maxElev = points[i].ele
    if (points[i].ele < minElev) minElev = points[i].ele
  }

  const totalDist = points[points.length - 1].distFromStartKm

  // ── Build per-point gradients then group into segments ──────────────────────
  interface RawSeg {
    startDistKm: number
    endDistKm: number
    distKm: number
    elevChange: number
    gradient: number
    gradientClass: GradientClass
  }

  const rawSegs: RawSeg[] = []
  for (let i = 1; i < points.length; i++) {
    const distKm = points[i].distFromStartKm - points[i - 1].distFromStartKm
    if (distKm < 0.001) continue
    const elevChange = points[i].ele - points[i - 1].ele
    const gradientPct = (elevChange / (distKm * 1000)) * 100
    const gc = classifyGradient(gradientPct)
    rawSegs.push({
      startDistKm: points[i - 1].distFromStartKm,
      endDistKm: points[i].distFromStartKm,
      distKm,
      elevChange,
      gradient: gradientPct,
      gradientClass: gc,
    })
  }

  // Merge adjacent same-class segments; absorb tiny (<300m) segments into previous
  const merged: GpxSegment[] = []
  for (const rs of rawSegs) {
    const last = merged[merged.length - 1]
    if (last && last.gradientClass === rs.gradientClass) {
      last.endDistKm = rs.endDistKm
      last.distanceKm += rs.distKm
      last.elevationChange += rs.elevChange
      last.gradient = (last.elevationChange / (last.distanceKm * 1000)) * 100
    } else if (last && rs.distKm < 0.3) {
      // tiny segment — absorb into previous
      last.endDistKm = rs.endDistKm
      last.distanceKm += rs.distKm
      last.elevationChange += rs.elevChange
      last.gradient = (last.elevationChange / (last.distanceKm * 1000)) * 100
      last.gradientClass = classifyGradient(last.gradient)
      last.type = gradientClassToLegacy(last.gradientClass)
    } else {
      merged.push({
        startDistKm: rs.startDistKm,
        endDistKm: rs.endDistKm,
        distanceKm: rs.distKm,
        elevationChange: rs.elevChange,
        gradient: rs.gradient,
        gradientClass: rs.gradientClass,
        type: gradientClassToLegacy(rs.gradientClass),
        avgPaceForProfile: '',
        expectedTimeMin: 0,
      })
    }
  }

  // ── Pace per segment ────────────────────────────────────────────────────────
  const isTechnique = specs.terrainTypes.includes('technique') || specs.terrainTypes.includes('neige')
  const isHot = specs.expectedTempC > 25
  const isCold = specs.expectedTempC < 0
  let startHour = 6
  if (specs.startTime) {
    const parts = specs.startTime.split(':')
    startHour = parseInt(parts[0] ?? '6')
  }

  const z2Sec = parsePaceToSec(zonePaces.z2)

  let cumulativeTimeMin = 0
  for (const seg of merged) {
    let secPerKm: number
    switch (seg.gradientClass) {
      case 'very_steep_up':   secPerKm = parsePaceToSec(zonePaces.uphill22pct); break
      case 'steep_up':        secPerKm = parsePaceToSec(zonePaces.uphill15pct); break
      case 'moderate_up':     secPerKm = parsePaceToSec(zonePaces.uphill8pct);  break
      case 'false_flat_up':   secPerKm = z2Sec * 1.15; break
      case 'flat':            secPerKm = z2Sec; break
      case 'false_flat_down': secPerKm = z2Sec * 0.90; break
      case 'moderate_down':   secPerKm = parsePaceToSec(zonePaces.downhill); break
      case 'steep_down':      secPerKm = parsePaceToSec(zonePaces.downhill) * 1.20; break
      case 'very_steep_down': secPerKm = parsePaceToSec(zonePaces.downhill) * 1.40; break
      default:                secPerKm = z2Sec
    }

    // Altitude modifier
    const refAlt = Math.max(specs.startAltitudeM, getElevationAtDist(points, (seg.startDistKm + seg.endDistKm) / 2))
    if (refAlt > 2000) {
      const above = refAlt - 2000
      secPerKm *= 1 + (above / 500) * 0.03
    }

    if (isHot) secPerKm *= 1.08
    if (isCold) secPerKm *= 1.05
    if (isTechnique) secPerKm *= 1.12

    if (specs.hasNightSection) {
      const elapsedHour = startHour + cumulativeTimeMin / 60
      if (elapsedHour >= 22 || elapsedHour < 6) secPerKm *= 1.08
    }

    const expectedTimeMin = (seg.distanceKm * secPerKm) / 60
    seg.avgPaceForProfile = formatPace(secPerKm)
    seg.expectedTimeMin = expectedTimeMin
    cumulativeTimeMin += expectedTimeMin
  }

  const estimatedFinishTimeMin = merged.reduce((s, seg) => s + seg.expectedTimeMin, 0)

  // Scale to goal time if provided
  if (goalTimeMin && goalTimeMin > 0 && estimatedFinishTimeMin > 0) {
    const scale = goalTimeMin / estimatedFinishTimeMin
    for (const seg of merged) {
      const secPerKm = parsePaceToSec(seg.avgPaceForProfile) / scale
      seg.avgPaceForProfile = formatPace(secPerKm)
      seg.expectedTimeMin *= scale
    }
  }

  const finalEstimated = goalTimeMin && goalTimeMin > 0 ? goalTimeMin
    : merged.reduce((s, seg) => s + seg.expectedTimeMin, 0)

  const climbSegs = merged.filter(s => s.type === 'climb')
  const avgGradientClimb = climbSegs.length > 0
    ? climbSegs.reduce((s, seg) => s + seg.gradient, 0) / climbSegs.length
    : 0

  // ── Key waypoints ───────────────────────────────────────────────────────────
  const keyWaypoints: RaceKeyWaypoint[] = []

  // Build cumulative time map per distance
  const distToTime = (distKm: number): number => {
    let t = 0
    for (const seg of merged) {
      if (distKm <= seg.endDistKm) {
        const frac = Math.max(0, (distKm - seg.startDistKm) / Math.max(0.001, seg.distanceKm))
        return t + frac * seg.expectedTimeMin
      }
      t += seg.expectedTimeMin
    }
    return t
  }

  // Add start
  keyWaypoints.push({
    distanceKm: 0,
    elevationM: Math.round(points[0].ele),
    name: 'Départ',
    type: 'start',
    expectedTimeMin: 0,
    gradientBefore: 0,
    notes: 'Départ de la course',
  })

  // Detect summits and valleys from point array (window 500m)
  const windowPoints = 10 // roughly 500m in thinned array
  for (let i = windowPoints; i < points.length - windowPoints; i++) {
    const curr = points[i].ele
    let isSummit = true
    let isValley = true
    for (let j = i - windowPoints; j <= i + windowPoints; j++) {
      if (j === i) continue
      if (points[j].ele >= curr) isSummit = false
      if (points[j].ele <= curr) isValley = false
    }

    if (isSummit || isValley) {
      const distKm = points[i].distFromStartKm
      // Avoid duplicates within 2km
      const tooClose = keyWaypoints.some(w =>
        Math.abs(w.distanceKm - distKm) < 2.0 && (w.type === 'summit' || w.type === 'valley')
      )
      if (tooClose) continue

      // Gradient from the segment at this point
      const seg = merged.find(s => distKm >= s.startDistKm && distKm <= s.endDistKm)
      const gradBefore = seg ? seg.gradient : 0

      const type = isSummit ? 'summit' : 'valley'
      const typeName = isSummit ? 'Col' : 'Vallée'
      const name = `${typeName} km ${distKm.toFixed(1)} (${Math.round(curr)}m)`
      keyWaypoints.push({
        distanceKm: distKm,
        elevationM: Math.round(curr),
        name,
        type,
        expectedTimeMin: Math.round(distToTime(distKm)),
        gradientBefore: Math.round(gradBefore * 10) / 10,
        notes: isSummit
          ? `Point haut — réhydratation obligatoire`
          : `Point bas — bonne occasion de ravitaillement`,
      })
    }
  }

  // Add finish
  keyWaypoints.push({
    distanceKm: Math.round(totalDist * 10) / 10,
    elevationM: Math.round(points[points.length - 1].ele),
    name: 'Arrivée',
    type: 'finish',
    expectedTimeMin: Math.round(finalEstimated),
    gradientBefore: 0,
    notes: '',
  })

  // Sort by distance
  keyWaypoints.sort((a, b) => a.distanceKm - b.distanceKm)

  // ── Pace checkpoints every 5km + at waypoints ──────────────────────────────
  const paceCheckpoints: RacePaceCheckpoint[] = []
  const checkpointDistsSet = new Set<number>()

  // 5km marks
  for (let d = 5; d < totalDist; d += 5) {
    checkpointDistsSet.add(Math.round(d * 10) / 10)
  }
  // waypoints
  for (const wp of keyWaypoints) {
    if (wp.type !== 'start' && wp.type !== 'finish') {
      checkpointDistsSet.add(Math.round(wp.distanceKm * 10) / 10)
    }
  }
  checkpointDistsSet.add(0)
  checkpointDistsSet.add(Math.round(totalDist * 10) / 10)

  const checkpointDists: number[] = []
  checkpointDistsSet.forEach(v => checkpointDists.push(v))
  checkpointDists.sort((a, b) => a - b)

  for (const dist of checkpointDists) {
    const seg = merged.find(s => dist >= s.startDistKm && dist <= s.endDistKm) ?? merged[merged.length - 1]
    if (!seg) continue
    const eleAtPt = getElevationAtDist(points, dist)
    const elapsedMin = distToTime(dist)

    const wp = keyWaypoints.find(w => Math.abs(w.distanceKm - dist) < 0.2)
    let notes = wp?.notes ?? ''
    if (!notes) {
      if (seg.gradientClass === 'very_steep_up') notes = 'Montée très raide — marche nordique'
      else if (seg.gradientClass === 'steep_up') notes = 'Montée raide — marcher activement'
      else if (seg.gradientClass === 'steep_down' || seg.gradientClass === 'very_steep_down') notes = 'Descente technique — économiser les quadriceps'
      else if (eleAtPt > 2500) notes = `Altitude ${Math.round(eleAtPt)}m — réduire l'effort`
    }

    paceCheckpoints.push({
      distanceKm: dist,
      elapsedMin: Math.round(elapsedMin),
      segmentPace: seg.avgPaceForProfile,
      segmentType: seg.type,
      gradient: Math.round(seg.gradient * 10) / 10,
      elevationAtPoint: Math.round(eleAtPt),
      notes,
    })
  }

  // ── Nutrition checkpoints ──────────────────────────────────────────────────
  const nutritionCheckpoints: RaceNutritionCheckpoint[] = []

  const prefs: NutritionPreferences = nutritionPrefs ?? {
    gelBrand: 'maurten',
    barBrand: 'maurten_bar',
    electrolyteBrand: 'precision_hydration',
    stomachSensitivity: 'normal',
    solidFoodTolerance: 'some',
    caffeineOk: true,
  }

  const gelData = GEL_PRODUCTS[prefs.gelBrand]
  const barData = BAR_PRODUCTS[prefs.barBrand]
  const elecData = ELECTROLYTE_PRODUCTS[prefs.electrolyteBrand]

  const kcalPerHour =
    profile.level === 'elite' ? 750
    : profile.level === 'confirme' ? 650
    : profile.level === 'intermediaire' ? 550
    : 450

  // Carbs target per hour based on race duration
  let carbsPerHour: number
  if (finalEstimated < 180) carbsPerHour = 65       // <3h: 60-75
  else if (finalEstimated < 360) carbsPerHour = 80  // 3-6h: 75-90
  else if (finalEstimated < 720) carbsPerHour = 90  // 6-12h: 80-100
  else carbsPerHour = 70                             // >12h: 60-80 (gut fatigue)

  // Adjust for stomach sensitivity
  if (prefs.stomachSensitivity === 'sensitive') carbsPerHour = Math.round(carbsPerHour * 0.85)

  const waterMlPerHour = isHot ? 780 : 600
  const sodiumMgPerHour = isHot ? 840 : 600

  // Build nutrition timing around terrain awareness
  // Place checkpoints at ~50min intervals, adjusted for terrain
  const nutritionIntervalMin = prefs.stomachSensitivity === 'sensitive' ? 55 : 45
  let nextNutrTime = nutritionIntervalMin
  let cumulTimeForNutr = 0
  let cumulCalories = 0
  let caffeineUsed = false

  for (const seg of merged) {
    const segTime = seg.expectedTimeMin

    while (nextNutrTime <= cumulTimeForNutr + segTime) {
      const fracInSeg = (nextNutrTime - cumulTimeForNutr) / Math.max(0.001, segTime)
      const distAtCheckpoint = seg.startDistKm + fracInSeg * (seg.endDistKm - seg.startDistKm)
      const elapsedHours = nextNutrTime / 60
      cumulCalories = Math.round(elapsedHours * kcalPerHour)

      const intervalHours = nutritionIntervalMin / 60
      const carbsG = Math.round(carbsPerHour * intervalHours)
      const waterMl = Math.round(waterMlPerHour * intervalHours)
      const sodiumMg = Math.round(sodiumMgPerHour * intervalHours)
      const gels = Math.ceil(carbsG / gelData.carbsG)
      const caloriesToConsume = Math.round(carbsG * 4)

      // Determine timing type
      let timing: RaceNutritionCheckpoint['timing'] = 'regular'
      let urgency: RaceNutritionCheckpoint['urgency'] = 'routine'
      let notes = ''

      // Look 10min ahead for a summit or steep climb
      const lookAheadDist = distAtCheckpoint + (10 / 60) * (seg.distanceKm / Math.max(0.001, seg.expectedTimeMin)) * 60
      const upcomingWp = keyWaypoints.find(w => w.type === 'summit' && w.distanceKm > distAtCheckpoint && w.distanceKm <= lookAheadDist)
      const nearSummit = keyWaypoints.find(w => w.type === 'summit' && Math.abs(w.distanceKm - distAtCheckpoint) < 0.5)
      const onLongDescent = seg.gradientClass === 'steep_down' || seg.gradientClass === 'very_steep_down'

      if (nearSummit) {
        timing = 'at_summit'
        urgency = 'critical'
        notes = 'Sommet — réhydratation obligatoire, pas de solide'
      } else if (upcomingWp) {
        timing = 'before_climb'
        urgency = 'important'
        notes = 'Ravitaillement avant montée — prendre un gel maintenant'
      } else if (onLongDescent) {
        timing = 'on_descent'
        urgency = 'routine'
        notes = 'Descente — liquides uniquement, pas de solide'
      } else if (isHot) {
        urgency = 'important'
        notes = 'Chaleur — augmenter hydratation et sodium'
      }

      // After 6h: switch to bars / real food
      const useBarInstead = elapsedHours > 6 && prefs.solidFoodTolerance !== 'none'

      // Caffeine gel: place at 60-70% of race AND > 2h before finish
      const racePct = distAtCheckpoint / totalDist
      const timeToFinish = finalEstimated - nextNutrTime
      const useCaffeine = prefs.caffeineOk && !caffeineUsed && racePct >= 0.60 && racePct <= 0.75 && timeToFinish > 120

      let gelProduct: string
      if (timing === 'at_summit') {
        gelProduct = `${gels}× ${gelData.name} (${carbsG}g glucides) — eau uniquement`
      } else if (useCaffeine) {
        caffeineUsed = true
        gelProduct = `${gels}× ${gelData.name} CAF 100 (${carbsG}g glucides + caféine)`
      } else {
        gelProduct = `${gels}× ${gelData.name} (${carbsG}g glucides)`
      }
      if (gelData.needsWater) gelProduct += ' + eau'

      let barProduct = ''
      if (useBarInstead && timing !== 'at_summit' && timing !== 'on_descent') {
        barProduct = `½ ${barData.name} (${Math.round(barData.carbsG / 2)}g glucides) — ${barData.notes}`
      }

      const electrolyteProduct = `1 ${elecData.name} dans 500ml eau (${elecData.sodiumMg}mg sodium) — ${elecData.notes}`

      nutritionCheckpoints.push({
        distanceKm: Math.round(distAtCheckpoint * 10) / 10,
        elapsedMin: Math.round(nextNutrTime),
        caloriesTotal: cumulCalories,
        caloriesToConsume,
        carbsG,
        waterMl,
        sodiumMg,
        gels,
        gelProduct,
        barProduct,
        electrolyteProduct,
        timing,
        urgency,
        recommendation: notes || `${gels} gel${gels > 1 ? 's' : ''} + ${waterMl}ml eau`,
      })

      nextNutrTime += nutritionIntervalMin
    }
    cumulTimeForNutr += segTime
  }

  return {
    rawPoints: points,
    segments: merged,
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    totalElevationGain: Math.round(elevGain),
    totalElevationLoss: Math.round(elevLoss),
    maxElevationM: Math.round(maxElev),
    minElevationM: Math.round(minElev),
    avgGradientClimb: Math.round(avgGradientClimb * 10) / 10,
    paceCheckpoints,
    nutritionCheckpoints,
    keyWaypoints,
    estimatedFinishTimeMin: Math.round(finalEstimated),
  }
}
