'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Race, TrainingWeek, TrainingSession, SessionStatus, AthleteProfile } from './types'
import { generateTrainingPlan } from './training'
import { supabase } from './supabase'

const MOCK_RACES: Race[] = []

const TODAY = new Date()
const INITIAL_PLAN = generateTrainingPlan(MOCK_RACES, TODAY)

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null

interface TrailStore {
  profile: AthleteProfile | null
  races: Race[]
  trainingWeeks: TrainingWeek[]
  showProfileEdit: boolean
  userId: string | null
  isSyncing: boolean
  lastSynced: string | null
  setProfile: (profile: AthleteProfile) => void
  setShowProfileEdit: (v: boolean) => void
  setUserId: (id: string | null) => void
  addRace: (race: Omit<Race, 'id'>) => void
  removeRace: (id: string) => void
  updateSessionStatus: (weekNumber: number, sessionId: string, status: SessionStatus) => void
  regeneratePlan: () => void
  applyAdaptation: (weekNumber: number, multiplier: number) => void
  syncToCloud: () => Promise<void>
  loadFromCloud: (userId: string) => Promise<void>
}

export const useTrailStore = create<TrailStore>()(
  persist(
    (set, get) => ({
      profile: null,
      races: MOCK_RACES,
      trainingWeeks: INITIAL_PLAN,
      showProfileEdit: false,
      userId: null,
      isSyncing: false,
      lastSynced: null,

      setShowProfileEdit: (v) => set({ showProfileEdit: v }),

      setUserId: (id) => set({ userId: id }),

      setProfile: (profile) => {
        set({ profile })
        get().regeneratePlan()
        debouncedSync(get)
      },

      addRace: (raceData) => {
        const race: Race = { ...raceData, id: `race-${Date.now()}` }
        set(state => ({ races: [...state.races, race] }))
        get().regeneratePlan()
        debouncedSync(get)
      },

      removeRace: (id) => {
        set(state => ({ races: state.races.filter(r => r.id !== id) }))
        get().regeneratePlan()
        debouncedSync(get)
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
        debouncedSync(get)
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
        debouncedSync(get)
      },

      syncToCloud: async () => {
        const { userId, profile, races, trainingWeeks } = get()
        if (!userId) return
        set({ isSyncing: true })
        try {
          const data = { profile, races, trainingWeeks }
          await supabase.from('user_data').upsert({
            user_id: userId,
            data,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
          set({ lastSynced: new Date().toISOString(), isSyncing: false })
        } catch (err) {
          console.error('Sync to cloud failed:', err)
          set({ isSyncing: false })
        }
      },

      loadFromCloud: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('user_id', userId)
            .single()
          if (error || !data?.data) return
          const { profile, races, trainingWeeks } = data.data as {
            profile: AthleteProfile | null
            races: Race[]
            trainingWeeks: TrainingWeek[]
          }
          if (races && trainingWeeks) {
            set({ profile: profile ?? null, races, trainingWeeks })
          }
        } catch (err) {
          console.error('Load from cloud failed:', err)
        }
      },
    }),
    {
      name: 'trail-app-storage',
    }
  )
)

function debouncedSync(get: () => TrailStore) {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(() => {
    get().syncToCloud()
  }, 2000)
}
