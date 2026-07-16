import { useMemo, useReducer } from 'react'
import {
  HABITATS,
  createGraphSeries,
  createNaturalSelectionResult,
  deriveSeed,
  type CerResponse,
  type ComparisonEvidenceReference,
  type HabitatId,
  type MorphId,
  type NaturalSelectionResult,
  type PlayerRoundMetrics,
  type PopulationEvidenceReference,
  type PredictionResponse,
  type SelectedTimingMode,
} from '../simulation/index.ts'
import { createMisconceptionQuestions, type HabitatOutcome } from '../learning/index.ts'
import { completedChecks, type CerDraft, type GameSession } from './sessionTypes.ts'
import { createFreshSession, sessionReducer } from './sessionReducer.ts'

const CLIENT_VERSION = '0.2.0'

function querySeed(): number | undefined {
  const params = new URLSearchParams(window.location.search)
  if (params.get('e2e') !== '1') return undefined
  const source = params.get('e2eSeed')
  if (!source) return undefined
  const numeric = Number(source)
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 0xffff_ffff) return numeric

  // Browser stories use readable seed labels. FNV-1a turns those labels into
  // stable unsigned seeds without adding a second random-number system.
  let hash = 0x811c_9dc5
  for (const character of source) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x0100_0193)
  }
  return hash >>> 0 || 1
}

function createInitialSession(): GameSession {
  return createFreshSession(querySeed())
}

function habitatOutcomes(session: GameSession): readonly HabitatOutcome[] {
  return (['reef_fish', 'bark_moths'] as const).map((habitatId) => ({
    habitatId,
    startingCounts: HABITATS[habitatId].initialCounts,
    endingCounts: session.habitats[habitatId].simulation.counts,
  }))
}

function requirePrediction(session: GameSession, habitatId: HabitatId): PredictionResponse {
  const prediction = session.predictions[habitatId]
  if (!prediction) throw new Error(`A ${habitatId} prediction is required.`)
  return prediction
}

function buildCompletedResult(session: GameSession, cer: CerDraft): NaturalSelectionResult {
  if (!session.selectedTimingMode) throw new Error('A timing mode is required.')
  if (!session.evidence.comparison) throw new Error('Comparison evidence is required.')
  if (!cer.claimId || cer.reasoning.trim().length === 0) {
    throw new Error('A supported claim and reasoning response are required.')
  }
  const checks = completedChecks(session)
  if (checks.length !== 4) throw new Error('All four science checks are required.')

  const evidence = {
    population: session.evidence.population,
    comparison: session.evidence.comparison,
  }
  const cerResponse: CerResponse = {
    claimId: cer.claimId,
    evidence: [...evidence.population, evidence.comparison],
    reasoning: cer.reasoning.trim(),
  }
  const attempts = session.performance.manualCaptures + session.performance.misses
  const accuracyPercent = attempts === 0
    ? 0
    : Math.round((session.performance.manualCaptures / attempts) * 100)

  return createNaturalSelectionResult({
    sessionId: session.sessionId,
    seed: session.seed,
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    selectedTimingMode: session.selectedTimingMode,
    predictions: {
      reef_fish: requirePrediction(session, 'reef_fish'),
      bark_moths: requirePrediction(session, 'bark_moths'),
    },
    habitats: {
      reef_fish: {
        habitatId: 'reef_fish',
        generations: session.habitats.reef_fish.simulation.history,
      },
      bark_moths: {
        habitatId: 'bark_moths',
        generations: session.habitats.bark_moths.simulation.history,
      },
    },
    misconceptionChecks: checks,
    evidence,
    cer: cerResponse,
    predatorPerformance: {
      ...session.performance,
      accuracyPercent,
    },
    scienceCompletion: {
      firstAttemptCorrect: checks.filter((check) => check.firstAttemptCorrect).length,
      questionCount: checks.length,
      evidenceComplete: true,
      cerComplete: true,
    },
    clientVersion: CLIENT_VERSION,
  })
}

export function useGameSession() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, createInitialSession)
  const currentHabitat = HABITATS[session.currentHabitatId]
  const currentSimulation = session.habitats[session.currentHabitatId].simulation
  const currentGeneration = currentSimulation.generation + 1
  const roundSeed = deriveSeed(
    session.seed,
    session.currentHabitatId,
    currentGeneration,
    'biology',
  )

  const graphPoints = useMemo(
    () => ({
      reef_fish: createGraphSeries(HABITATS.reef_fish, session.habitats.reef_fish.simulation.history),
      bark_moths: createGraphSeries(HABITATS.bark_moths, session.habitats.bark_moths.simulation.history),
    }),
    [session.habitats],
  )
  const outcomes = useMemo(() => habitatOutcomes(session), [session])
  const misconceptionQuestions = useMemo(
    () => createMisconceptionQuestions(outcomes),
    [outcomes],
  )

  return {
    session,
    currentHabitat,
    currentSimulation,
    currentGeneration,
    roundSeed,
    graphPoints,
    outcomes,
    misconceptionQuestions,
    begin: () => dispatch({ type: 'BEGIN' }),
    selectTiming: (timingMode: SelectedTimingMode) =>
      dispatch({ type: 'SELECT_TIMING', timingMode }),
    startPrediction: () => dispatch({ type: 'START_PREDICTION' }),
    submitPrediction: (outcome: MorphId | 'no_change', reason: string) =>
      dispatch({
        type: 'SUBMIT_PREDICTION',
        habitatId: session.currentHabitatId,
        prediction: { outcome, reason: reason.trim() },
      }),
    completeRound: (metrics: PlayerRoundMetrics) =>
      dispatch({ type: 'ROUND_COMPLETED', habitatId: session.currentHabitatId, metrics }),
    continueAfterReview: () => dispatch({ type: 'CONTINUE_AFTER_REVIEW' }),
    continueAfterHabitat: () => dispatch({ type: 'CONTINUE_AFTER_HABITAT' }),
    togglePopulationEvidence: (reference: PopulationEvidenceReference) =>
      dispatch({ type: 'TOGGLE_POPULATION_EVIDENCE', reference }),
    selectComparisonEvidence: (reference: ComparisonEvidenceReference) =>
      dispatch({ type: 'SELECT_COMPARISON_EVIDENCE', reference }),
    enterChecks: () => dispatch({ type: 'ENTER_CHECKS' }),
    answerCheck: (questionId: string, answerId: string, correct: boolean) =>
      dispatch({ type: 'ANSWER_CHECK', questionId, answerId, correct }),
    nextCheck: () => dispatch({ type: 'NEXT_CHECK' }),
    updateCer: (cer: CerDraft) => dispatch({ type: 'UPDATE_CER', cer }),
    completeCer: (cer: CerDraft) => {
      const updated = { ...session, cer }
      dispatch({ type: 'UPDATE_CER', cer })
      dispatch({ type: 'COMPLETE', result: buildCompletedResult(updated, cer) })
    },
    restore: (restored: GameSession) => dispatch({ type: 'RESTORE', session: restored }),
    replay: () => dispatch({ type: 'REPLAY', session: createFreshSession() }),
  }
}
