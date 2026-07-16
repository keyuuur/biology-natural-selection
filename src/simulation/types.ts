export const MORPH_IDS = ['camouflaged', 'conspicuous'] as const
export const HABITAT_IDS = ['reef_fish', 'bark_moths'] as const

export type MorphId = (typeof MORPH_IDS)[number]
export type HabitatId = (typeof HABITAT_IDS)[number]
export type SelectedTimingMode = 'standard' | 'extended'
export type RoundInputMode = 'interactive' | 'observation'

export type MorphCounts = Readonly<Record<MorphId, number>>
export type MorphFrequencies = Readonly<Record<MorphId, number>>
export type MorphPercentages = Readonly<Record<MorphId, number>>

export interface HabitatCopy {
  readonly title: string
  readonly shortTitle: string
  readonly organismSingular: string
  readonly organismPlural: string
  readonly environment: string
  readonly variationPrompt: string
  readonly predictionPrompt: string
}

export interface TimingConfig {
  readonly durationMs: number
  readonly movementScale: number
  readonly hitAreaScale: number
}

export interface HabitatConfig {
  readonly id: HabitatId
  readonly populationSize: number
  readonly generationCount: number
  readonly predationSlots: number
  readonly minSurvivorsPerMorph: number
  readonly minOffspringPerMorph: number
  readonly maxOffspringPerMorph: number
  readonly pointsPerManualCapture: number
  readonly initialCounts: MorphCounts
  readonly visibilityWeights: Readonly<Record<MorphId, number>>
  readonly morphLabels: Readonly<Record<MorphId, string>>
  readonly timing: Readonly<Record<SelectedTimingMode, TimingConfig>>
  readonly copy: HabitatCopy
}

export interface PlayerRoundMetrics {
  /** Base seed for this habitat/generation round. */
  readonly seed: number
  readonly manualCatches: MorphCounts
  readonly misses: number
  /** Taps that became visible escapes because that morph reached its parent floor. */
  readonly protectedEscapes: number
  readonly elapsedMs: number
  readonly timingMode: SelectedTimingMode
  readonly inputMode: RoundInputMode
  readonly fallbackUsed: boolean
}

export interface PredationResult {
  readonly manualCatches: MorphCounts
  readonly automaticCatches: MorphCounts
  readonly survivorCounts: MorphCounts
}

export interface GenerationResult {
  readonly habitatId: HabitatId
  readonly generation: number
  readonly seed: number
  readonly startingCounts: MorphCounts
  readonly manualCatches: MorphCounts
  readonly automaticCatches: MorphCounts
  readonly protectedEscapes: number
  readonly survivorCounts: MorphCounts
  readonly offspringCounts: MorphCounts
  readonly endingCounts: MorphCounts
  readonly startingFrequencies: MorphFrequencies
  readonly endingFrequencies: MorphFrequencies
  readonly startingPercentages: MorphPercentages
  readonly endingPercentages: MorphPercentages
  readonly misses: number
  readonly elapsedMs: number
  readonly timingMode: SelectedTimingMode
  readonly inputMode: RoundInputMode
  readonly fallbackUsed: boolean
  readonly predatorPoints: number
}

export interface SimulationState {
  readonly habitatId: HabitatId
  readonly generation: number
  readonly counts: MorphCounts
  readonly history: readonly GenerationResult[]
}

export interface RunGenerationResult {
  readonly nextState: SimulationState
  readonly result: GenerationResult
}

export interface PopulationGraphPoint {
  readonly habitatId: HabitatId
  readonly generation: number
  readonly counts: MorphCounts
  readonly frequencies: MorphFrequencies
  readonly percentages: MorphPercentages
}

export type PredictedOutcome = MorphId | 'no_change'

export interface PredictionResponse {
  readonly outcome: PredictedOutcome
  readonly reason: string
}

export interface HabitatExperimentResult {
  readonly habitatId: HabitatId
  readonly generations: readonly GenerationResult[]
}

export interface MisconceptionCheckResult {
  readonly questionId: string
  readonly firstAnswerId: string
  readonly firstAttemptCorrect: boolean
  readonly finalAnswerId: string
  readonly attempts: number
}

export interface PopulationEvidenceReference {
  readonly kind: 'population'
  readonly habitatId: HabitatId
  readonly generation: number
}

export interface ComparisonEvidenceReference {
  readonly kind: 'comparison'
  readonly habitatId: HabitatId
  readonly generation: number
}

export type EvidenceReference =
  | PopulationEvidenceReference
  | ComparisonEvidenceReference

export interface EvidenceSelection {
  readonly population: readonly PopulationEvidenceReference[]
  readonly comparison: ComparisonEvidenceReference
}

export interface CerResponse {
  readonly claimId: string
  readonly evidence: readonly EvidenceReference[]
  readonly reasoning: string
}

export interface PredatorPerformance {
  readonly manualCaptures: number
  readonly misses: number
  readonly protectedEscapes: number
  readonly points: number
  readonly accuracyPercent: number
}

export interface ScienceCompletion {
  readonly firstAttemptCorrect: number
  readonly questionCount: number
  readonly evidenceComplete: boolean
  readonly cerComplete: boolean
}

export const RESULT_SCHEMA_VERSION = '2.0' as const

export interface NaturalSelectionResult {
  readonly schemaVersion: typeof RESULT_SCHEMA_VERSION
  readonly sessionId: string
  readonly seed: number
  readonly startedAt: string
  readonly completedAt: string
  readonly selectedTimingMode: SelectedTimingMode
  readonly predictions: Readonly<Record<HabitatId, PredictionResponse>>
  readonly habitats: Readonly<Record<HabitatId, HabitatExperimentResult>>
  readonly misconceptionChecks: readonly MisconceptionCheckResult[]
  readonly evidence: EvidenceSelection
  readonly cer: CerResponse
  readonly predatorPerformance: PredatorPerformance
  readonly scienceCompletion: ScienceCompletion
  readonly clientVersion: string
}

export type RandomSource = () => number
