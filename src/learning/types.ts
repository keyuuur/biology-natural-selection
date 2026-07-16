import type { HabitatId, MorphCounts } from '../simulation/types.ts'

export type PopulationCounts = MorphCounts

export interface HabitatOutcome {
  readonly habitatId: HabitatId
  readonly startingCounts: PopulationCounts
  readonly endingCounts: PopulationCounts
}

export interface GenerationEvidenceInput {
  readonly habitatId: HabitatId
  readonly generation: number
  readonly startingCounts: PopulationCounts
  readonly manualCatches: PopulationCounts
  readonly automaticCatches: PopulationCounts
  /** Optional because graph/evidence adapters may not retain interaction metrics. */
  readonly protectedEscapes?: number
  readonly survivorCounts: PopulationCounts
  readonly offspringCounts: PopulationCounts
}

export interface FeedbackChoice {
  readonly id: string
  readonly text: string
  readonly isCorrect: boolean
  readonly feedback: string
}

export interface MisconceptionQuestionConfig {
  readonly id:
    | 'environmental-pressure'
    | 'population-change'
    | 'fitness'
    | 'changed-environment'
  readonly prompt: string
  readonly choices: readonly FeedbackChoice[]
}

export interface CerClaimChoice {
  readonly id: string
  readonly text: string
  readonly isSupported: boolean
  readonly feedback: string
}
