'use client'

import { AthleteProfile, GpxPoint, GpxSegment, GpxAnalysis, RacePaceCheckpoint, RaceNutritionCheckpoint, RaceSpecs } from './types'
import { computeAthleteZonePaces } from './training'

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

export function parseGpx(gpxString: string): GpxPoint[] {
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

  // Thin to max 500 points
  if (raw.length <= 500) return raw
  const step = raw.length / 500
  const thinned: GpxPoint[] = []
  for (let i = 0; i < 500; i++) {
    thinned.push(raw[Math.round(i * step)])
  }
  // Always include last point
  thinned[499] = raw[raw.length - 1]
  return thinned
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function parsePaceToSec(paceStr: string): number {
  // e.g. "5:30-6:10/km" → take lower value
  const match = paceStr.match(/(\d+):(\d+)/)
  if (!match) return 360
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

export function analyzeGpx(
  points: GpxPoint[],
  profile: AthleteProfile,
  specs: RaceSpecs,
  goalTimeMin?: number
): GpxAnalysis {
  if (points.length < 2) {
    return {
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
      estimatedFinishTimeMin: 0,
    }
  }

  const zonePaces = computeAthleteZonePaces(profile)

  // Compute elevation stats
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

  // Build raw segments between consecutive points
  interface RawSeg {
    startDistKm: number
    endDistKm: number
    distKm: number
    elevChange: number
    gradient: number
    type: 'climb' | 'descent' | 'flat'
  }

  const rawSegs: RawSeg[] = []
  for (let i = 1; i < points.length; i++) {
    const distKm = points[i].distFromStartKm - points[i - 1].distFromStartKm
    if (distKm < 0.001) continue
    const elevChange = points[i].ele - points[i - 1].ele
    const gradientPct = (elevChange / (distKm * 1000)) * 100
    const type: 'climb' | 'descent' | 'flat' =
      gradientPct > 3 ? 'climb' : gradientPct < -3 ? 'descent' : 'flat'
    rawSegs.push({
      startDistKm: points[i - 1].distFromStartKm,
      endDistKm: points[i].distFromStartKm,
      distKm,
      elevChange,
      gradient: gradientPct,
      type,
    })
  }

  // Merge consecutive same-type segments; merge if adjacent same type or if < 0.5km
  const merged: GpxSegment[] = []
  for (const rs of rawSegs) {
    const last = merged[merged.length - 1]
    if (last && last.type === rs.type) {
      last.endDistKm = rs.endDistKm
      last.distanceKm += rs.distKm
      last.elevationChange += rs.elevChange
      last.gradient = (last.elevationChange / (last.distanceKm * 1000)) * 100
    } else if (last && rs.distKm < 0.5 && last.type !== rs.type) {
      // short segment – absorb into previous
      last.endDistKm = rs.endDistKm
      last.distanceKm += rs.distKm
      last.elevationChange += rs.elevChange
      last.gradient = (last.elevationChange / (last.distanceKm * 1000)) * 100
      // re-classify
      last.type = last.gradient > 3 ? 'climb' : last.gradient < -3 ? 'descent' : 'flat'
    } else {
      merged.push({
        startDistKm: rs.startDistKm,
        endDistKm: rs.endDistKm,
        distanceKm: rs.distKm,
        elevationChange: rs.elevChange,
        gradient: rs.gradient,
        type: rs.type,
        avgPaceForProfile: '',
        expectedTimeMin: 0,
      })
    }
  }

  // Compute pace and time per segment with modifiers
  const isTechnique = specs.terrainTypes.includes('technique') || specs.terrainTypes.includes('neige')
  const isHot = specs.expectedTempC > 28
  const isCold = specs.expectedTempC < 0

  // Parse start time for night detection
  let startHour = 6
  if (specs.startTime) {
    const parts = specs.startTime.split(':')
    startHour = parseInt(parts[0] ?? '6')
  }

  let cumulativeTimeMin = 0

  for (const seg of merged) {
    const g = seg.gradient
    let basePaceStr: string
    if (seg.type === 'climb') {
      if (g > 18) basePaceStr = zonePaces.uphill22pct
      else if (g > 8) basePaceStr = zonePaces.uphill15pct
      else basePaceStr = zonePaces.uphill8pct
    } else if (seg.type === 'descent') {
      basePaceStr = zonePaces.downhill
    } else {
      basePaceStr = zonePaces.z2
    }

    let secPerKm = parsePaceToSec(basePaceStr)

    // Altitude modifier: -3% speed (= +3% time) per 500m above 2000m
    if (specs.maxAltitudeM > 2000) {
      const above = Math.max(0, specs.maxAltitudeM - 2000)
      const altFactor = 1 + (above / 500) * 0.03
      secPerKm *= altFactor
    }

    // Temperature modifiers
    if (isHot) secPerKm *= 1.08
    if (isCold) secPerKm *= 1.05

    // Terrain modifiers
    if (isTechnique) secPerKm *= 1.12

    // Night section: if night section enabled and elapsed > 18:00
    if (specs.hasNightSection) {
      const elapsedHour = startHour + cumulativeTimeMin / 60
      if (elapsedHour >= 18 || elapsedHour < 6) secPerKm *= 1.08
    }

    const expectedTimeMin = (seg.distanceKm * secPerKm) / 60
    seg.avgPaceForProfile = formatPace(secPerKm)
    seg.expectedTimeMin = expectedTimeMin
    cumulativeTimeMin += expectedTimeMin
  }

  const estimatedFinishTimeMin = merged.reduce((s, seg) => s + seg.expectedTimeMin, 0)

  // If goal time provided, scale all paces
  if (goalTimeMin && goalTimeMin > 0 && estimatedFinishTimeMin > 0) {
    const scale = goalTimeMin / estimatedFinishTimeMin
    for (const seg of merged) {
      const secPerKm = parsePaceToSec(seg.avgPaceForProfile) / scale
      seg.avgPaceForProfile = formatPace(secPerKm)
      seg.expectedTimeMin = seg.expectedTimeMin * scale
    }
  }

  const finalEstimated = goalTimeMin && goalTimeMin > 0
    ? goalTimeMin
    : merged.reduce((s, seg) => s + seg.expectedTimeMin, 0)

  // Compute avg gradient for climbs
  const climbSegs = merged.filter(s => s.type === 'climb')
  const avgGradientClimb = climbSegs.length > 0
    ? climbSegs.reduce((s, seg) => s + seg.gradient, 0) / climbSegs.length
    : 0

  // Generate pace checkpoints every 5km (or at major segment boundaries)
  const paceCheckpoints: RacePaceCheckpoint[] = []
  let cumulTime = 0
  const checkpointInterval = 5

  for (const seg of merged) {
    const segStart = seg.startDistKm
    const segEnd = seg.endDistKm
    const segTime = seg.expectedTimeMin

    // Find all 5km marks that fall in this segment
    const firstMark = Math.ceil(segStart / checkpointInterval) * checkpointInterval
    if (firstMark <= segEnd && firstMark >= segStart) {
      const fracInSeg = (firstMark - segStart) / seg.distanceKm
      const timeAtMark = cumulTime + fracInSeg * segTime
      const eleAtMark = getElevationAtDist(points, firstMark)

      let notes = ''
      if (eleAtMark > 2500) notes = `Col à ${Math.round(eleAtMark)}m — réduire l'allure, contrôle de la respiration`
      else if (seg.type === 'climb' && seg.gradient > 15) notes = 'Montée raide, marche active recommandée'
      else if (seg.type === 'descent' && seg.gradient < -15) notes = 'Descente technique, économiser les quadriceps'

      paceCheckpoints.push({
        distanceKm: firstMark,
        elapsedMin: timeAtMark,
        segmentPace: seg.avgPaceForProfile,
        segmentType: seg.type,
        elevationAtPoint: eleAtMark,
        notes,
      })
    }
    cumulTime += segTime
  }

  // If no checkpoints generated, add one at start and end
  if (paceCheckpoints.length === 0 && merged.length > 0) {
    paceCheckpoints.push({
      distanceKm: 0,
      elapsedMin: 0,
      segmentPace: merged[0].avgPaceForProfile,
      segmentType: merged[0].type,
      elevationAtPoint: points[0]?.ele ?? 0,
      notes: 'Départ',
    })
    paceCheckpoints.push({
      distanceKm: totalDist,
      elapsedMin: finalEstimated,
      segmentPace: merged[merged.length - 1].avgPaceForProfile,
      segmentType: merged[merged.length - 1].type,
      elevationAtPoint: points[points.length - 1]?.ele ?? 0,
      notes: 'Arrivée',
    })
  }

  // Nutrition checkpoints: every ~8-12km or ~45-60min elapsed
  const nutritionCheckpoints: RaceNutritionCheckpoint[] = []
  const kcalPerHour =
    profile.level === 'elite' ? 650
    : profile.level === 'confirme' ? 550
    : profile.level === 'intermediaire' ? 475
    : 425

  const carbsPerHour = finalEstimated > 240 ? 80 : finalEstimated > 120 ? 70 : 60
  const waterMlPerHour = isHot ? 750 : 600
  const sodiumMgPerHour = 600
  const nutritionIntervalMin = 50

  let nextNutritionTime = nutritionIntervalMin
  let cumulTimeForNutr = 0
  let cumulCalories = 0

  for (const seg of merged) {
    const segStart = seg.startDistKm
    const segEnd = seg.endDistKm
    const segTime = seg.expectedTimeMin

    while (nextNutritionTime <= cumulTimeForNutr + segTime) {
      const fracInSeg = (nextNutritionTime - cumulTimeForNutr) / segTime
      const distAtCheckpoint = segStart + fracInSeg * (segEnd - segStart)
      const elapsedHours = nextNutritionTime / 60
      cumulCalories = Math.round(elapsedHours * kcalPerHour)

      const caloriesToConsume = Math.round(carbsPerHour * (nutritionIntervalMin / 60) * 4)
      const carbsG = Math.round(carbsPerHour * (nutritionIntervalMin / 60))
      const waterMl = Math.round(waterMlPerHour * (nutritionIntervalMin / 60))
      const sodiumMg = Math.round(sodiumMgPerHour * (nutritionIntervalMin / 60))
      const gels = Math.round(carbsG / 25)

      let recommendation = ''
      if (isHot) recommendation = 'Bien s\'hydrater, ajouter électrolytes. '
      if (specs.maxAltitudeM > 2500) recommendation += 'Altitude élevée, manger même sans faim. '
      if (gels >= 2) recommendation += `${gels} gels + eau`
      else recommendation += '1 barre énergétique + eau'

      nutritionCheckpoints.push({
        distanceKm: Math.round(distAtCheckpoint * 10) / 10,
        elapsedMin: nextNutritionTime,
        caloriesTotal: cumulCalories,
        caloriesToConsume,
        carbsG,
        waterMl,
        sodiumMg,
        gels,
        recommendation: recommendation.trim(),
      })

      nextNutritionTime += nutritionIntervalMin
    }
    cumulTimeForNutr += segTime
  }

  return {
    rawPoints: points,
    segments: merged,
    totalDistanceKm: totalDist,
    totalElevationGain: Math.round(elevGain),
    totalElevationLoss: Math.round(elevLoss),
    maxElevationM: Math.round(maxElev),
    minElevationM: Math.round(minElev),
    avgGradientClimb: Math.round(avgGradientClimb * 10) / 10,
    paceCheckpoints,
    nutritionCheckpoints,
    estimatedFinishTimeMin: Math.round(finalEstimated),
  }
}

function getElevationAtDist(points: GpxPoint[], distKm: number): number {
  for (let i = 1; i < points.length; i++) {
    if (points[i].distFromStartKm >= distKm) {
      const frac = (distKm - points[i - 1].distFromStartKm) /
        (points[i].distFromStartKm - points[i - 1].distFromStartKm)
      return points[i - 1].ele + frac * (points[i].ele - points[i - 1].ele)
    }
  }
  return points[points.length - 1]?.ele ?? 0
}
