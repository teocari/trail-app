export type RunnerLevel = 'debutant' | 'intermediaire' | 'confirme' | 'elite'
export type RaceType = 'XC' | 'Trail' | 'Ultra'

export interface AthleteProfile {
  firstName: string
  level: RunnerLevel
  yearsTrail: number
  weeklyKm: number
  weeklyElevation: number
  pace10kmMin: number   // minutes total (e.g. 42 for 42:00)
  pace10kmSec: number   // seconds part (e.g. 30 for 42:30)
  maxHR: number         // 0 = unknown
  bodyWeightKg: number
  preferredRaceType: RaceType
}

export interface AthleteZonePaces {
  z1: string   // e.g. "6:30-7:30/km"
  z2: string
  z4: string
  z5: string
  uphill8pct: string    // montée 8%
  uphill15pct: string   // montée 15%
  uphill22pct: string   // montée 22%+
  downhill: string      // descente technique
}
export type RacePriority = 'A' | 'B' | 'C'

export type TerrainType = 'technique' | 'singletrack' | 'chemin' | 'route' | 'neige'
export type WeatherCondition = 'ensoleille' | 'nuageux' | 'pluie' | 'vent' | 'froid' | 'chaud'

export interface RaceSpecs {
  startAltitudeM: number
  maxAltitudeM: number
  terrainTypes: TerrainType[]
  expectedTempC: number
  weatherCondition: WeatherCondition
  startTime: string
  hasNightSection: boolean
}

export interface GpxPoint {
  lat: number
  lon: number
  ele: number
  distFromStartKm: number
}

export interface GpxSegment {
  startDistKm: number
  endDistKm: number
  distanceKm: number
  elevationChange: number
  gradient: number
  type: 'climb' | 'descent' | 'flat'
  avgPaceForProfile: string
  expectedTimeMin: number
}

export interface RacePaceCheckpoint {
  distanceKm: number
  elapsedMin: number
  segmentPace: string
  segmentType: 'climb' | 'descent' | 'flat'
  elevationAtPoint: number
  notes: string
}

export interface RaceNutritionCheckpoint {
  distanceKm: number
  elapsedMin: number
  caloriesTotal: number
  caloriesToConsume: number
  carbsG: number
  waterMl: number
  sodiumMg: number
  gels: number
  recommendation: string
}

export interface GpxAnalysis {
  rawPoints: GpxPoint[]
  segments: GpxSegment[]
  totalDistanceKm: number
  totalElevationGain: number
  totalElevationLoss: number
  maxElevationM: number
  minElevationM: number
  avgGradientClimb: number
  paceCheckpoints: RacePaceCheckpoint[]
  nutritionCheckpoints: RaceNutritionCheckpoint[]
  estimatedFinishTimeMin: number
}

export interface Race {
  id: string
  name: string
  date: string // ISO date string
  distanceKm: number
  elevationGain: number // D+ in meters
  type: RaceType
  priority: RacePriority
  goalTimeMin?: number
  specs?: RaceSpecs
  gpxAnalysis?: GpxAnalysis
}

export type SessionType = 'EF' | 'LS' | 'T' | 'I' | 'V' | 'R' | 'S'
export type SessionStatus = 'planned' | 'done' | 'missed' | 'partial'
export type IntensityZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5'

export interface TrainingSession {
  id: string
  type: SessionType
  date: string // ISO date string
  durationMin: number
  zone: IntensityZone
  elevationGain: number // D+
  distanceKm: number
  description: string
  status: SessionStatus
  weekNumber: number // week index in the plan
}

export type TrainingPhase = 'Base' | 'Build' | 'Specific' | 'Peak' | 'Taper' | 'Race' | 'Recovery'

export interface TrainingWeek {
  weekNumber: number
  startDate: string
  endDate: string
  phase: TrainingPhase
  sessions: TrainingSession[]
  targetVolumeKm: number
  targetElevation: number
  adaptation: number // multiplier e.g. 1.0 = normal, 0.9 = reduced
  notes: string
}

export type DayLoad = 'REST' | 'EASY' | 'MODERATE' | 'HARD' | 'RACE'

export interface Meal {
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  brands: string[]
  performanceRationale: string
}

export interface NutritionDay {
  date: string
  load: DayLoad
  totalCalories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  hydrationLiters: number
  breakfast: Meal
  lunch: Meal
  dinner: Meal
  preWorkoutSnack: string
  postWorkoutSnack: string
}

export interface WeekStats {
  weekNumber: number
  startDate: string
  plannedSessions: number
  doneSessions: number
  missedSessions: number
  partialSessions: number
  totalKm: number
  totalElevation: number
  fitnessScore: number // 0-100
  fatigueScore: number // 0-100
}
