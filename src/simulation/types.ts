export const TRAIT_IDS = ['higher_speed', 'lower_speed'] as const

export type TraitId = (typeof TRAIT_IDS)[number]

export type TraitCounts = Readonly<Record<TraitId, number>>

export type TraitFrequencies = Readonly<Record<TraitId, number>>

export type TraitPercentages = Readonly<Record<TraitId, number>>

export interface ScenarioCopy {
  readonly missionTitle: string
  readonly mission: string
  readonly variationPrompt: string
  readonly selectionPressure: string
  readonly misconceptionReminder: string
}

export interface ScenarioConfig {
  readonly id: string
  readonly populationSize: number
  readonly generationCount: number
  readonly feedingSlots: number
  readonly initialCounts: TraitCounts
  readonly fitnessWeights: Readonly<Record<TraitId, number>>
  readonly traitLabels: Readonly<Record<TraitId, string>>
  readonly copy: ScenarioCopy
}

export interface GenerationResult {
  readonly generation: number
  readonly startingCounts: TraitCounts
  readonly survivorCounts: TraitCounts
  readonly offspringCounts: TraitCounts
  readonly endingCounts: TraitCounts
  readonly startingFrequencies: TraitFrequencies
  readonly endingFrequencies: TraitFrequencies
}

export interface SimulationState {
  readonly scenarioId: string
  readonly generation: number
  readonly counts: TraitCounts
  readonly history: readonly GenerationResult[]
}

export interface TraitGraphPoint {
  readonly generation: number
  readonly counts: TraitCounts
  readonly frequencies: TraitFrequencies
  readonly percentages: TraitPercentages
}

export interface MisconceptionResponse {
  readonly selectedAnswer: string
  readonly isCorrect: boolean
}

export type PredictedOutcome = TraitId | 'no_change'

export interface PredictionResponse {
  readonly trait: PredictedOutcome | null
  readonly reason: string
}

export interface CerResponse {
  readonly claim: string
  readonly evidence: readonly string[]
  readonly reasoning: string
}

export type CompletionState = 'draft' | 'complete'

export const RESULT_SCHEMA_VERSION = '1.0' as const

export interface NaturalSelectionResult {
  readonly schemaVersion: typeof RESULT_SCHEMA_VERSION
  readonly sessionId: string
  readonly startedAt: string
  readonly completedAt: string | null
  readonly scenarioId: string
  readonly prediction: PredictionResponse
  readonly generations: readonly GenerationResult[]
  readonly misconceptionResponse: MisconceptionResponse | null
  readonly cer: CerResponse
  readonly completionState: CompletionState
  readonly clientVersion: string
}

export interface ResultSaver {
  save(result: NaturalSelectionResult): Promise<void>
}
