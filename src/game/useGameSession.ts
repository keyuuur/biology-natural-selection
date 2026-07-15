import { useCallback, useMemo, useState } from 'react'
import {
  DEFAULT_SCENARIO,
  createGraphSeries,
  createInitialState,
  createNaturalSelectionResult,
  runGeneration,
  type NaturalSelectionResult,
  type PredictedOutcome,
  type PredictionResponse,
  type SimulationState,
  type TraitId,
} from '../simulation/index.ts'
import type {
  CerDraft,
  GameSession,
  PreparedGeneration,
} from './sessionTypes.ts'

const CLIENT_VERSION = '0.1.0'

const TRAIT_NAMES: Record<TraitId, string> = {
  higher_speed: 'higher-speed',
  lower_speed: 'lower-speed',
}

function createSessionId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createFreshSession(): GameSession {
  return {
    sessionId: createSessionId(),
    startedAt: new Date().toISOString(),
    stage: 'mission',
    simulation: createInitialState(DEFAULT_SCENARIO),
    prediction: { trait: null, reason: '' },
    misconceptionResponse: null,
    evidence: { generationIds: [], survivorGeneration: null },
    cer: { claim: null, reasoning: '' },
    completedResult: null,
  }
}

function generationEvidence(session: GameSession): string[] {
  const graphPoints = createGraphSeries(
    DEFAULT_SCENARIO.initialCounts,
    session.simulation.history,
  )
  const selectedPoints = session.evidence.generationIds
    .map((generation) => graphPoints.find((point) => point.generation === generation))
    .filter((point) => point !== undefined)
    .map(
      (point) =>
        `Generation ${point.generation}: ${point.counts.higher_speed}/20 (${point.percentages.higher_speed}%) higher-speed and ${point.counts.lower_speed}/20 (${point.percentages.lower_speed}%) lower-speed.`,
    )

  const survivorResult = session.simulation.history.find(
    (result) => result.generation === session.evidence.survivorGeneration,
  )
  if (survivorResult) {
    const higherPercent = Math.round(
      (survivorResult.survivorCounts.higher_speed /
        survivorResult.startingCounts.higher_speed) *
        100,
    )
    const lowerPercent = Math.round(
      (survivorResult.survivorCounts.lower_speed /
        survivorResult.startingCounts.lower_speed) *
        100,
    )
    selectedPoints.push(
      `Generation ${survivorResult.generation}: ${survivorResult.survivorCounts.higher_speed}/${survivorResult.startingCounts.higher_speed} (${higherPercent}%) higher-speed deer reached enough food, compared with ${survivorResult.survivorCounts.lower_speed}/${survivorResult.startingCounts.lower_speed} (${lowerPercent}%) lower-speed deer.`,
    )
  }

  return selectedPoints
}

function claimText(claim: TraitId | null): string {
  if (!claim) return ''
  return `In this environment, the ${TRAIT_NAMES[claim]} movement trait became more common.`
}

export function buildSessionResult(
  session: GameSession,
  completionState: 'draft' | 'complete',
): NaturalSelectionResult {
  return createNaturalSelectionResult({
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    completedAt: completionState === 'complete' ? new Date().toISOString() : null,
    scenarioId: DEFAULT_SCENARIO.id,
    prediction: session.prediction,
    generations: session.simulation.history,
    misconceptionResponse: session.misconceptionResponse,
    cer: {
      claim: claimText(session.cer.claim),
      evidence: generationEvidence(session),
      reasoning: session.cer.reasoning,
    },
    completionState,
    clientVersion: CLIENT_VERSION,
  })
}

export function useGameSession() {
  const [session, setSession] = useState<GameSession>(createFreshSession)

  const graphPoints = useMemo(
    () =>
      createGraphSeries(
        DEFAULT_SCENARIO.initialCounts,
        session.simulation.history,
      ),
    [session.simulation.history],
  )

  const enterObserve = useCallback(() => {
    setSession((current) => ({ ...current, stage: 'observe' }))
  }, [])

  const enterPrediction = useCallback(() => {
    setSession((current) => ({ ...current, stage: 'prediction' }))
  }, [])

  const commitPrediction = useCallback(
    (trait: PredictedOutcome, reason: string) => {
      const prediction: PredictionResponse = { trait, reason: reason.trim() }
      setSession((current) => ({
        ...current,
        prediction,
        stage: 'generations',
      }))
    },
    [],
  )

  const prepareGeneration = useCallback((): PreparedGeneration => {
    const nextState = runGeneration(session.simulation, DEFAULT_SCENARIO)
    const result = nextState.history.at(-1)
    if (!result) throw new Error('The generation result was not created.')
    return { nextState, result }
  }, [session.simulation])

  const commitGeneration = useCallback((nextState: SimulationState) => {
    setSession((current) => ({
      ...current,
      simulation: nextState,
      stage:
        nextState.generation === DEFAULT_SCENARIO.generationCount
          ? 'misconception'
          : 'generations',
    }))
  }, [])

  const answerMisconception = useCallback(
    (selectedAnswer: string, isCorrect: boolean) => {
      setSession((current) => ({
        ...current,
        misconceptionResponse: { selectedAnswer, isCorrect },
      }))
    },
    [],
  )

  const enterEvidence = useCallback(() => {
    setSession((current) => {
      if (!current.misconceptionResponse?.isCorrect) return current
      return { ...current, stage: 'evidence' }
    })
  }, [])

  const toggleEvidenceGeneration = useCallback((generation: number) => {
    setSession((current) => {
      const selected = new Set(current.evidence.generationIds)
      if (selected.has(generation)) selected.delete(generation)
      else selected.add(generation)
      return {
        ...current,
        evidence: {
          ...current.evidence,
          generationIds: [...selected].sort((left, right) => left - right),
        },
      }
    })
  }, [])

  const selectSurvivorGeneration = useCallback((generation: number) => {
    setSession((current) => ({
      ...current,
      evidence: { ...current.evidence, survivorGeneration: generation },
    }))
  }, [])

  const enterCer = useCallback(() => {
    setSession((current) => {
      const hasRequiredPoints =
        current.evidence.generationIds.includes(0) &&
        current.evidence.generationIds.includes(5)
      if (!hasRequiredPoints || current.evidence.survivorGeneration === null) {
        return current
      }
      return { ...current, stage: 'cer' }
    })
  }, [])

  const completeCer = useCallback((cer: CerDraft) => {
    setSession((current) => {
      const updated: GameSession = { ...current, cer }
      const completedResult = buildSessionResult(updated, 'complete')
      return { ...updated, completedResult, stage: 'results' }
    })
  }, [])

  const replay = useCallback(() => setSession(createFreshSession()), [])

  return {
    session,
    graphPoints,
    evidenceTexts: generationEvidence(session),
    enterObserve,
    enterPrediction,
    commitPrediction,
    prepareGeneration,
    commitGeneration,
    answerMisconception,
    enterEvidence,
    toggleEvidenceGeneration,
    selectSurvivorGeneration,
    enterCer,
    completeCer,
    replay,
  }
}
