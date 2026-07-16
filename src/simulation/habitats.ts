import type {
  HabitatConfig,
  HabitatId,
  SimulationState,
} from './types.ts'
import { validateHabitatConfig } from './generationRunner.ts'

const SHARED_RULES = {
  populationSize: 40,
  generationCount: 3,
  predationSlots: 12,
  minSurvivorsPerMorph: 3,
  minOffspringPerMorph: 4,
  maxOffspringPerMorph: 36,
  pointsPerManualCapture: 10,
  initialCounts: {
    camouflaged: 20,
    conspicuous: 20,
  },
  visibilityWeights: {
    camouflaged: 1,
    conspicuous: 3,
  },
  timing: {
    standard: {
      durationMs: 25_000,
      movementScale: 1,
      hitAreaScale: 1,
    },
    extended: {
      durationMs: 40_000,
      movementScale: 0.75,
      hitAreaScale: 1.2,
    },
  },
} as const

export const REEF_FISH_HABITAT = {
  ...SHARED_RULES,
  id: 'reef_fish',
  morphLabels: {
    camouflaged: 'Camouflaged reef fish',
    conspicuous: 'Conspicuous reef fish',
  },
  copy: {
    title: 'Reef Fish Study',
    shortTitle: 'Reef fish',
    organismSingular: 'fish',
    organismPlural: 'fish',
    environment: 'a patterned coral reef',
    variationPrompt:
      'The population already contains inherited camouflage variation.',
    predictionPrompt:
      'Which inherited morph will become a larger percentage of this fish population?',
  },
} as const satisfies HabitatConfig

export const BARK_MOTH_HABITAT = {
  ...SHARED_RULES,
  id: 'bark_moths',
  morphLabels: {
    camouflaged: 'Camouflaged bark moths',
    conspicuous: 'Conspicuous bark moths',
  },
  copy: {
    title: 'Bark Moth Study',
    shortTitle: 'Bark moths',
    organismSingular: 'moth',
    organismPlural: 'moths',
    environment: 'patterned tree bark',
    variationPrompt:
      'The population already contains inherited camouflage variation.',
    predictionPrompt:
      'Which inherited morph will become a larger percentage of this moth population?',
  },
} as const satisfies HabitatConfig

export const HABITATS: Readonly<Record<HabitatId, HabitatConfig>> = {
  reef_fish: REEF_FISH_HABITAT,
  bark_moths: BARK_MOTH_HABITAT,
}

export function createInitialState(habitat: HabitatConfig): SimulationState {
  validateHabitatConfig(habitat)
  return {
    habitatId: habitat.id,
    generation: 0,
    counts: { ...habitat.initialCounts },
    history: [],
  }
}
