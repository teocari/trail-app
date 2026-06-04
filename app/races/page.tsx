'use client'

import { useState, useRef } from 'react'
import { useTrailStore } from '@/lib/store'
import RaceCard from '@/components/RaceCard'
import {
  Race, RaceType, RacePriority, TerrainType, WeatherCondition, RaceSpecs, GpxAnalysis,
  NutritionPreferences, StomachSensitivity,
} from '@/lib/types'
import { Plus, Trophy, X, ChevronDown, ChevronUp } from 'lucide-react'
import { parseGpx, analyzeGpx } from '@/lib/gpx'

const raceTypes: RaceType[] = ['XC', 'Trail', 'Ultra']
const priorities: RacePriority[] = ['A', 'B', 'C']

const priorityLabels = {
  A: 'Course A — Objectif principal',
  B: 'Course B — Objectif secondaire',
  C: 'Course C — Préparation / test',
}

const typeLabels = {
  XC: 'Cross-Country',
  Trail: 'Trail',
  Ultra: 'Ultra-Trail',
}

const terrainOptions: { value: TerrainType; label: string }[] = [
  { value: 'technique', label: 'Technique' },
  { value: 'singletrack', label: 'Single track' },
  { value: 'chemin', label: 'Chemin / fireroad' },
  { value: 'route', label: 'Route' },
  { value: 'neige', label: 'Neige' },
]

const weatherOptions: { value: WeatherCondition; label: string }[] = [
  { value: 'ensoleille', label: 'Ensoleillé' },
  { value: 'nuageux', label: 'Nuageux' },
  { value: 'pluie', label: 'Pluie' },
  { value: 'vent', label: 'Vent fort' },
  { value: 'froid', label: 'Froid <5°C' },
  { value: 'chaud', label: 'Canicule >30°C' },
]

const gelDoseOptions: { value: number; label: string }[] = [
  { value: 0,  label: 'Ne prend pas' },
  { value: 20, label: '20g' },
  { value: 25, label: '25g' },
  { value: 30, label: '30g' },
  { value: 40, label: '40g' },
]

const barDoseOptions: { value: number; label: string }[] = [
  { value: 0,  label: 'Ne prend pas' },
  { value: 30, label: '30g' },
  { value: 40, label: '40g' },
  { value: 50, label: '50g' },
]

const drinkDoseOptions: { value: number; label: string }[] = [
  { value: 0,  label: 'Ne prend pas' },
  { value: 40, label: '40g' },
  { value: 60, label: '60g' },
  { value: 80, label: '80g' },
]

const stomachOptions: { value: StomachSensitivity; label: string }[] = [
  { value: 'sensitive', label: 'Sensible' },
  { value: 'normal',    label: 'Normal' },
  { value: 'iron',      label: 'Estomac d\'acier' },
]

const solidFoodOptions: { value: 'none' | 'some' | 'lots'; label: string }[] = [
  { value: 'none', label: 'Non' },
  { value: 'some', label: 'Un peu' },
  { value: 'lots', label: 'Oui' },
]

interface FormState {
  name: string
  date: string
  distanceKm: string
  elevationGain: string
  type: RaceType
  priority: RacePriority
  goalTimeHours: string
  goalTimeMinutes: string
  // specs
  showSpecs: boolean
  startAltitudeM: number
  maxAltitudeM: number
  terrainTypes: TerrainType[]
  expectedTempC: number
  weatherCondition: WeatherCondition
  startTime: string
  hasNightSection: boolean
  // nutrition prefs
  showNutrition: boolean
  gelCarbsPerDose: number
  barCarbsPerDose: number
  drinkCarbsPer500ml: number
  electrolyteOk: boolean
  stomachSensitivity: StomachSensitivity
  solidFoodTolerance: 'none' | 'some' | 'lots'
  caffeineOk: boolean
  carbsPerHour: number
}

const defaultForm: FormState = {
  name: '',
  date: '',
  distanceKm: '',
  elevationGain: '',
  type: 'Trail',
  priority: 'B',
  goalTimeHours: '',
  goalTimeMinutes: '',
  showSpecs: false,
  startAltitudeM: 500,
  maxAltitudeM: 2000,
  terrainTypes: [],
  expectedTempC: 15,
  weatherCondition: 'ensoleille',
  startTime: '06:00',
  hasNightSection: false,
  showNutrition: false,
  gelCarbsPerDose: 25,
  barCarbsPerDose: 0,
  drinkCarbsPer500ml: 0,
  electrolyteOk: true,
  stomachSensitivity: 'normal',
  solidFoodTolerance: 'some',
  caffeineOk: true,
  carbsPerHour: 75,
}

function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            value === o.value
              ? 'bg-accent/20 border-accent/50 text-accent'
              : 'bg-surface-2 border-surface-2 text-gray-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function RacesPage() {
  const { races, addRace, removeRace, profile } = useTrailStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [gpxStatus, setGpxStatus] = useState<string>('')
  const [gpxAnalysis, setGpxAnalysis] = useState<GpxAnalysis | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const buildNutritionPrefs = (f: FormState): NutritionPreferences => ({
    gelCarbsPerDose: f.gelCarbsPerDose,
    barCarbsPerDose: f.barCarbsPerDose,
    drinkCarbsPer500ml: f.drinkCarbsPer500ml,
    electrolyteOk: f.electrolyteOk,
    stomachSensitivity: f.stomachSensitivity,
    solidFoodTolerance: f.solidFoodTolerance,
    caffeineOk: f.caffeineOk,
    carbsPerHour: f.carbsPerHour,
  })

  const handleGpxFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const pts = parseGpx(text)
    if (pts.length < 2) {
      setGpxStatus('Erreur : fichier GPX invalide ou vide.')
      setGpxAnalysis(null)
      return
    }
    const distKm = pts[pts.length - 1].distFromStartKm
    let elevGain = 0
    for (let i = 1; i < pts.length; i++) {
      const diff = pts[i].ele - pts[i - 1].ele
      if (diff > 0) elevGain += diff
    }
    setGpxStatus(`✓ GPX chargé — ${distKm.toFixed(1)} km, ${Math.round(elevGain)} m D+`)

    if (profile) {
      const specs: RaceSpecs = {
        startAltitudeM: form.startAltitudeM,
        maxAltitudeM: form.maxAltitudeM,
        terrainTypes: form.terrainTypes,
        expectedTempC: form.expectedTempC,
        weatherCondition: form.weatherCondition,
        startTime: form.startTime,
        hasNightSection: form.hasNightSection,
      }
      const goalTimeMin = form.goalTimeHours || form.goalTimeMinutes
        ? Number(form.goalTimeHours || 0) * 60 + Number(form.goalTimeMinutes || 0)
        : undefined
      const analysis = analyzeGpx(pts, profile, specs, goalTimeMin, buildNutritionPrefs(form))
      setGpxAnalysis(analysis)
    }
  }

  const toggleTerrain = (t: TerrainType) => {
    setForm(f => ({
      ...f,
      terrainTypes: f.terrainTypes.includes(t)
        ? f.terrainTypes.filter(x => x !== t)
        : [...f.terrainTypes, t],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.date || !form.distanceKm) return

    const goalTimeMin = form.goalTimeHours || form.goalTimeMinutes
      ? Number(form.goalTimeHours || 0) * 60 + Number(form.goalTimeMinutes || 0)
      : undefined

    const specs: RaceSpecs | undefined = form.showSpecs ? {
      startAltitudeM: form.startAltitudeM,
      maxAltitudeM: form.maxAltitudeM,
      terrainTypes: form.terrainTypes,
      expectedTempC: form.expectedTempC,
      weatherCondition: form.weatherCondition,
      startTime: form.startTime,
      hasNightSection: form.hasNightSection,
    } : undefined

    const raceData: Omit<Race, 'id'> = {
      name: form.name,
      date: form.date,
      distanceKm: Number(form.distanceKm),
      elevationGain: Number(form.elevationGain) || 0,
      type: form.type,
      priority: form.priority,
      ...(goalTimeMin !== undefined && goalTimeMin > 0 ? { goalTimeMin } : {}),
      ...(specs ? { specs } : {}),
      ...(gpxAnalysis ? { gpxAnalysis } : {}),
      nutritionPrefs: buildNutritionPrefs(form),
    }

    addRace(raceData)
    setForm(defaultForm)
    setGpxStatus('')
    setGpxAnalysis(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(false)
  }

  const sortedRaces = [...races].sort((a, b) => {
    const priorityOrder = { A: 0, B: 1, C: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority])
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    return a.date.localeCompare(b.date)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-race" size={24} />
            Courses Objectifs
          </h1>
          <p className="text-gray-400 text-sm mt-1">Planifiez vos courses et définissez vos priorités</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-easy/90 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Annuler' : 'Ajouter une course'}
        </button>
      </div>

      {/* Add race form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-surface-2 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-bold text-white">Nouvelle course</h2>

          {/* Base fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nom de la course *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: UTMB Mont-Blanc"
                className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Distance (km) *</label>
              <input
                type="number"
                required
                min={1}
                value={form.distanceKm}
                onChange={e => setForm({ ...form, distanceKm: e.target.value })}
                placeholder="Ex: 171"
                className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Dénivelé positif (m D+)</label>
              <input
                type="number"
                min={0}
                value={form.elevationGain}
                onChange={e => setForm({ ...form, elevationGain: e.target.value })}
                placeholder="Ex: 10000"
                className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type de course</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as RaceType })}
                className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                {raceTypes.map(t => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as RacePriority })}
                className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{priorityLabels[p]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Goal time */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Temps objectif (optionnel)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={30}
                value={form.goalTimeHours}
                onChange={e => setForm({ ...form, goalTimeHours: e.target.value })}
                placeholder="Heures"
                className="w-24 bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
              />
              <span className="text-gray-500 text-sm">h</span>
              <input
                type="number"
                min={0}
                max={59}
                value={form.goalTimeMinutes}
                onChange={e => setForm({ ...form, goalTimeMinutes: e.target.value })}
                placeholder="Min"
                className="w-24 bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
              />
              <span className="text-gray-500 text-sm">min</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Laisse vide si pas d'objectif de temps précis</p>
          </div>

          {/* Specs section (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, showSpecs: !f.showSpecs }))}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors font-semibold"
            >
              {form.showSpecs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Spécifications de course (optionnel)
            </button>

            {form.showSpecs && (
              <div className="mt-4 space-y-4 border border-surface-2 rounded-lg p-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Altitude de départ : <span className="text-white">{form.startAltitudeM} m</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={3000}
                      step={50}
                      value={form.startAltitudeM}
                      onChange={e => setForm({ ...form, startAltitudeM: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                      <span>0 m</span><span>3000 m</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Altitude max : <span className="text-white">{form.maxAltitudeM} m</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={4500}
                      step={50}
                      value={form.maxAltitudeM}
                      onChange={e => setForm({ ...form, maxAltitudeM: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                      <span>0 m</span><span>4500 m</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">Types de terrain</label>
                  <div className="flex flex-wrap gap-2">
                    {terrainOptions.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleTerrain(t.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          form.terrainTypes.includes(t.value)
                            ? 'bg-accent/20 border-accent/50 text-accent'
                            : 'bg-surface-2 border-surface-2 text-gray-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Température attendue : <span className="text-white">{form.expectedTempC}°C</span>
                    </label>
                    <input
                      type="range"
                      min={-10}
                      max={45}
                      step={1}
                      value={form.expectedTempC}
                      onChange={e => setForm({ ...form, expectedTempC: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                      <span>-10°C</span><span>45°C</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Météo</label>
                    <select
                      value={form.weatherCondition}
                      onChange={e => setForm({ ...form, weatherCondition: e.target.value as WeatherCondition })}
                      className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                    >
                      {weatherOptions.map(w => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Heure de départ</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={e => setForm({ ...form, startTime: e.target.value })}
                      className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <input
                      type="checkbox"
                      id="nightSection"
                      checked={form.hasNightSection}
                      onChange={e => setForm({ ...form, hasNightSection: e.target.checked })}
                      className="w-4 h-4 accent-accent"
                    />
                    <label htmlFor="nightSection" className="text-xs text-gray-300">Section nocturne</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nutrition preferences section (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, showNutrition: !f.showNutrition }))}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors font-semibold"
            >
              {form.showNutrition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Préférences nutrition course (optionnel)
            </button>

            {form.showNutrition && (
              <div className="mt-4 space-y-4 border border-surface-2 rounded-lg p-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Gel — glucides par dose</label>
                  <ToggleGroup
                    options={gelDoseOptions}
                    value={form.gelCarbsPerDose}
                    onChange={v => setForm(f => ({ ...f, gelCarbsPerDose: v }))}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">Barre — glucides par dose</label>
                  <ToggleGroup
                    options={barDoseOptions}
                    value={form.barCarbsPerDose}
                    onChange={v => setForm(f => ({ ...f, barCarbsPerDose: v }))}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">Boisson énergétique — glucides par 500ml</label>
                  <ToggleGroup
                    options={drinkDoseOptions}
                    value={form.drinkCarbsPer500ml}
                    onChange={v => setForm(f => ({ ...f, drinkCarbsPer500ml: v }))}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="electrolyteOk"
                    checked={form.electrolyteOk}
                    onChange={e => setForm({ ...form, electrolyteOk: e.target.checked })}
                    className="w-4 h-4 accent-accent"
                  />
                  <label htmlFor="electrolyteOk" className="text-xs text-gray-300">
                    Électrolytes (sodium) — comprimé dans 500ml eau
                  </label>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">Sensibilité estomac</label>
                  <ToggleGroup
                    options={stomachOptions}
                    value={form.stomachSensitivity}
                    onChange={v => setForm(f => ({ ...f, stomachSensitivity: v }))}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">Alimentation solide en course</label>
                  <ToggleGroup
                    options={solidFoodOptions}
                    value={form.solidFoodTolerance}
                    onChange={v => setForm(f => ({ ...f, solidFoodTolerance: v }))}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">
                    Apport en glucides cible —{' '}
                    <span className="text-white font-semibold">{form.carbsPerHour}g/heure</span>
                    <span className="text-gray-500 ml-2">
                      {form.carbsPerHour <= 60 ? '(course <3h ou estomac sensible)' :
                       form.carbsPerHour <= 75 ? '(trail standard 3-6h)' :
                       form.carbsPerHour <= 90 ? '(ultra 6-12h, recommandé élite)' :
                       '(ultra >12h, maximum toléré avec Maurten/SiS)'}
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    {[60, 75, 90, 100].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, carbsPerHour: v }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                          form.carbsPerHour === v
                            ? 'bg-accent text-black border-accent'
                            : 'bg-surface-2 text-gray-400 border-surface-2 hover:text-white'
                        }`}
                      >
                        {v}g/h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="caffeineOk"
                    checked={form.caffeineOk}
                    onChange={e => setForm({ ...form, caffeineOk: e.target.checked })}
                    className="w-4 h-4 accent-accent"
                  />
                  <label htmlFor="caffeineOk" className="text-xs text-gray-300">
                    J'utilise la caféine (gel CAF recommandé à 60-70% de la course)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* GPX file */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Fichier GPX (optionnel)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx"
              onChange={handleGpxFile}
              className="w-full bg-surface-2 border border-surface-2 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-accent file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
            />
            {gpxStatus && (
              <p className={`text-xs mt-1 ${gpxStatus.startsWith('✓') ? 'text-easy' : 'text-race'}`}>{gpxStatus}</p>
            )}
            {gpxStatus.startsWith('✓') && !profile && (
              <p className="text-xs text-gray-500 mt-0.5">Analyse de stratégie disponible après création (profil requis)</p>
            )}
            {gpxStatus.startsWith('✓') && profile && (
              <p className="text-xs text-easy mt-0.5">Analyse de stratégie calculée — disponible après création</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(defaultForm); setGpxStatus(''); setGpxAnalysis(null) }}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent text-black font-semibold text-sm rounded-lg hover:bg-easy/90 transition-colors"
            >
              Ajouter la course
            </button>
          </div>
        </form>
      )}

      {/* Races by priority */}
      {(['A', 'B', 'C'] as RacePriority[]).map(priority => {
        const filtered = sortedRaces.filter(r => r.priority === priority)
        if (filtered.length === 0) return null
        return (
          <div key={priority}>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              {priorityLabels[priority]}
            </h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(race => (
                <RaceCard
                  key={race.id}
                  race={race}
                  onRemove={() => removeRace(race.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {races.length === 0 && (
        <div className="flex flex-col items-center py-16 text-gray-500">
          <Trophy size={48} className="mb-4 text-gray-600" />
          <p className="text-lg font-semibold">Aucune course planifiée</p>
          <p className="text-sm mt-1">Ajoutez votre première course pour générer un plan d'entraînement</p>
        </div>
      )}

      {/* Methodology info */}
      <div className="bg-surface border border-surface-2 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Méthodologie de périodisation</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { phase: 'Base', weeks: '30%', desc: 'Construction du volume, endurance fondamentale, force générale' },
            { phase: 'Développement', weeks: '25%', desc: 'Augmentation intensité, premiers blocs de qualité' },
            { phase: 'Spécifique', weeks: '20%', desc: 'Entraînements proches des conditions de course' },
            { phase: 'Pic / Réduction', weeks: '25%', desc: 'Charge maximale puis réduction progressive avant course' },
          ].map(item => (
            <div key={item.phase} className="bg-surface-2 rounded-lg p-3">
              <p className="text-xs font-bold text-accent">{item.phase} <span className="text-gray-500">· {item.weeks}</span></p>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-surface-2 rounded-lg">
          <p className="text-xs text-gray-400">
            <span className="text-white font-semibold">Entraînement polarisé 80/20 :</span> 80% du volume en zones 1-2 (facile), 20% en zones 4-5 (dur). Éviter la zone 3 (ni assez facile pour récupérer, ni assez difficile pour progresser).
          </p>
        </div>
      </div>
    </div>
  )
}
