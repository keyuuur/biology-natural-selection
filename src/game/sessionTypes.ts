import type {
  ComparisonEvidenceReference,
  HabitatId,
  MisconceptionCheckResult,
  NaturalSelectionResult,
  PopulationEvidenceReference,
  PredictionResponse,
  SelectedTimingMode,
  SimulationState,
} from '../simulation/index.ts'

export type GameStage =
  | 'mission'
  | 'timing'
  | 'habitat_intro'
  | 'prediction'
  | 'round'
  | 'generation_review'
  | 'habitat_summary'
  | 'evidence'
  | 'checks'
  | 'cer'
  | 'results'

/**
 * The selected way a student gathers predation evidence for this study.
 * Observation is a complete science route, not a renderer-failure state.
 */
export type StudyRoute = 'predator' | 'observation'

export type HabitatProgress = {
  simulation: SimulationState
}

export type EvidenceDraft = {
  population: readonly PopulationEvidenceReference[]
  comparison: ComparisonEvidenceReference | null
}

export type CheckAttemptDraft = {
  questionId: string
  firstAnswerId: string | null
  firstAttemptCorrect: boolean | null
  finalAnswerId: string | null
  attempts: number
}

export type CerDraft = {
  claimId: string | null
  reasoning: string
}

export type PerformanceDraft = {
  manualCaptures: number
  misses: number
  protectedEscapes: number
  points: number
}

export type GameSession = {
  sessionId: string
  seed: number
  startedAt: string
  stage: GameStage
  studyRoute: StudyRoute | null
  selectedTimingMode: SelectedTimingMode | null
  currentHabitatId: HabitatId
  habitats: Readonly<Record<HabitatId, HabitatProgress>>
  predictions: Readonly<Record<HabitatId, PredictionResponse | null>>
  evidence: EvidenceDraft
  misconceptionChecks: readonly CheckAttemptDraft[]
  currentCheckIndex: number
  cer: CerDraft
  performance: PerformanceDraft
  completedResult: NaturalSelectionResult | null
}

export const SESSION_DRAFT_SCHEMA_VERSION = '2.1' as const
export const LEGACY_SESSION_DRAFT_SCHEMA_VERSION = '2.0' as const

export type SessionDraftEnvelope = {
  schemaVersion: typeof SESSION_DRAFT_SCHEMA_VERSION
  savedAt: string
  session: GameSession
}

export type LegacySessionDraftEnvelope = {
  schemaVersion: typeof LEGACY_SESSION_DRAFT_SCHEMA_VERSION
  savedAt: string
  session: Omit<GameSession, 'studyRoute'>
}

export type DraftLoadResult =
  | { status: 'none' }
  | { status: 'valid'; draft: SessionDraftEnvelope }
  | { status: 'discarded'; message: string }
  | { status: 'unavailable'; message: string }

export function completedChecks(session: GameSession): readonly MisconceptionCheckResult[] {
  return session.misconceptionChecks
    .filter(
      (check): check is CheckAttemptDraft & {
        firstAnswerId: string
        firstAttemptCorrect: boolean
        finalAnswerId: string
      } =>
        check.firstAnswerId !== null &&
        check.firstAttemptCorrect !== null &&
        check.finalAnswerId !== null,
    )
    .map((check) => ({
      questionId: check.questionId,
      firstAnswerId: check.firstAnswerId,
      firstAttemptCorrect: check.firstAttemptCorrect,
      finalAnswerId: check.finalAnswerId,
      attempts: check.attempts,
    }))
}
