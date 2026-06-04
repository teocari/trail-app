'use client'

import { useState } from 'react'
import { useTrailStore } from '@/lib/store'
import { AthleteProfile, RunnerLevel, RaceType } from '@/lib/types'
import { Mountain, ChevronRight, ChevronLeft, CheckCircle2, User, Activity, Gauge, Dumbbell, LogIn, UserPlus, UserX } from 'lucide-react'
import AuthModal from './AuthModal'

const STEPS = [
  { id: 1, label: 'Identité', icon: User },
  { id: 2, label: 'Expérience', icon: Activity },
  { id: 3, label: 'Performance', icon: Gauge },
  { id: 4, label: 'Volume', icon: Dumbbell },
]

const LEVELS: { value: RunnerLevel; label: string; sub: string; weeklyKm: string; example: string }[] = [
  {
    value: 'debutant',
    label: 'Débutant',
    sub: 'Moins de 2 ans de course à pied',
    weeklyKm: '20-40 km/sem',
    example: '10km > 55min',
  },
  {
    value: 'intermediaire',
    label: 'Intermédiaire',
    sub: '2 à 5 ans de pratique régulière',
    weeklyKm: '40-60 km/sem',
    example: '10km 45-55min',
  },
  {
    value: 'confirme',
    label: 'Confirmé',
    sub: '5 ans+, compétitions régulières',
    weeklyKm: '60-90 km/sem',
    example: '10km 35-45min',
  },
  {
    value: 'elite',
    label: 'Élite',
    sub: 'Niveau national / vise le pro',
    weeklyKm: '90-130 km/sem',
    example: '10km < 35min',
  },
]

export default function Onboarding() {
  const { setProfile } = useTrailStore()
  const userId = useTrailStore(s => s.userId)
  // If already authenticated, skip auth screen (step 0) and go to profile setup
  const [step, setStep] = useState(userId ? 1 : 0)
  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('signup')

  const [firstName, setFirstName] = useState('')
  const [level, setLevel] = useState<RunnerLevel>('confirme')
  const [yearsTrail, setYearsTrail] = useState(3)
  const [pace10kmMin, setPace10kmMin] = useState(40)
  const [pace10kmSec, setPace10kmSec] = useState(0)
  const [maxHR, setMaxHR] = useState(0)
  const [weeklyKm, setWeeklyKm] = useState(70)
  const [weeklyElevation, setWeeklyElevation] = useState(3000)
  const [bodyWeightKg, setBodyWeightKg] = useState(65)
  const [preferredRaceType, setPreferredRaceType] = useState<RaceType>('Trail')

  const canNext = () => {
    if (step === 1) return firstName.trim().length > 0
    return true
  }

  if (showAuth) {
    return (
      <AuthModal
        onClose={() => {
          setShowAuth(false)
          // After auth, go directly to profile setup (skip auth screen)
          setStep(1)
        }}
        defaultTab={authTab}
      />
    )
  }

  const handleFinish = () => {
    const profile: AthleteProfile = {
      firstName: firstName.trim(),
      level,
      yearsTrail,
      weeklyKm,
      weeklyElevation,
      pace10kmMin,
      pace10kmSec,
      maxHR,
      bodyWeightKg,
      preferredRaceType,
    }
    setProfile(profile)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-surface-2 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-surface-2 px-6 py-5 flex items-center gap-3 border-b border-surface-2">
          <Mountain className="text-accent" size={26} />
          <div>
            <h1 className="font-bold text-white text-lg">TrailElite</h1>
            <p className="text-xs text-gray-400">Configuration de ton profil athlète</p>
          </div>
        </div>

        {/* Step indicators — only show after auth screen */}
        <div className={`flex px-6 pt-5 gap-2 ${step === 0 ? 'hidden' : ''}`}>
          {STEPS.map((s) => {
            const Icon = s.icon
            const active = s.id === step
            const done = s.id < step
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  done ? 'bg-accent' : active ? 'bg-accent/20 border-2 border-accent' : 'bg-surface-2'
                }`}>
                  {done
                    ? <CheckCircle2 size={16} className="text-black" />
                    : <Icon size={14} className={active ? 'text-accent' : 'text-gray-500'} />
                  }
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-accent' : done ? 'text-gray-400' : 'text-gray-600'}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[340px]">

          {step === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 py-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">Bienvenue sur TrailElite 🏔️</h2>
                <p className="text-sm text-gray-400 mt-2">Choisis comment tu veux commencer</p>
              </div>
              <div className="w-full space-y-3">
                <button
                  onClick={() => { setAuthTab('signup'); setShowAuth(true) }}
                  className="w-full flex items-center gap-3 bg-accent text-black font-semibold px-5 py-3.5 rounded-xl hover:bg-accent/90 transition-all"
                >
                  <UserPlus size={18} />
                  <div className="text-left">
                    <p className="text-sm font-bold">Créer un compte</p>
                    <p className="text-xs font-normal opacity-70">Sauvegarde ton programme dans le cloud</p>
                  </div>
                </button>
                <button
                  onClick={() => { setAuthTab('login'); setShowAuth(true) }}
                  className="w-full flex items-center gap-3 bg-surface-2 border border-surface-2 text-white font-semibold px-5 py-3.5 rounded-xl hover:border-accent/50 transition-all"
                >
                  <LogIn size={18} className="text-accent" />
                  <div className="text-left">
                    <p className="text-sm font-bold">Se connecter</p>
                    <p className="text-xs font-normal text-gray-400">J'ai déjà un compte</p>
                  </div>
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full flex items-center gap-3 bg-surface-2/50 border border-surface-2/50 text-gray-400 px-5 py-3.5 rounded-xl hover:text-white transition-all"
                >
                  <UserX size={18} />
                  <div className="text-left">
                    <p className="text-sm font-semibold">Continuer en tant qu'invité</p>
                    <p className="text-xs text-gray-500">Données sauvegardées uniquement sur cet appareil</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Bienvenue sur TrailElite 👋</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {userId
                    ? '✅ Connecté — configure ton profil pour démarrer ton plan.'
                    : 'Commence par te présenter pour que l\'app te reconnaisse.'
                  }
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Ton prénom</label>
                <input
                  type="text"
                  autoFocus
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Ex: Kilian"
                  className="w-full bg-surface-2 border border-surface-2 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent text-sm"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Ton niveau en trail</h2>
                <p className="text-sm text-gray-400 mt-1">Choisis le profil qui correspond le mieux à ta pratique actuelle.</p>
              </div>
              <div className="grid gap-2">
                {LEVELS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      level === l.value
                        ? 'border-accent bg-accent/10'
                        : 'border-surface-2 bg-surface-2 hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 ${
                      level === l.value ? 'border-accent bg-accent' : 'border-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{l.label}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{l.example}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{l.sub}</p>
                      <p className="text-xs text-gray-500">{l.weeklyKm}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">
                  Années de pratique trail/course à pied
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0} max={20} value={yearsTrail}
                    onChange={e => setYearsTrail(Number(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-sm font-bold text-white w-16 text-right">{yearsTrail} {yearsTrail <= 1 ? 'an' : 'ans'}</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Tes références de performance</h2>
                <p className="text-sm text-gray-400 mt-1">Ces données permettent de calibrer tes allures d'entraînement avec précision.</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">
                  Ton meilleur temps sur 10km (route ou piste)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min={28} max={80}
                      value={pace10kmMin}
                      onChange={e => setPace10kmMin(Number(e.target.value))}
                      className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:border-accent"
                    />
                    <p className="text-xs text-gray-500 text-center mt-0.5">minutes</p>
                  </div>
                  <span className="text-gray-400 font-bold">:</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0} max={59} step={5}
                      value={pace10kmSec}
                      onChange={e => setPace10kmSec(Number(e.target.value))}
                      className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:border-accent"
                    />
                    <p className="text-xs text-gray-500 text-center mt-0.5">secondes</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Pas de chrono 10km ? Utilise : semi-marathon ÷ 2.15 | marathon ÷ 4.65
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">
                  FC maximale (optionnel — laisse 0 si inconnue)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0} max={220} step={5} value={maxHR}
                    onChange={e => setMaxHR(Number(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-sm font-bold text-white w-20 text-right">
                    {maxHR === 0 ? 'Inconnu' : `${maxHR} bpm`}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Poids corporel (kg)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={45} max={100} value={bodyWeightKg}
                    onChange={e => setBodyWeightKg(Number(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-sm font-bold text-white w-16 text-right">{bodyWeightKg} kg</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Ton volume d'entraînement actuel</h2>
                <p className="text-sm text-gray-400 mt-1">Le plan de départ sera calé sur ce volume, puis progressera vers les objectifs.</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">
                  Volume hebdomadaire actuel — <span className="text-white font-semibold">{weeklyKm} km/semaine</span>
                </label>
                <input
                  type="range"
                  min={20} max={150} step={5} value={weeklyKm}
                  onChange={e => setWeeklyKm(Number(e.target.value))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                  <span>20 km</span><span>150 km</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">
                  Dénivelé positif hebdomadaire — <span className="text-white font-semibold">{weeklyElevation.toLocaleString('fr')} m D+/semaine</span>
                </label>
                <input
                  type="range"
                  min={0} max={12000} step={250} value={weeklyElevation}
                  onChange={e => setWeeklyElevation(Number(e.target.value))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                  <span>0 m</span><span>12 000 m</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Type de course préféré</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['XC', 'Trail', 'Ultra'] as RaceType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setPreferredRaceType(t)}
                      className={`py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                        preferredRaceType === t
                          ? 'bg-accent text-black border-accent'
                          : 'bg-surface-2 text-gray-400 border-surface-2 hover:text-white'
                      }`}
                    >
                      {t === 'XC' ? 'Course sur route' : t === 'Trail' ? 'Court Trail' : 'Ultra'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 pb-6 flex items-center justify-between ${step === 0 ? 'hidden' : ''}`}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={16} />
            Retour
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 bg-accent text-black font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Continuer
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 bg-accent text-black font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-accent/90 transition-all"
            >
              <CheckCircle2 size={16} />
              Démarrer mon plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
