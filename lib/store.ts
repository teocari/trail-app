'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Race, TrainingWeek, TrainingSession, SessionStatus, AthleteProfile } from './types'
import { generateTrainingPlan } from './training'

// Mock data
const MOCK_RACES: Race[] = [
  {
    id: 'race-1',
    name: 'UTMB Mont-Blanc',
    date: '2026-08-28',
    distanceKm: 171,
    elevationGain: 10000,
    type: 'Ultra',
    priority: 'A',
  },
  {
    id: 'race-2',
    name: 'Maxi-Race Annecy',
    date: '2026-07-11',
    distanceKm: 85,
    elevationGain: 5400,
    type: 'Trail',
    priority: 'B',
  },
  {
    id: 'race-3',
    name: 'Trail des Montagnes du Giffre',
    date: '2026-06-28',
    distanceKm: 42,
    elevationGain: 2800,
    type: 'Trail',
    priority: 'C',
  },
]

// We generate the plan from today 2026-06-03
const TODAY = new Date('2026-06-03')
const INITIAL_PLAN = generateTrainingPlan(MOCK_RACES, TODAY)

interface TrailStore {
  profile: AthleteProfile | null
  races: Race[]
  trainingWeeks: TrainingWeek[]
  showProfileEdit: boolean
  setProfile: (profile: AthleteProfile) => void
  setShowProfileEdit: (v: boolean) => void
  addRace: (race: Omit<Race, 'id'>) => void
  removeRace: (id: string) => void
  updateSessionStatus: (weekNumber: number, sessionId: string, status: SessionStatus) => void
  regeneratePlan: () => void
  applyAdaptation: (weekNumber: number, multiplier: number) => void
}

export const useTrailStore = create<TrailStore>()(
  persist(
    (set, get) => ({
      profile: null,
      races: MOCK_RACES,
      trainingWeeks: INITIAL_PLAN,
      showProfileEdit: false,

      setShowProfileEdit: (v) => set({ showProfileEdit: v }),

      setProfile: (profile) => {
        set({ profile })
        get().regeneratePlan()
      },

      addRace: (raceData) => {
        const race: Race = { ...raceData, id: `race-${Date.now()}` }
        set(state => ({ races: [...state.races, race] }))
        get().regeneratePlan()
      },

      removeRace: (id) => {
        set(state => ({ races: state.races.filter(r => r.id !== id) }))
        get().regeneratePlan()
      },

      updateSessionStatus: (weekNumber, sessionId, status) => {
        set(state => ({
          trainingWeeks: state.trainingWeeks.map(week => {
            if (week.weekNumber !== weekNumber) return week
            return {
              ...week,
              sessions: week.sessions.map(session =>
                session.id === sessionId ? { ...session, status } : session
              ),
            }
          }),
        }))
      },

      regeneratePlan: () => {
        const { races, profile } = get()
        const plan = generateTrainingPlan(races, TODAY, profile ?? undefined)
        set({ trainingWeeks: plan })
      },

      applyAdaptation: (weekNumber, multiplier) => {
        set(state => ({
          trainingWeeks: state.trainingWeeks.map(week => {
            if (week.weekNumber !== weekNumber) return week
            return {
              ...week,
              adaptation: multiplier,
              targetVolumeKm: Math.round(week.targetVolumeKm * multiplier),
              targetElevation: Math.round(week.targetElevation * multiplier),
            }
          }),
        }))
      },
    }),
    {
      name: 'trail-app-storage',
    }
  )
)
