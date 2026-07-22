import {
  BARK_MOTH_HABITAT,
  HABITATS,
  REEF_FISH_HABITAT,
  createInitialState,
  runGeneration,
  type ComparisonEvidenceReference,
  type HabitatId,
  type NaturalSelectionResult,
  type PlayerRoundMetrics,
  type PopulationEvidenceReference,
  type PredictionResponse,
  type SelectedTimingMode,
} from '../simulation/index.ts'
import type { CerDraft, GameSession, StudyRoute } from './sessionTypes.ts'

export type SessionAction =
  | { type: 'BEGIN' }
  | { type: 'SELECT_TIMING'; timingMode: SelectedTimingMode }
  | { type: 'START_STUDY'; studyRoute: StudyRoute; timingMode?: SelectedTimingMode }
  | { type: 'START_PREDICTION' }
  | { type: 'SUBMIT_PREDICTION'; habitatId: HabitatId; prediction: PredictionResponse }
  | { type: 'ROUND_COMPLETED'; habitatId: HabitatId; metrics: PlayerRoundMetrics }
  | { type: 'CONTINUE_AFTER_REVIEW' }
  | { type: 'CONTINUE_AFTER_HABITAT' }
  | { type: 'TOGGLE_POPULATION_EVIDENCE'; reference: PopulationEvidenceReference }
  | { type: 'SELECT_COMPARISON_EVIDENCE'; reference: ComparisonEvidenceReference }
  | { type: 'ENTER_CHECKS' }
  | { type: 'ANSWER_CHECK'; questionId: string; answerId: string; correct: boolean }
  | { type: 'NEXT_CHECK' }
  | { type: 'UPDATE_CER'; cer: CerDraft }
  | { type: 'COMPLETE'; result: NaturalSelectionResult }
  | { type: 'RESTORE'; session: GameSession }
  | { type: 'REPLAY'; session: GameSession }

function randomSeed(): number {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] || 1
}

function createSessionId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return `session-${Date.now()}-${randomSeed().toString(16)}`
}

export function createFreshSession(seed = randomSeed()): GameSession {
  return {
    sessionId: createSessionId(),
    seed,
    startedAt: new Date().toISOString(),
    stage: 'mission',
    studyRoute: null,
    selectedTimingMode: null,
    currentHabitatId: 'reef_fish',
    habitats: {
      reef_fish: { simulation: createInitialState(REEF_FISH_HABITAT) },
      bark_moths: { simulation: createInitialState(BARK_MOTH_HABITAT) },
    },
    predictions: { reef_fish: null, bark_moths: null },
    evidence: { population: [], comparison: null },
    misconceptionChecks: [],
    currentCheckIndex: 0,
    cer: { claimId: null, reasoning: '' },
    performance: { manualCaptures: 0, misses: 0, protectedEscapes: 0, points: 0 },
    completedResult: null,
  }
}

function samePopulationReference(
  left: PopulationEvidenceReference,
  right: PopulationEvidenceReference,
): boolean {
  return left.habitatId === right.habitatId && left.generation === right.generation
}

function evidenceComplete(session: GameSession): boolean {
  const required: PopulationEvidenceReference[] = [
    { kind: 'population', habitatId: 'reef_fish', generation: 0 },
    { kind: 'population', habitatId: 'reef_fish', generation: 3 },
    { kind: 'population', habitatId: 'bark_moths', generation: 0 },
    { kind: 'population', habitatId: 'bark_moths', generation: 3 },
  ]
  return (
    required.every((reference) =>
      session.evidence.population.some((selected) => samePopulationReference(selected, reference)),
    ) && session.evidence.comparison !== null
  )
}

export function sessionReducer(session: GameSession, action: SessionAction): GameSession {
  switch (action.type) {
    case 'BEGIN':
      return session.stage === 'mission' ? { ...session, stage: 'timing' } : session
    case 'SELECT_TIMING':
      return session.stage === 'mission' || session.stage === 'timing'
        ? {
            ...session,
            studyRoute: 'predator',
            selectedTimingMode: action.timingMode,
            stage: 'prediction',
          }
        : session
    case 'START_STUDY':
      if (session.stage !== 'mission') return session
      if (action.studyRoute === 'predator') {
        if (!action.timingMode) return session
        return {
          ...session,
          studyRoute: 'predator',
          selectedTimingMode: action.timingMode,
          stage: 'prediction',
        }
      }
      return {
        ...session,
        studyRoute: 'observation',
        selectedTimingMode: 'standard',
        stage: 'prediction',
      }
    case 'START_PREDICTION':
      return session.stage === 'habitat_intro' ? { ...session, stage: 'prediction' } : session
    case 'SUBMIT_PREDICTION':
      if (session.stage !== 'prediction' || session.currentHabitatId !== action.habitatId) return session
      return {
        ...session,
        predictions: { ...session.predictions, [action.habitatId]: action.prediction },
        stage: 'round',
      }
    case 'ROUND_COMPLETED': {
      if (session.stage !== 'round' || session.currentHabitatId !== action.habitatId) return session
      const habitat = HABITATS[action.habitatId]
      const currentProgress = session.habitats[action.habitatId]
      const { nextState } = runGeneration(currentProgress.simulation, action.metrics, habitat)
      const manualCaptures =
        action.metrics.manualCatches.camouflaged + action.metrics.manualCatches.conspicuous
      return {
        ...session,
        habitats: {
          ...session.habitats,
          [action.habitatId]: { simulation: nextState },
        },
        performance: {
          manualCaptures: session.performance.manualCaptures + manualCaptures,
          misses: session.performance.misses + action.metrics.misses,
          protectedEscapes:
            session.performance.protectedEscapes + action.metrics.protectedEscapes,
          points: session.performance.points + manualCaptures * habitat.pointsPerManualCapture,
        },
        stage: 'generation_review',
      }
    }
    case 'CONTINUE_AFTER_REVIEW': {
      if (session.stage !== 'generation_review') return session
      const progress = session.habitats[session.currentHabitatId]
      const habitat = HABITATS[session.currentHabitatId]
      return {
        ...session,
        stage: progress.simulation.generation < habitat.generationCount ? 'round' : 'habitat_summary',
      }
    }
    case 'CONTINUE_AFTER_HABITAT':
      if (session.stage !== 'habitat_summary') return session
      if (session.currentHabitatId === 'reef_fish') {
        return { ...session, currentHabitatId: 'bark_moths', stage: 'prediction' }
      }
      return { ...session, stage: 'evidence' }
    case 'TOGGLE_POPULATION_EVIDENCE': {
      if (session.stage !== 'evidence') return session
      const selected = session.evidence.population.some((item) =>
        samePopulationReference(item, action.reference),
      )
      return {
        ...session,
        evidence: {
          ...session.evidence,
          population: selected
            ? session.evidence.population.filter(
                (item) => !samePopulationReference(item, action.reference),
              )
            : [...session.evidence.population, action.reference],
        },
      }
    }
    case 'SELECT_COMPARISON_EVIDENCE':
      return session.stage === 'evidence'
        ? { ...session, evidence: { ...session.evidence, comparison: action.reference } }
        : session
    case 'ENTER_CHECKS':
      return session.stage === 'evidence' && evidenceComplete(session)
        ? { ...session, stage: 'checks', currentCheckIndex: 0 }
        : session
    case 'ANSWER_CHECK': {
      if (session.stage !== 'checks') return session
      const existingIndex = session.misconceptionChecks.findIndex(
        (check) => check.questionId === action.questionId,
      )
      if (existingIndex === -1) {
        return {
          ...session,
          misconceptionChecks: [
            ...session.misconceptionChecks,
            {
              questionId: action.questionId,
              firstAnswerId: action.answerId,
              firstAttemptCorrect: action.correct,
              finalAnswerId: action.correct ? action.answerId : null,
              attempts: 1,
            },
          ],
        }
      }
      const checks = [...session.misconceptionChecks]
      const existing = checks[existingIndex]
      checks[existingIndex] = {
        ...existing,
        finalAnswerId: action.correct ? action.answerId : existing.finalAnswerId,
        attempts: existing.attempts + 1,
      }
      return { ...session, misconceptionChecks: checks }
    }
    case 'NEXT_CHECK': {
      if (session.stage !== 'checks') return session
      const current = session.misconceptionChecks[session.currentCheckIndex]
      if (!current?.finalAnswerId) return session
      return session.currentCheckIndex >= 3
        ? { ...session, stage: 'cer' }
        : { ...session, currentCheckIndex: session.currentCheckIndex + 1 }
    }
    case 'UPDATE_CER':
      return session.stage === 'cer' ? { ...session, cer: action.cer } : session
    case 'COMPLETE':
      return session.stage === 'cer'
        ? { ...session, completedResult: action.result, stage: 'results' }
        : session
    case 'RESTORE':
    case 'REPLAY':
      return action.session
    default:
      return session
  }
}
