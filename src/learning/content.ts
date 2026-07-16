import type { HabitatId, MorphId } from '../simulation/types.ts'

export interface HabitatStudentCopy {
  readonly title: string
  readonly organismLabel: string
  readonly inheritedTrait: string
  readonly mission: string
  readonly variationPrompt: string
  readonly predictionPrompt: string
  readonly predatorDirections: string
  readonly selectionPressure: string
  readonly generationTransition: string
  readonly morphLabels: Readonly<Record<MorphId, string>>
}

export const HABITAT_STUDENT_COPY: Readonly<Record<HabitatId, HabitatStudentCopy>> = {
  reef_fish: {
    title: 'Reef fish visibility study',
    organismLabel: 'reef fish',
    inheritedTrait: 'body color and pattern',
    mission:
      'Act as a reef predator. Track how inherited fish patterns affect which fish survive, reproduce, and appear in the next generation.',
    variationPrompt:
      'This population already contains fish with two inherited body patterns. Neither pattern appeared because a fish needed it.',
    predictionPrompt:
      'Which inherited fish pattern do you predict will make up a larger percentage of Generation 3? Use the reef background in your reason.',
    predatorDirections:
      'Tap the fish you notice first. Do not hunt for a particular pattern. Each accepted capture represents predation before reproduction.',
    selectionPressure:
      'Predation is the environmental pressure. Fish that are detected and caught do not reproduce in this generation.',
    generationTransition:
      'Start with 40 fish. Twelve are caught, 28 survive and reproduce, and their offspring form the next population of 40.',
    morphLabels: {
      camouflaged: 'reef-matched pattern',
      conspicuous: 'high-contrast pattern',
    },
  },
  bark_moths: {
    title: 'Bark moth visibility study',
    organismLabel: 'bark moths',
    inheritedTrait: 'wing color and pattern',
    mission:
      'Act as a bird searching tree bark. Track how inherited moth patterns affect which moths survive, reproduce, and appear in the next generation.',
    variationPrompt:
      'This population already contains moths with two inherited wing patterns. The bark does not create a new pattern in an individual moth.',
    predictionPrompt:
      'Which inherited moth pattern do you predict will make up a larger percentage of Generation 3? Use the bark background in your reason.',
    predatorDirections:
      'Tap the moths you notice first. Do not hunt for a particular pattern. Each accepted capture represents predation before reproduction.',
    selectionPressure:
      'Predation is the environmental pressure. Moths that are detected and caught do not reproduce in this generation.',
    generationTransition:
      'Start with 40 moths. Twelve are caught, 28 survive and reproduce, and their offspring form the next population of 40.',
    morphLabels: {
      camouflaged: 'mottled bark pattern',
      conspicuous: 'solid light pattern',
    },
  },
}

export const MODEL_SAFEGUARD_DISCLOSURES = {
  fixedPopulation:
    'This classroom model returns every generation to 40 organisms so percentages are easy to compare. Real population sizes do not always stay constant.',
  comparisonFloor:
    'This classroom model keeps at least three surviving parents and at least four offspring of each inherited pattern so you can compare both patterns. In real populations, a variation can disappear.',
  protectedEscape:
    'When only three parents of a pattern remain, another tap makes that organism escape into cover. An escape is not a capture or a miss.',
  automaticCompletion:
    'If you make fewer than 12 accepted captures, the computer completes the remaining predation events using the model\'s visibility settings. Modeled captures change the population but do not add predator points.',
  modelBoundary:
    'The same seed gives the same modeled result, but this activity does not claim that nature always follows one exact sequence.',
} as const

export const GENERATION_CAUSAL_CHAIN =
  'Existing inherited variation -> environmental predation -> unequal survival and reproduction -> inherited offspring patterns -> a change in each pattern\'s percentage of the population.'
