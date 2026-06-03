import { DayLoad, NutritionDay, Meal } from './types'

export function getDayLoadLabel(load: DayLoad): string {
  const labels: Record<DayLoad, string> = {
    REST: 'Repos',
    EASY: 'Léger',
    MODERATE: 'Modéré',
    HARD: 'Intense',
    RACE: 'Course',
  }
  return labels[load]
}

export function getDayLoadColor(load: DayLoad): string {
  const colors: Record<DayLoad, string> = {
    REST: '#6b7280',
    EASY: '#22c55e',
    MODERATE: '#eab308',
    HARD: '#f97316',
    RACE: '#ef4444',
  }
  return colors[load]
}

export function computeCalories(load: DayLoad, bodyWeightKg = 65): number {
  const bmr = 1600 // base metabolic rate for elite runner
  const activityMultiplier: Record<DayLoad, number> = {
    REST: 1.4,
    EASY: 1.7,
    MODERATE: 1.9,
    HARD: 2.2,
    RACE: 2.5,
  }
  return Math.round(bmr * activityMultiplier[load])
}

export function computeMacros(load: DayLoad, calories: number): { protein: number; carbs: number; fat: number } {
  // Protein: 1.8-2.2g/kg for elite runners (assuming 65kg)
  // Carbs: higher on hard days
  // Fat: fills remaining calories
  const macroRatios: Record<DayLoad, { protein: number; carbs: number; fat: number }> = {
    REST: { protein: 0.25, carbs: 0.40, fat: 0.35 },
    EASY: { protein: 0.22, carbs: 0.50, fat: 0.28 },
    MODERATE: { protein: 0.20, carbs: 0.55, fat: 0.25 },
    HARD: { protein: 0.18, carbs: 0.60, fat: 0.22 },
    RACE: { protein: 0.15, carbs: 0.68, fat: 0.17 },
  }

  const ratios = macroRatios[load]
  return {
    protein: Math.round((calories * ratios.protein) / 4),
    carbs: Math.round((calories * ratios.carbs) / 4),
    fat: Math.round((calories * ratios.fat) / 9),
  }
}

export function computeHydration(load: DayLoad): number {
  const hydration: Record<DayLoad, number> = {
    REST: 2.0,
    EASY: 2.5,
    MODERATE: 3.0,
    HARD: 3.5,
    RACE: 4.5,
  }
  return hydration[load]
}

const BREAKFASTS: Record<DayLoad, Meal> = {
  REST: {
    name: 'Porridge récupération',
    description: 'Flocons d\'avoine, banane, miel, amandes effilées, lait d\'amande',
    calories: 520,
    protein: 15,
    carbs: 75,
    fat: 18,
    brands: ['Quaker (flocons d\'avoine)', 'Allos (miel de forêt)', 'Alpro (lait d\'amande)', 'Couleur d\'Automne (amandes)'],
    performanceRationale: 'Les flocons d\'avoine à index glycémique bas fournissent une énergie prolongée et soutiennent la synthèse du glycogène musculaire en phase de repos. Le miel apporte des sucres naturels pour reconstituer les réserves sans pic insulinique brutal.',
  },
  EASY: {
    name: 'Bol d\'énergie matin',
    description: 'Granola maison, yaourt grec, fruits rouges, graines de chia, filet de miel',
    calories: 580,
    protein: 22,
    carbs: 80,
    fat: 16,
    brands: ['Biotona (graines de chia bio)', 'Fage (yaourt grec 0%)', 'Picard (fruits rouges surgelés)', 'Bjorg (granola sans sucre ajouté)'],
    performanceRationale: 'Le yaourt grec apporte 18g de protéines rapides pour soutenir la synthèse musculaire matinale. Les fruits rouges fournissent des antioxydants (anthocyanes) qui réduisent l\'inflammation post-effort. Les graines de chia ralentissent l\'absorption des glucides et stabilisent l\'énergie sur la sortie.',
  },
  MODERATE: {
    name: 'Toast athlète complet',
    description: '2 toasts pain complet, 2 oeufs brouillés, avocat, tomates, jus d\'orange pressé',
    calories: 650,
    protein: 28,
    carbs: 72,
    fat: 24,
    brands: ['Poilâne (pain complet au levain)', 'Florette (avocat Hass)', 'Innocent (jus orange pressé)', 'Œufs Label Rouge fermiers'],
    performanceRationale: 'Les œufs fournissent les 9 acides aminés essentiels et la leucine qui déclenche la synthèse protéique musculaire. L\'avocat apporte des graisses mono-insaturées qui soutiennent la production de testostérone et réduisent l\'inflammation. Le pain complet au levain a un IG plus bas que le pain blanc pour une énergie stable pendant l\'effort.',
  },
  HARD: {
    name: 'Charge glucidique matinale',
    description: 'Pancakes avoine-banane (x3), sirop d\'érable, fromage blanc, fruits secs',
    calories: 780,
    protein: 32,
    carbs: 105,
    fat: 20,
    brands: ['Quaker (avoine fine)', 'Maple Joe (sirop d\'érable pur)', 'Fjord (fromage blanc 20%)', 'Seeberger (mélange fruits secs)'],
    performanceRationale: 'Avec 105g de glucides, ce petit-déjeuner maximise le remplissage du glycogène musculaire (capacité ~400-500g) avant une séance intense. La combinaison avoine + banane offre une libération en deux temps : glucose rapide de la banane pour le démarrage, beta-glucanes de l\'avoine pour la durée. Le fromage blanc limite le catabolisme musculaire pendant l\'effort dur.',
  },
  RACE: {
    name: 'Petit-déjeuner pré-course',
    description: 'Riz blanc au lait de coco, banane, pain de mie grillé avec beurre de cacahuète, café',
    calories: 700,
    protein: 20,
    carbs: 115,
    fat: 16,
    brands: ['Uncle Ben\'s (riz blanc cuisson rapide)', 'Bjorg (lait de coco)', 'Herta (pain de mie blanc)', 'Whole Earth (beurre de cacahuète naturel)', 'Lavazza (café espresso)'],
    performanceRationale: 'Protocole pré-course validé par les élites UTMB : le riz blanc est le glucide le plus digestible (quasi-zéro fibres) pour éviter tout inconfort gastrique en course. La caféine du café augmente la mobilisation des acides gras libres de 10-15% et améliore la perception de l\'effort. Consommer 2h30-3h avant le départ pour digestion complète.',
  },
}

const LUNCHES: Record<DayLoad, Meal> = {
  REST: {
    name: 'Salade complète récup',
    description: 'Quinoa, légumes rôtis, pois chiches, feta, vinaigrette citron-huile d\'olive',
    calories: 580,
    protein: 25,
    carbs: 65,
    fat: 22,
    brands: ['Alter Eco (quinoa blanc bio)', 'Naturgreen (pois chiches bio)', 'Valbreso (feta AOP)', 'Cauvin (huile d\'olive vierge extra)'],
    performanceRationale: 'Le quinoa est l\'un des rares végétaux à contenir les 9 acides aminés essentiels — idéal le jour de repos pour optimiser la récupération sans surcharger le système digestif. L\'huile d\'olive et les légumes rôtis apportent des polyphénols anti-inflammatoires qui accélèrent la réparation tissulaire.',
  },
  EASY: {
    name: 'Bowl asiatique',
    description: 'Riz basmati, thon, concombre, avocat, sauce soja, algues nori, graines de sésame',
    calories: 620,
    protein: 35,
    carbs: 70,
    fat: 18,
    brands: ['Taureau Ailé (thon albacore en eau)', 'Priméal (riz basmati complet)', 'Clearspring (sauce tamari)', 'Nishiki (algues nori)', 'Kikkoman (sauce soja réduite en sel)'],
    performanceRationale: 'Le thon albacore est l\'une des meilleures sources de protéines complètes avec 30g/100g et un ratio omega-3/omega-6 favorable pour réduire l\'inflammation musculaire. Les algues nori apportent de l\'iode et des minéraux essentiels souvent déficients chez les coureurs à fort volume.',
  },
  MODERATE: {
    name: 'Pasta trail runner',
    description: 'Pâtes complètes, sauce tomate maison, escalope de dinde, parmesan, basilic frais',
    calories: 720,
    protein: 45,
    carbs: 85,
    fat: 15,
    brands: ['Barilla (pâtes complètes Integrale)', 'Mutti (passata de tomates)', 'Grana Padano (parmesan AOP)', 'Picatelli (escalope de dinde)'],
    performanceRationale: 'Les pâtes complètes (IG 50 vs 71 pour les blanches) fournissent une libération progressive de glucose qui maintient la glycémie stable pendant 3-4h post-repas — parfait avant une session de 2h l\'après-midi. La dinde est la viande maigre la plus riche en tryptophane, précurseur de la sérotonine qui améliore la qualité du sommeil.',
  },
  HARD: {
    name: 'Mega bowl protéiné',
    description: 'Riz, poulet grillé 200g, légumes vapeur, oeuf poché, sauce tahini, avocat',
    calories: 820,
    protein: 60,
    carbs: 90,
    fat: 20,
    brands: ['Bresse Bleu (poulet fermier)', 'Priméal (riz semi-complet)', 'Heimä (tahini sésame)', 'Bonduelle (légumes vapeur surgelés sans sel)'],
    performanceRationale: 'Avec 60g de protéines, ce repas couvre les besoins de synthèse protéique post-séance intense (2g/kg pour un athlète de 65kg = 130g/jour). Le tahini apporte du calcium biodisponible et des graisses insaturées. L\'oeuf poché ajoute de la leucine, l\'acide aminé clé de l\'activation mTOR pour la réparation musculaire.',
  },
  RACE: {
    name: 'Repas pré-race léger',
    description: 'Riz blanc, saumon vapeur, courgettes poêlées, pain de mie, compote sans sucre ajouté',
    calories: 680,
    protein: 40,
    carbs: 95,
    fat: 10,
    brands: ['Uncle Ben\'s (riz blanc)', 'Labeyrie (saumon atlantique)', 'Herta (pain de mie sans croûte)', 'Materne (compote pomme nature)'],
    performanceRationale: 'Repas à faible teneur en fibres et graisses pour vider le tractus gastro-intestinal avant la course. Le saumon vapeur est préféré à la viande rouge car il est plus digeste (vide gastrique ~2h vs 4h). 95g de glucides constituent la dernière fenêtre de chargement glycogène : consommer 3-4h avant le départ.',
  },
}

const DINNERS: Record<DayLoad, Meal> = {
  REST: {
    name: 'Soupe et légumineuses',
    description: 'Velouté de courge, lentilles corail, pain complet grillé, fromage blanc aux herbes',
    calories: 480,
    protein: 25,
    carbs: 58,
    fat: 14,
    brands: ['Tipiak (lentilles corail)', 'Polaner (purée de courge)', 'Poilâne (pain complet)', 'Fjord (fromage blanc 20%)'],
    performanceRationale: 'Les lentilles corail sont l\'une des meilleures sources de fer non-héminique pour les coureurs (souvent déficients). Le soir de repos, réduire les glucides totaux permet de maintenir la sensibilité à l\'insuline. Le fromage blanc aux herbes apporte de la caséine, protéine à digestion lente qui nourrit les muscles pendant le sommeil.',
  },
  EASY: {
    name: 'Saumon et légumes',
    description: 'Filet de saumon en papillote, quinoa, asperges rôties, citron, aneth',
    calories: 560,
    protein: 42,
    carbs: 45,
    fat: 22,
    brands: ['Labeyrie (saumon fumé/frais)', 'Alter Eco (quinoa tricolore)', 'Cauvin (huile d\'olive)', 'Bonduelle (asperges vertes)'],
    performanceRationale: 'Le saumon est la meilleure source naturelle d\'EPA et DHA (omega-3 à longue chaîne) qui réduisent les marqueurs inflammatoires (CRP, IL-6) de 20-30% chez les athlètes d\'endurance. Les asperges sont diurétiques et aident à éliminer l\'acide lactique accumulé pendant la séance. Le quinoa fournit la méthionine nécessaire à la synthèse de carnitine.',
  },
  MODERATE: {
    name: 'Boeuf et patate douce',
    description: 'Steak de boeuf haché, purée de patate douce, haricots verts, salade verte',
    calories: 680,
    protein: 48,
    carbs: 68,
    fat: 22,
    brands: ['Charal (steak haché 5% MG)', 'Intermarché (patates douces)', 'Bonduelle (haricots verts extra-fins)', 'Florette (salade verte)'],
    performanceRationale: 'Le boeuf maigre est la source la plus biodisponible de zinc et fer héminique, deux minéraux critiques pour la production d\'érythrocytes (globules rouges) et la VO2max. La patate douce est préférée à la pomme de terre classique pour son index glycémique modéré (54 vs 78) et sa richesse en bêta-carotène, précurseur de la vitamine A pour la récupération oculaire en trail de nuit.',
  },
  HARD: {
    name: 'Récupération musculaire',
    description: 'Poulet 250g, riz complet, légumes sautés au wok, oeuf dur, sauce tamari',
    calories: 780,
    protein: 65,
    carbs: 75,
    fat: 18,
    brands: ['Bresse Bleu (blanc de poulet)', 'Priméal (riz semi-complet)', 'Kikkoman (sauce tamari)', 'Œufs Label Rouge'],
    performanceRationale: 'Après une séance intense, la fenêtre anabolique reste ouverte 4-6h. 65g de protéines distribuées sur ce repas et la collation post-effort couvrent le pic de synthèse protéique (MPS). Le riz complet reconstitue le glycogène musculaire à un rythme optimal de 1g/kg/h. La sauce tamari (sans gluten) apporte du sodium pour réhydrater les cellules musculaires.',
  },
  RACE: {
    name: 'Dîner récupération post-course',
    description: 'Pâtes blanches, boeuf mijoté, carottes, pain, yaourt grec au miel',
    calories: 850,
    protein: 55,
    carbs: 100,
    fat: 22,
    brands: ['Barilla (pâtes blanches n°5)', 'Charal (boeuf mijoté)', 'Materne (compote)', 'Fage (yaourt grec)', 'Allos (miel)'],
    performanceRationale: 'Premier repas post-course : priorité absolue aux glucides simples (pâtes blanches) pour reconstituer d\'urgence le glycogène épuisé. 100g de glucides dans les 2h post-arrivée permettent une resynthèse à hauteur de 150-200g de glycogène. Le boeuf mijoté est plus digestible que le steak grillé après l\'effort. Le yaourt grec au miel avant de dormir déclenche un dernier pic anabolique nocturne.',
  },
}

const PRE_WORKOUT: Record<DayLoad, string> = {
  REST: 'Pas de collation pré-effort nécessaire',
  EASY: '30-45min avant : 1 banane + quelques dattes + eau',
  MODERATE: '45min avant : 2 tranches pain complet + beurre de cacahuète + 1 banane',
  HARD: '60-90min avant : Riz blanc + miel + sel + 500ml eau avec électrolytes',
  RACE: '2h avant : Pain blanc + confiture + café + gel énergétique 15min avant départ',
}

const POST_WORKOUT: Record<DayLoad, string> = {
  REST: 'Fruits frais + fromage blanc = antioxydants + protéines légères',
  EASY: 'Dans les 30min : Smoothie banane-lait-protéine (20g protéine, 40g glucides)',
  MODERATE: 'Dans les 20min : Riz au lait + raisins secs OU pain grillé + thon',
  HARD: 'Immédiatement : Boisson de récupération (50g maltodextrine + 25g whey) puis repas solide 1h après',
  RACE: 'Dès l\'arrivée : Bouillon chaud, chips salées, cola. Puis repas complet dans les 2h.',
}

export function generateNutritionDay(date: string, load: DayLoad): NutritionDay {
  const calories = computeCalories(load)
  const macros = computeMacros(load, calories)
  const hydration = computeHydration(load)

  return {
    date,
    load,
    totalCalories: calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    hydrationLiters: hydration,
    breakfast: BREAKFASTS[load],
    lunch: LUNCHES[load],
    dinner: DINNERS[load],
    preWorkoutSnack: PRE_WORKOUT[load],
    postWorkoutSnack: POST_WORKOUT[load],
  }
}

export function inferDayLoad(sessions: { type: string; zone: string }[]): DayLoad {
  if (sessions.length === 0) return 'REST'
  const hasHard = sessions.some(s => s.zone === 'Z4' || s.zone === 'Z5')
  const hasModerate = sessions.some(s => s.zone === 'Z3')
  const isRace = sessions.some(s => s.type === 'RACE')
  if (isRace) return 'RACE'
  if (hasHard) return 'HARD'
  if (hasModerate) return 'MODERATE'
  if (sessions.some(s => s.type === 'R')) return 'EASY'
  return 'EASY'
}
