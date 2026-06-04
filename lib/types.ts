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

// Gradient classification — more granular than old 3-state
export type GradientClass =
  | 'very_steep_up'    // > 20%
  | 'steep_up'         // 10-20%
  | 'moderate_up'      // 5-10%
  | 'false_flat_up'    // 2-5%
  | 'flat'             // -2% to 2%
  | 'false_flat_down'  // -2% to -5%
  | 'moderate_down'    // -5% to -10%
  | 'steep_down'       // -10% to -20%
  | 'very_steep_down'  // < -20%

export interface GpxSegment {
  startDistKm: number
  endDistKm: number
  distanceKm: number
  elevationChange: number
  gradient: number
  gradientClass: GradientClass
  // legacy field kept for backward compat (derived from gradientClass)
  type: 'climb' | 'descent' | 'flat'
  avgPaceForProfile: string
  expectedTimeMin: number
}

export interface RacePaceCheckpoint {
  distanceKm: number
  elapsedMin: number
  segmentPace: string
  segmentType: 'climb' | 'descent' | 'flat'
  gradient: number
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
  gelProduct: string
  barProduct: string
  electrolyteProduct: string
  timing: 'before_climb' | 'at_summit' | 'on_descent' | 'checkpoint' | 'regular'
  urgency: 'critical' | 'important' | 'routine'
  recommendation: string
}

export interface RaceKeyWaypoint {
  distanceKm: number
  elevationM: number
  name: string
  type: 'summit' | 'valley' | 'checkpoint' | 'start' | 'finish'
  expectedTimeMin: number
  gradientBefore: number
  notes: string
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
  keyWaypoints: RaceKeyWaypoint[]
  estimatedFinishTimeMin: number
}

// Nutrition preferences
export type GelBrand = 'maurten' | 'sis' | 'gu' | 'generic'
export type BarBrand = 'maurten_bar' | 'clif' | 'real_food' | 'mix'
export type ElectrolyteBrand = 'precision_hydration' | 'sis_hydro' | 'maurten_caf' | 'tabs'
export type StomachSensitivity = 'sensitive' | 'normal' | 'iron'

export interface NutritionPreferences {
  gelBrand: GelBrand
  barBrand: BarBrand
  electrolyteBrand: ElectrolyteBrand
  stomachSensitivity: StomachSensitivity
  solidFoodTolerance: 'none' | 'some' | 'lots'
  caffeineOk: boolean
}

export interface GelProduct {
  brand: GelBrand
  name: string
  carbsG: number
  sodiumMg: number
  caffeineOk: boolean
  needsWater: boolean
  notes: string
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
  nutritionPrefs?: NutritionPreferences
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
