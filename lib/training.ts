import { Race, TrainingWeek, TrainingSession, TrainingPhase, SessionType, IntensityZone, AthleteProfile, AthleteZonePaces, RunnerLevel } from './types'

export function computeAthleteZonePaces(profile: AthleteProfile): AthleteZonePaces {
  const total10km = profile.pace10kmMin * 60 + profile.pace10kmSec // seconds per 10km
  const secPerKm = total10km / 10 // seconds per km at 10km race pace

  // Zone paces as multiples of 10km race pace (well-established physiology ratios)
  const z5 = secPerKm * 1.00        // Z5 ≈ 10km pace
  const z4 = secPerKm * 1.08        // Z4 ≈ tempo (~lactate threshold)
  const z2 = secPerKm * 1.30        // Z2 ≈ aerobic easy
  const z1 = secPerKm * 1.50        // Z1 ≈ recovery

  const fmt = (lo: number, hi: number) => {
    const f = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
    return `${f(lo)}-${f(hi)}/km`
  }

  // Trail uphill factors: reduce pace (more seconds per km) based on gradient
  const uphill8 = z2 * 1.40   // moderate slope
  const uphill15 = z2 * 1.90  // steep slope (mostly power-hike)
  const uphill22 = z2 * 2.60  // very steep (full hike)
  const downhill = z2 * 0.75  // technical descent is faster than flat but braked

  return {
    z1: fmt(z1, z1 * 1.15),
    z2: fmt(z2, z2 * 1.12),
    z4: fmt(z4, z4 * 1.06),
    z5: fmt(z5, z5 * 1.04),
    uphill8pct: fmt(uphill8, uphill8 * 1.15),
    uphill15pct: fmt(uphill15, uphill15 * 1.15),
    uphill22pct: fmt(uphill22, uphill22 * 1.15),
    downhill: fmt(downhill, downhill * 1.20),
  }
}

const DEFAULT_PACES: AthleteZonePaces = {
  z1: '7:00-8:00/km',
  z2: '5:30-6:10/km',
  z4: '4:10-4:25/km',
  z5: '3:45-3:55/km',
  uphill8pct: '7:30-8:30/km',
  uphill15pct: '10:30-12:00/km',
  uphill22pct: '14:00-16:00/km',
  downhill: '4:00-5:00/km',
}

import { addDays, differenceInWeeks, format, startOfWeek, parseISO } from 'date-fns'

const SESSION_LABELS: Record<SessionType, string> = {
  EF: 'Endurance Fondamentale',
  LS: 'Sortie Longue',
  T: 'Tempo',
  I: 'Intervalles',
  V: 'Dénivelé Vertical',
  R: 'Récupération',
  S: 'Renforcement Musculaire',
}

export function getSessionLabel(type: SessionType): string {
  return SESSION_LABELS[type]
}

export function getPhaseLabel(phase: TrainingPhase): string {
  const labels: Record<TrainingPhase, string> = {
    Base: 'Base',
    Build: 'Développement',
    Specific: 'Spécifique',
    Peak: 'Affûtage',
    Taper: 'Réduction',
    Race: 'Course',
    Recovery: 'Récupération',
  }
  return labels[phase]
}

export function getZoneLabel(zone: IntensityZone): string {
  const labels: Record<IntensityZone, string> = {
    Z1: 'Z1 - Très Facile (RPE 1-3)',
    Z2: 'Z2 - Facile (RPE 3-4)',
    Z3: 'Z3 - Modéré (RPE 5-6)',
    Z4: 'Z4 - Difficile (RPE 7-8)',
    Z5: 'Z5 - Maximum (RPE 9-10)',
  }
  return labels[zone]
}

export function getZoneColor(zone: IntensityZone): string {
  const colors: Record<IntensityZone, string> = {
    Z1: 'text-easy',
    Z2: 'text-easy',
    Z3: 'text-yellow-400',
    Z4: 'text-hard',
    Z5: 'text-race',
  }
  return colors[zone]
}

export function getSessionColor(type: SessionType): string {
  const colors: Record<SessionType, string> = {
    EF: '#22c55e',
    LS: '#16a34a',
    T: '#f97316',
    I: '#ef4444',
    V: '#a855f7',
    R: '#3b82f6',
    S: '#6b7280',
  }
  return colors[type]
}

export function getPhaseColor(phase: TrainingPhase): string {
  const colors: Record<TrainingPhase, string> = {
    Base: '#3b82f6',
    Build: '#22c55e',
    Specific: '#f97316',
    Peak: '#ef4444',
    Taper: '#a855f7',
    Race: '#ef4444',
    Recovery: '#6b7280',
  }
  return colors[phase]
}

// ─── Feature 2A: TID Model ──────────────────────────────────────────────────

export function getTIDModel(level: RunnerLevel): 'polarized' | 'pyramidal' {
  if (level === 'elite' || level === 'confirme') return 'polarized'
  return 'pyramidal'
}

function isHighLevel(level?: RunnerLevel): boolean {
  return level === 'elite' || level === 'confirme'
}

// ─── Session generation helpers ─────────────────────────────────────────────

function generateSessionId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function computePhase(weeksToRace: number, totalWeeks: number): TrainingPhase {
  if (weeksToRace <= 0) return 'Race'
  if (weeksToRace === 1) return 'Taper'
  if (weeksToRace === 2) return 'Taper'

  const pct = (totalWeeks - weeksToRace) / totalWeeks

  if (pct < 0.30) return 'Base'
  if (pct < 0.55) return 'Build'
  if (pct < 0.75) return 'Specific'
  return 'Peak'
}

function baseVolumeForPhase(phase: TrainingPhase): number {
  const volumes: Record<TrainingPhase, number> = {
    Base: 80,
    Build: 95,
    Specific: 105,
    Peak: 110,
    Taper: 60,
    Race: 30,
    Recovery: 40,
  }
  return volumes[phase]
}

function baseElevationForPhase(phase: TrainingPhase): number {
  const elevations: Record<TrainingPhase, number> = {
    Base: 3500,
    Build: 4500,
    Specific: 5500,
    Peak: 6000,
    Taper: 2500,
    Race: 1000,
    Recovery: 1500,
  }
  return elevations[phase]
}

interface SessionTemplate {
  type: SessionType
  zone: IntensityZone
  durationMin: number
  distanceKm: number
  elevationGain: number
  description: string
}

// ─── Feature 2C: Heavy Strength descriptions by phase ───────────────────────

function getStrengthSession(phase: TrainingPhase): SessionTemplate {
  if (phase === 'Base') {
    return {
      type: 'S', zone: 'Z1', durationMin: 60, distanceKm: 0, elevationGain: 0,
      description: 'Musculation lourde — Hypertrophie (75-80% 1RM) : Squat barre 4×8 @75%, Soulevé de terre 4×8 @75%, Hip thrust 4×10 @70%, Mollets unilatéraux 4×12. Récupération 2-3min entre séries. Focus sur la qualité d\'exécution et la profondeur.',
    }
  }
  if (phase === 'Build') {
    return {
      type: 'S', zone: 'Z1', durationMin: 65, distanceKm: 0, elevationGain: 0,
      description: 'Musculation lourde — Force (85% 1RM) : Back squat 5×5 @85%, Romanian deadlift 5×5 @85%, Fente bulgare 5×5 @80% (chaque jambe). Récupération 3-4min. Activation neuromusculaire maximale — prendre le temps entre séries.',
    }
  }
  // Specific / Peak
  return {
    type: 'S', zone: 'Z1', durationMin: 55, distanceKm: 0, elevationGain: 0,
    description: 'Puissance neuromusculaire (90% 1RM + pliométrie) : Back squat 6×3 @90%, Deadlift 6×3 @90%. Puis pliométrie : 4×10 box jumps, 4×8 fentes sautées, 6×10s sprints côte 15%. Récupération complète 4-5min entre séries lourdes.',
  }
}

function orderSessionsForWeek(sessions: SessionTemplate[]): SessionTemplate[] {
  const ls = sessions.filter(s => s.type === 'LS')
  const hard = sessions.filter(s => s.zone === 'Z4' || s.zone === 'Z5')
  const strength = sessions.filter(s => s.type === 'S')
  const recovery = sessions.filter(s => s.type === 'R' || s.zone === 'Z1')
  const easy = sessions.filter(s =>
    s.type === 'EF' && s.zone !== 'Z4' && s.zone !== 'Z5'
  )

  const ordered: (SessionTemplate | null)[] = [null, null, null, null, null, null, null]

  // Sat = LS
  if (ls[0]) ordered[5] = ls[0]
  // Sun = R
  if (recovery[0]) ordered[6] = recovery[0]
  // Tue = 1st hard
  if (hard[0]) ordered[1] = hard[0]
  // Thu = 2nd hard or EF
  if (hard[1]) ordered[3] = hard[1]
  else if (easy[1]) ordered[3] = easy[1]
  // Wed = S or EF (buffer)
  if (strength[0]) ordered[2] = strength[0]
  else if (easy[0]) ordered[2] = easy[0]
  // Mon = EF
  const remainingEasy = easy.filter(s => !ordered.includes(s))
  if (remainingEasy[0]) ordered[0] = remainingEasy[0]
  // Fri = EF or remaining
  const remaining = [...hard, ...easy, ...strength, ...recovery, ...ls]
    .filter(s => !ordered.includes(s))
  if (remaining[0]) ordered[4] = remaining[0]

  // Fill any remaining nulls
  const allRemaining = sessions.filter(s => !ordered.includes(s))
  let ri = 0
  for (let i = 0; i < 7; i++) {
    if (!ordered[i] && ri < allRemaining.length) {
      ordered[i] = allRemaining[ri++]
    }
  }

  return ordered.filter((s): s is SessionTemplate => s !== null)
}

function trimToTrainingDays(sessions: SessionTemplate[], days: number): SessionTemplate[] {
  if (days >= sessions.length) return sessions

  const ls = sessions.find(s => s.type === 'LS')
  const hard = sessions.filter(s => s.zone === 'Z4' || s.zone === 'Z5')
  const ef = sessions.filter(s => s.type === 'EF' && s.zone !== 'Z4')
  const r = sessions.filter(s => s.type === 'R')
  const str = sessions.filter(s => s.type === 'S')

  const result: SessionTemplate[] = []
  const addIfRoom = (sess: SessionTemplate | undefined) => {
    if (sess && result.length < days && !result.includes(sess)) result.push(sess)
  }

  addIfRoom(ls)
  addIfRoom(hard[0])
  ef.forEach(e => addIfRoom(e))
  r.forEach(rv => addIfRoom(rv))
  str.forEach(sv => addIfRoom(sv))
  hard.slice(1).forEach(h => addIfRoom(h))

  // Fill any remaining with whatever's left
  sessions.forEach(sess => addIfRoom(sess))

  return result.slice(0, days)
}

function getWeekSessions(
  phase: TrainingPhase,
  weekVolumeKm: number,
  weekElevation: number,
  raceType: string,
  p: AthleteZonePaces = DEFAULT_PACES,
  level?: RunnerLevel,
  targetRace?: Race,
  weeksToTargetRace?: number,
  raceMonth?: number,
  isDeloadWeek = false,
  trainingDays = 6,
): SessionTemplate[] {
  const efDuration = Math.round((weekVolumeKm * 0.15) / 12 * 60)
  const lsDuration = Math.round((weekVolumeKm * 0.30) / 11 * 60)
  const tDuration = 60
  const iDuration = 75
  const vDuration = 90

  // Feature 2B: Norwegian Double Threshold (elite/confirme in Build/Specific)
  const useNorwegianDT = isHighLevel(level) && (phase === 'Build' || phase === 'Specific')
  const norwegianSession: SessionTemplate = {
    type: 'T',
    zone: 'Z3',
    durationMin: 90,
    distanceKm: Math.round(weekVolumeKm * 0.13),
    elevationGain: Math.round(weekElevation * 0.08),
    description: `Séance double seuil méthode norvégienne : 8×8min au seuil lactique 1 (allure ${p.z4} - 10%), récupération 1min trot. Répéter idéalement le soir avec 6×6min même allure. Développe la capacité lactique sans dette en O2.`,
  }

  // Feature 2E: Heat acclimatization note (June-September)
  const heatNote = (raceMonth !== undefined && raceMonth >= 5 && raceMonth <= 8)
    ? ' ⚠️ Acclimatation chaleur : réaliser 5 séances cette semaine entre 12h-15h ou avec couches supplémentaires.'
    : ''

  if (phase === 'Taper') {
    const sessions: SessionTemplate[] = [
      { type: 'EF', zone: 'Z2', durationMin: 45, distanceKm: 9, elevationGain: 200, description: `Allure EF : ${p.z2} plat, ${p.uphill8pct} en montée. Pente max 8%. Respiration nasale, jambes légères — aucune accumulation de fatigue.` },
      { type: 'I', zone: 'Z5', durationMin: 50, distanceKm: 10, elevationGain: 100, description: `Échauffement 15min Z1. Puis 6×3min Z5 à ${p.z5} sur plat ou légère côte (4-6%). Récupération 2min Z1 entre chaque. Retour calme 10min. Objectif : maintenir la vivacité neuromusculaire sans fatiguer.` },
      { type: 'R', zone: 'Z1', durationMin: 30, distanceKm: 6, elevationGain: 0, description: `Allure récupération : ${p.z1}. Terrain plat uniquement. FC <60% FCmax. Étirements dynamiques 10min post-course.` },
      { type: 'EF', zone: 'Z2', durationMin: 40, distanceKm: 8, elevationGain: 150, description: `Allure EF douce : ${p.z2} sur plat, marche rapide sur pentes >10%. Sortie mentale : visualiser la course, ne pas forcer.` },
      { type: 'S', zone: 'Z1', durationMin: 30, distanceKm: 0, elevationGain: 0, description: 'Activation neuromusculaire légère : 3×10 squats, 3×10 fentes, 2×30s gainage. Plyométrie douce : skipping léger, montées de genoux. Aucune charge lourde.' },
    ]
    const ordered = orderSessionsForWeek(sessions)
    if (isDeloadWeek) {
      return trimToTrainingDays(ordered.map(s => {
        if (s.zone === 'Z4' || s.zone === 'Z5') {
          return { ...s, type: 'EF' as SessionType, zone: 'Z2' as IntensityZone, durationMin: Math.round(s.durationMin * 0.70), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.70)), description: `🔄 SEMAINE DE DÉCHARGE — ${s.description.split(':')[0]} remplacée par EF. Allure ${p.z2} strictement. Volume réduit 30%. Priorité à la récupération.` }
        }
        return { ...s, durationMin: Math.round(s.durationMin * 0.85), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.85)) }
      }), trainingDays)
    }
    return trimToTrainingDays(ordered, trainingDays)
  }

  if (phase === 'Recovery') {
    const sessions: SessionTemplate[] = [
      { type: 'R', zone: 'Z1', durationMin: 30, distanceKm: 5, elevationGain: 100, description: `Allure : ${p.z1} maximum. Pente <5% uniquement. FC <55% FCmax. Objectif : circulation sanguine et élimination des déchets métaboliques, pas de performance.` },
      { type: 'EF', zone: 'Z1', durationMin: 45, distanceKm: 8, elevationGain: 200, description: `Allure : ${p.z1} plat, marche sur pentes >8%. Pente maximale tolérée : 12%. Focus sur la technique de foulée : attaque médio-pied, cadence ~170 pas/min.` },
      { type: 'S', zone: 'Z1', durationMin: 45, distanceKm: 0, elevationGain: 0, description: 'Renforcement musculaire : 3×15 squats, 3×12 fentes marche, 3×10 step-up, 3×45s gainage frontal/latéral. Proprioception : 3×30s équilibre unipodal sur coussin.' },
      { type: 'R', zone: 'Z1', durationMin: 30, distanceKm: 5, elevationGain: 50, description: 'Footing très doux, terrain souple préféré (chemin en terre). Allure libre, aucune contrainte de rythme. Terminer par 10min d\'étirements passifs mollets + quadriceps.' },
    ]
    const ordered = orderSessionsForWeek(sessions)
    if (isDeloadWeek) {
      return trimToTrainingDays(ordered.map(s => {
        if (s.zone === 'Z4' || s.zone === 'Z5') {
          return { ...s, type: 'EF' as SessionType, zone: 'Z2' as IntensityZone, durationMin: Math.round(s.durationMin * 0.70), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.70)), description: `🔄 SEMAINE DE DÉCHARGE — ${s.description.split(':')[0]} remplacée par EF. Allure ${p.z2} strictement. Volume réduit 30%. Priorité à la récupération.` }
        }
        return { ...s, durationMin: Math.round(s.durationMin * 0.85), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.85)) }
      }), trainingDays)
    }
    return trimToTrainingDays(ordered, trainingDays)
  }

  if (phase === 'Base') {
    const strengthSession = getStrengthSession('Base')
    const sessions: SessionTemplate[] = [
      { type: 'EF', zone: 'Z2', durationMin: efDuration || 60, distanceKm: Math.round(weekVolumeKm * 0.15), elevationGain: Math.round(weekElevation * 0.10), description: `Allure EF : ${p.z2} sur plat, ${p.uphill8pct} en montée (pente 6-10%), marche si >15%. FC cible 65-72% FCmax. Conversation aisée en continu. Cadence cible : 170-175 pas/min. Terrain varié, priorité aux chemins.` },
      { type: 'EF', zone: 'Z2', durationMin: efDuration || 60, distanceKm: Math.round(weekVolumeKm * 0.15), elevationGain: Math.round(weekElevation * 0.10), description: `Allure identique à la 1ère EF (${p.z2} plat). Focus technique : attaque médio-pied, bras relâchés, regard 3-4m en avant. Sur les pentes >8%, raccourcir la foulée et augmenter la cadence plutôt que de ralentir.` },
      { type: 'V', zone: 'Z3', durationMin: 70, distanceKm: Math.round(weekVolumeKm * 0.12), elevationGain: Math.round(weekElevation * 0.25), description: `Échauffement 15min Z1-Z2. Bloc dénivelé : 4×10min de montée soutenue sur pente 12-20%, allure ${p.uphill15pct}, RPE 5-6. Descente technique en récupération (3-4min) à ${p.downhill}. Travail de bâtons si disponibles.` },
      { ...strengthSession, description: strengthSession.description + heatNote },
      { type: 'LS', zone: 'Z2', durationMin: lsDuration || 120, distanceKm: Math.round(weekVolumeKm * 0.30), elevationGain: Math.round(weekElevation * 0.35), description: `Allure conversationnelle stricte : ${p.z2} plat, ${p.uphill15pct} montée, marche rapide (5-6 km/h) sur pentes >18%. Ravitaillement : gel ou barre toutes les 45min + 500ml eau/heure. Dernier tiers : maintenir l'allure malgré la fatigue.` },
      { type: 'R', zone: 'Z1', durationMin: 35, distanceKm: Math.round(weekVolumeKm * 0.08), elevationGain: 100, description: `Allure très lente : ${p.z1}. FC <58% FCmax. 5min de marche d'abord si les jambes sont lourdes. Post-course : 15min d'étirements passifs (mollets, IT band, psoas, quadriceps).` },
    ]
    const ordered = orderSessionsForWeek(sessions)
    if (isDeloadWeek) {
      return trimToTrainingDays(ordered.map(s => {
        if (s.zone === 'Z4' || s.zone === 'Z5') {
          return { ...s, type: 'EF' as SessionType, zone: 'Z2' as IntensityZone, durationMin: Math.round(s.durationMin * 0.70), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.70)), description: `🔄 SEMAINE DE DÉCHARGE — ${s.description.split(':')[0]} remplacée par EF. Allure ${p.z2} strictement. Volume réduit 30%. Priorité à la récupération.` }
        }
        return { ...s, durationMin: Math.round(s.durationMin * 0.85), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.85)) }
      }), trainingDays)
    }
    return trimToTrainingDays(ordered, trainingDays)
  }

  if (phase === 'Build') {
    const strengthSession = getStrengthSession('Build')
    const efOrNorwegian: SessionTemplate = useNorwegianDT
      ? norwegianSession
      : { type: 'EF', zone: 'Z2', durationMin: efDuration || 65, distanceKm: Math.round(weekVolumeKm * 0.14), elevationGain: Math.round(weekElevation * 0.10), description: `EF structuré : 20min Z1 d'échauffement, puis 4×10min légèrement au-dessus Z2 (RPE 4-5, limite basse de ${p.z4}) avec 5min Z1 entre chaque. Retour calme 15min. Pente lors des blocs : 6-8% maximum.` }
    const sessions: SessionTemplate[] = [
      efOrNorwegian,
      { type: 'I', zone: 'Z5', durationMin: iDuration, distanceKm: Math.round(weekVolumeKm * 0.12), elevationGain: Math.round(weekElevation * 0.08), description: `Échauffement 15min Z1-Z2 + gammes. Séance : 8×3min Z5 à ${p.z5} sur plat ou côte 4-6%, récupération 2min trot Z1. Si RPE >9/10 raccourcir à 2min30. Retour calme 10min.` },
      { type: 'V', zone: 'Z4', durationMin: vDuration, distanceKm: Math.round(weekVolumeKm * 0.13), elevationGain: Math.round(weekElevation * 0.28), description: `Échauffement 15min Z1. Côtes longues : 5×8min Z4 sur pente 15-22%, allure ${p.uphill15pct} à ${p.uphill22pct}, RPE 7-8. Descente active en récupération : 4-5min à ${p.downhill}. Bâtons recommandés sur >18% de pente.` },
      { ...strengthSession, description: strengthSession.description + heatNote },
      { type: 'T', zone: 'Z4', durationMin: tDuration, distanceKm: Math.round(weekVolumeKm * 0.13), elevationGain: Math.round(weekElevation * 0.12), description: `Échauffement 15min Z1-Z2. Tempo continu 30min Z4 : allure ${p.z4} sur plat vallonné (pentes 4-8%), RPE constant 7-8. Ne pas dépasser Z4 même en montée (marche si nécessaire). Retour calme 15min.` },
      { type: 'LS', zone: 'Z2', durationMin: lsDuration || 130, distanceKm: Math.round(weekVolumeKm * 0.30), elevationGain: Math.round(weekElevation * 0.38), description: `Sortie longue structurée : 2/3 en Z2 (${p.z2} plat, ${p.uphill8pct} montée). Dernier 1/3 : allure spécifique course cible. Ravitaillement toutes les 40min. Au moins 1000m D+.` },
      { type: 'R', zone: 'Z1', durationMin: 30, distanceKm: Math.round(weekVolumeKm * 0.08), elevationGain: 80, description: `Footing récupération : ${p.z1}, terrain plat ou légèrement vallonné. FC <60% FCmax. Hydratation prioritaire. Auto-massage mollets et quadriceps post-course.` },
    ]
    const ordered = orderSessionsForWeek(sessions)
    if (isDeloadWeek) {
      return trimToTrainingDays(ordered.map(s => {
        if (s.zone === 'Z4' || s.zone === 'Z5') {
          return { ...s, type: 'EF' as SessionType, zone: 'Z2' as IntensityZone, durationMin: Math.round(s.durationMin * 0.70), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.70)), description: `🔄 SEMAINE DE DÉCHARGE — ${s.description.split(':')[0]} remplacée par EF. Allure ${p.z2} strictement. Volume réduit 30%. Priorité à la récupération.` }
        }
        return { ...s, durationMin: Math.round(s.durationMin * 0.85), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.85)) }
      }), trainingDays)
    }
    return trimToTrainingDays(ordered, trainingDays)
  }

  if (phase === 'Specific') {
    const strengthSession = getStrengthSession('Specific')
    const efOrNorwegian: SessionTemplate = useNorwegianDT
      ? norwegianSession
      : { type: 'EF', zone: 'Z2', durationMin: efDuration || 70, distanceKm: Math.round(weekVolumeKm * 0.13), elevationGain: Math.round(weekElevation * 0.10), description: `EF matinal technique : allure ${p.z2}. Focus descentes techniques : appuis larges, buste légèrement en avant, regard loin, 3-4 foulées courtes. Sur pentes >20% : descente en lacets courts. Cadence descendante cible : 180-185 pas/min.` }
    const sessions: SessionTemplate[] = [
      efOrNorwegian,
      { type: 'I', zone: 'Z5', durationMin: 80, distanceKm: Math.round(weekVolumeKm * 0.12), elevationGain: Math.round(weekElevation * 0.10), description: `Échauffement 20min. Séance lactique : 10×2min Z5 à ${p.z5} plat ou côte 6-8%, récupération 1min30 Z1. Objectif : maintenir la même allure sur toutes les répétitions. Si chute >5% d'allure, stopper la séance.` },
      { type: 'V', zone: 'Z4', durationMin: 100, distanceKm: Math.round(weekVolumeKm * 0.14), elevationGain: Math.round(weekElevation * 0.30), description: `Bloc dénivelé spécifique : échauffement 15min, puis 2×20min montée continue Z4 sur pente 18-28% à ${p.uphill22pct}, récupération 10min descente technique à ${p.downhill}. Bâtons sur >20%. Travail de marche rapide (buste penché, foulées courtes, bâtons actifs).` },
      { type: 'T', zone: 'Z4', durationMin: 75, distanceKm: Math.round(weekVolumeKm * 0.13), elevationGain: Math.round(weekElevation * 0.15), description: `Tempo spécifique : 2×20min Z4 sur profil similaire à la course (alternance montée 12-15% / descente 10-15%). Allure montée : ${p.uphill15pct}, allure descente : ${p.downhill}. Récupération 10min Z1 entre les blocs. Ravitaillement pratiqué.` },
      { ...strengthSession, description: strengthSession.description + heatNote },
      { type: 'LS', zone: 'Z2', durationMin: lsDuration || 150, distanceKm: Math.round(weekVolumeKm * 0.30), elevationGain: Math.round(weekElevation * 0.40), description: `Sortie longue spécifique course : terrain et dénivelé identiques à la course cible si possible. Allure gestion : ${p.z2} plat, marche rapide sur pentes >18%. Ravitaillement réel pratiqué toutes les 45min. Au moins 2000m D+.` },
      { type: 'R', zone: 'Z1', durationMin: 30, distanceKm: Math.round(weekVolumeKm * 0.08), elevationGain: 50, description: `Récupération active : ${p.z1} maximum, terrain plat. Post-sortie : auto-massage rouleau (IT band 2min/jambe, mollets 2min/jambe), bain froid 10min à 12-15°C si disponible.` },
    ]
    const ordered = orderSessionsForWeek(sessions)
    if (isDeloadWeek) {
      return trimToTrainingDays(ordered.map(s => {
        if (s.zone === 'Z4' || s.zone === 'Z5') {
          return { ...s, type: 'EF' as SessionType, zone: 'Z2' as IntensityZone, durationMin: Math.round(s.durationMin * 0.70), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.70)), description: `🔄 SEMAINE DE DÉCHARGE — ${s.description.split(':')[0]} remplacée par EF. Allure ${p.z2} strictement. Volume réduit 30%. Priorité à la récupération.` }
        }
        return { ...s, durationMin: Math.round(s.durationMin * 0.85), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.85)) }
      }), trainingDays)
    }
    return trimToTrainingDays(ordered, trainingDays)
  }

  // Peak — Feature 2D: Kilian Jornet Protocol LS 3 weeks before race
  const isJornetWeek = targetRace && weeksToTargetRace === 3
  const lsDescription = isJornetWeek
    ? `Sortie longue Jornet Protocol : ${Math.round(targetRace.distanceKm * 0.8)}km avec ${Math.round(targetRace.elevationGain * 0.8)}m D+. Allure gestion stricte Z1-Z2, monitoring effort-pace constant. Simuler conditions de course (ravitaillement, équipement complet, départ à l'heure de course). C'est la séance la plus importante du cycle.`
    : `Dernière grande sortie : allure ${p.z2}, dénivelé conséquent. Les 2/3 en Z2, le dernier 1/3 à allure cible de course. Tester le matériel complet (chaussures, sac, nutrition). Confiance : cette sortie conclut le bloc de préparation.`
  const lsDistKm = isJornetWeek
    ? Math.round(targetRace.distanceKm * 0.8)
    : Math.round(weekVolumeKm * 0.28)
  const lsElev = isJornetWeek
    ? Math.round(targetRace.elevationGain * 0.8)
    : Math.round(weekElevation * 0.38)

  const strengthSession = getStrengthSession('Specific')
  const peakSessions: SessionTemplate[] = [
    { type: 'EF', zone: 'Z2', durationMin: efDuration || 60, distanceKm: Math.round(weekVolumeKm * 0.13), elevationGain: Math.round(weekElevation * 0.10), description: `EF d'affûtage : allure ${p.z2}. Corps léger et réactif. Écouter les sensations — si les jambes sont légères, maintenir l'allure haute de la fourchette Z2. Si lourd, rester en bas de fourchette. Cadence : 175-180 pas/min.` },
    { type: 'I', zone: 'Z5', durationMin: 65, distanceKm: Math.round(weekVolumeKm * 0.12), elevationGain: Math.round(weekElevation * 0.10), description: `Séance de pointe : échauffement 15min. 6×5min Z5 sur piste ou chemin plat à ${p.z5}, récupération 3min Z1 complet entre chaque. Qualité maximale sur chaque répétition.` },
    { type: 'V', zone: 'Z4', durationMin: 80, distanceKm: Math.round(weekVolumeKm * 0.13), elevationGain: Math.round(weekElevation * 0.28), description: `Répétitions de côtes courtes maximales : échauffement 20min. 10×1min en montée raide (pente 20-30%) à effort Z5, récupération descente lente à ${p.z1} (2min). Technique : attaque énergique, bâtons dynamiques, cadence élevée (~160 pas/min en montée).` },
    { type: 'T', zone: 'Z4', durationMin: 70, distanceKm: Math.round(weekVolumeKm * 0.12), elevationGain: Math.round(weekElevation * 0.15), description: `Tempo d'affûtage : 3×15min Z4-Z5 sur profil court (montée 10-15% / descente 8-12%), récupération 5min Z1. Allure cible : ${p.z4} plat, ${p.uphill15pct} montée. Mental : visualiser la course, tester l'équipement complet.` },
    { ...strengthSession, description: strengthSession.description + heatNote },
    { type: 'LS', zone: 'Z2', durationMin: lsDuration || 140, distanceKm: lsDistKm, elevationGain: lsElev, description: lsDescription },
    { type: 'R', zone: 'Z1', durationMin: 30, distanceKm: Math.round(weekVolumeKm * 0.08), elevationGain: 50, description: `Récupération totale : ${p.z1}, allure libre. Préparation mentale : visualisation positive de la course, checklist matériel, plan de ravitaillement course.` },
  ]
  const peakOrdered = orderSessionsForWeek(peakSessions)
  if (isDeloadWeek) {
    return trimToTrainingDays(peakOrdered.map(s => {
      if (s.zone === 'Z4' || s.zone === 'Z5') {
        return { ...s, type: 'EF' as SessionType, zone: 'Z2' as IntensityZone, durationMin: Math.round(s.durationMin * 0.70), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.70)), description: `🔄 SEMAINE DE DÉCHARGE — ${s.description.split(':')[0]} remplacée par EF. Allure ${p.z2} strictement. Volume réduit 30%. Priorité à la récupération.` }
      }
      return { ...s, durationMin: Math.round(s.durationMin * 0.85), distanceKm: Math.max(1, Math.round(s.distanceKm * 0.85)) }
    }), trainingDays)
  }
  return trimToTrainingDays(peakOrdered, trainingDays)
}

// ─── Feature 3: Multi-Race Periodization ─────────────────────────────────────

export interface WeekRaceBlock {
  targetRace: Race
  weeksToTargetRace: number
  phase: TrainingPhase
  blockLabel: string
  isPostRaceRecovery: boolean
  postRaceRef?: Race
  volumeMultiplier: number
}

function computeMultiRacePhase(
  weekStart: Date,
  allRaces: Race[],
  today: Date,
): WeekRaceBlock {
  const sorted = [...allRaces].sort((a, b) => a.date.localeCompare(b.date))

  // Check if we're in post-race recovery for any recent race
  for (const race of sorted) {
    const raceDate = parseISO(race.date)
    const daysAfterRace = Math.floor((weekStart.getTime() - raceDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysAfterRace >= 0) {
      const recoveryWeeks = race.priority === 'A' ? 2 : race.priority === 'B' ? 1 : 1
      if (daysAfterRace < recoveryWeeks * 7) {
        const nextRace = sorted.find(r => parseISO(r.date) > raceDate)
        return {
          targetRace: nextRace ?? race,
          weeksToTargetRace: nextRace ? differenceInWeeks(parseISO(nextRace.date), weekStart) : 0,
          phase: 'Recovery',
          blockLabel: `Récupération post-${race.name}`,
          isPostRaceRecovery: true,
          postRaceRef: race,
          volumeMultiplier: 1.0,
        }
      }
    }
  }

  // Find next upcoming race
  const nextRace = sorted.find(r => parseISO(r.date) >= weekStart)
  if (!nextRace) {
    const lastRace = sorted[sorted.length - 1]
    return {
      targetRace: lastRace,
      weeksToTargetRace: 0,
      phase: 'Recovery',
      blockLabel: `Récupération post-${lastRace?.name ?? 'course'}`,
      isPostRaceRecovery: true,
      postRaceRef: lastRace,
      volumeMultiplier: 1.0,
    }
  }

  const weeksToRace = differenceInWeeks(parseISO(nextRace.date), weekStart)

  // Determine if this is a race week
  if (weeksToRace <= 0) {
    return {
      targetRace: nextRace,
      weeksToTargetRace: 0,
      phase: 'Race',
      blockLabel: `Course — ${nextRace.name}`,
      isPostRaceRecovery: false,
      volumeMultiplier: nextRace.priority === 'A' ? 1.0 : nextRace.priority === 'B' ? 0.85 : 0.70,
    }
  }

  // Taper weeks by priority
  const taperWeeks = nextRace.priority === 'A' ? 3 : nextRace.priority === 'B' ? 2 : 1
  if (weeksToRace <= taperWeeks) {
    return {
      targetRace: nextRace,
      weeksToTargetRace: weeksToRace,
      phase: 'Taper',
      blockLabel: `Réduction — ${nextRace.name} (${nextRace.priority})`,
      isPostRaceRecovery: false,
      volumeMultiplier: nextRace.priority === 'A' ? 1.0 : nextRace.priority === 'B' ? 0.85 : 0.70,
    }
  }

  // Normal periodization — find the A race to compute total block weeks
  const aRace = sorted.find(r => r.priority === 'A' && parseISO(r.date) >= weekStart) ?? nextRace
  const previousRace = sorted.slice().reverse().find(r => parseISO(r.date) < weekStart)
  const blockStart = previousRace ? parseISO(previousRace.date) : today
  const totalBlockWeeks = Math.max(4, differenceInWeeks(parseISO(aRace.date), blockStart))
  const weeksIntoPlan = differenceInWeeks(weekStart, blockStart)
  const phase = computePhase(weeksToRace, totalBlockWeeks)

  const volMultiplier = nextRace.priority === 'A' ? 1.0 : nextRace.priority === 'B' ? 0.85 : 0.70

  return {
    targetRace: nextRace,
    weeksToTargetRace: weeksToRace,
    phase,
    blockLabel: `Préparation — ${nextRace.name} (Priorité ${nextRace.priority})`,
    isPostRaceRecovery: false,
    volumeMultiplier: volMultiplier,
  }
}

// Extended TrainingWeek with race block info — we attach it via notes for display
export interface TrainingWeekExtended extends TrainingWeek {
  blockLabel?: string
  targetRaceName?: string
  targetRacePriority?: string
  isPostRaceRecovery?: boolean
  postRaceRefName?: string
}

export function generateTrainingPlan(races: Race[], today: Date = new Date(), profile?: AthleteProfile): TrainingWeekExtended[] {
  if (races.length === 0) return []

  const paces = profile ? computeAthleteZonePaces(profile) : DEFAULT_PACES
  const level = profile?.level

  const allRaces = [...races].sort((a, b) => a.date.localeCompare(b.date))
  const aRaces = allRaces.filter(r => r.priority === 'A')
  if (aRaces.length === 0) return []

  const primaryRace = aRaces[0]
  const raceDate = parseISO(primaryRace.date)
  const planStart = startOfWeek(today, { weekStartsOn: 1 })
  const totalWeeks = Math.max(4, differenceInWeeks(raceDate, planStart))

  // Detect race month for heat acclimatization
  const raceMonth = raceDate.getMonth() // 0-indexed

  const weeks: TrainingWeekExtended[] = []

  for (let w = 0; w < totalWeeks + 1; w++) {
    const weekStart = addDays(planStart, w * 7)
    const weekEnd = addDays(weekStart, 6)

    const block = computeMultiRacePhase(weekStart, allRaces, today)
    const phase = block.phase

    const baseVol = baseVolumeForPhase(phase)
    const baseElev = baseElevationForPhase(phase)

    // Progressive overload: +5% every 3 weeks, deload week 4
    const cycleWeek = w % 4
    let volumeMultiplier = 1.0
    if (cycleWeek === 0) volumeMultiplier = 1.0
    else if (cycleWeek === 1) volumeMultiplier = 1.05
    else if (cycleWeek === 2) volumeMultiplier = 1.10
    else volumeMultiplier = 0.80 // deload

    const targetVolumeKm = Math.round(baseVol * volumeMultiplier * block.volumeMultiplier)
    const targetElevation = Math.round(baseElev * volumeMultiplier * block.volumeMultiplier)

    const isDeloadWeek = cycleWeek === 3
    const trainingDays = profile?.trainingDaysPerWeek ?? 6

    const sessionTemplates = getWeekSessions(
      phase,
      targetVolumeKm,
      targetElevation,
      primaryRace.type,
      paces,
      level,
      block.targetRace,
      block.weeksToTargetRace,
      raceMonth,
      isDeloadWeek,
      trainingDays,
    )

    const sessions: TrainingSession[] = sessionTemplates.map((tmpl, idx) => {
      const sessionDate = addDays(weekStart, idx === 0 ? 0 : idx === 1 ? 1 : idx === 2 ? 2 : idx === 3 ? 3 : idx === 4 ? 4 : idx === 5 ? 5 : 6)
      return {
        id: generateSessionId(),
        type: tmpl.type,
        date: format(sessionDate, 'yyyy-MM-dd'),
        durationMin: tmpl.durationMin,
        zone: tmpl.zone,
        elevationGain: tmpl.elevationGain,
        distanceKm: Math.max(1, tmpl.distanceKm),
        description: tmpl.description,
        status: 'planned',
        weekNumber: w,
      }
    })

    let notes = ''
    if (isDeloadWeek && phase !== 'Taper' && phase !== 'Recovery') {
      notes = '🔄 SEMAINE DE DÉCHARGE — Volume réduit 30%, aucune séance Z4/Z5. Récupération, sommeil, nutrition prioritaires.'
    }
    if (phase === 'Taper') notes = 'Réduction pré-course — conserver la fraîcheur, pas de fatigue'
    if (phase === 'Peak') notes = 'Semaine de pointe — charge maximale, bien récupérer entre les séances'

    weeks.push({
      weekNumber: w,
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd'),
      phase,
      sessions,
      targetVolumeKm,
      targetElevation,
      adaptation: 1.0,
      notes,
      blockLabel: block.blockLabel,
      targetRaceName: block.targetRace?.name,
      targetRacePriority: block.targetRace?.priority,
      isPostRaceRecovery: block.isPostRaceRecovery,
      postRaceRefName: block.postRaceRef?.name,
    })
  }

  return weeks
}

export function computeAdaptation(week: TrainingWeek): { ratio: number; suggestion: string } {
  const total = week.sessions.filter(s => s.type !== 'S').length
  if (total === 0) return { ratio: 1.0, suggestion: '' }

  const done = week.sessions.filter(s => s.status === 'done').length
  const partial = week.sessions.filter(s => s.status === 'partial').length
  const missed = week.sessions.filter(s => s.status === 'missed').length

  const effectiveDone = done + partial * 0.5
  const doneRatio = effectiveDone / total

  if (missed / total > 0.2) {
    return { ratio: 0.9, suggestion: 'Plus de 20% des séances manquées — volume réduit de 10% la semaine prochaine' }
  }
  if (doneRatio === 1.0 && missed === 0) {
    return { ratio: 1.05, suggestion: 'Toutes les séances complétées — possibilité d\'augmenter de 5%' }
  }
  return { ratio: 1.0, suggestion: '' }
}

export function getWeeksUntilRace(race: Race, today: Date = new Date()): number {
  return Math.max(0, differenceInWeeks(parseISO(race.date), today))
}

export function getCurrentWeek(weeks: TrainingWeek[], today: Date = new Date()): TrainingWeek | undefined {
  const todayStr = format(today, 'yyyy-MM-dd')
  return weeks.find(w => w.startDate <= todayStr && w.endDate >= todayStr)
}

export function computeWeekStats(weeks: TrainingWeek[]) {
  return weeks.map(week => {
    const planned = week.sessions.length
    const done = week.sessions.filter(s => s.status === 'done').length
    const missed = week.sessions.filter(s => s.status === 'missed').length
    const partial = week.sessions.filter(s => s.status === 'partial').length
    const totalKm = week.sessions
      .filter(s => s.status === 'done' || s.status === 'partial')
      .reduce((sum, s) => sum + s.distanceKm, 0)
    const totalElev = week.sessions
      .filter(s => s.status === 'done' || s.status === 'partial')
      .reduce((sum, s) => sum + s.elevationGain, 0)

    const doneRatio = planned > 0 ? done / planned : 0
    const fitnessScore = Math.min(100, Math.round(doneRatio * 80 + (totalKm / week.targetVolumeKm) * 20))
    const fatigueScore = Math.min(100, Math.round((totalKm / 120) * 60 + (totalElev / 8000) * 40))

    return {
      weekNumber: week.weekNumber,
      startDate: week.startDate,
      plannedSessions: planned,
      doneSessions: done,
      missedSessions: missed,
      partialSessions: partial,
      totalKm,
      totalElevation: totalElev,
      fitnessScore,
      fatigueScore,
    }
  })
}
