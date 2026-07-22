import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PlayerRoundMetrics } from '../simulation/index.ts'
import { useGameSession } from './useGameSession.ts'

function observationRound(seed: number): PlayerRoundMetrics {
  return {
    seed,
    manualCatches: { camouflaged: 0, conspicuous: 0 },
    misses: 0,
    protectedEscapes: 0,
    elapsedMs: 25_000,
    timingMode: 'standard',
    inputMode: 'observation',
    fallbackUsed: true,
  }
}

function completeCurrentHabitat(
  result: ReturnType<typeof renderHook<ReturnType<typeof useGameSession>, unknown>>['result'],
  metricsForGeneration: (generation: number, seed: number) => PlayerRoundMetrics =
    (_generation, seed) => observationRound(seed),
) {
  for (let generation = 1; generation <= 3; generation += 1) {
    expect(result.current.session.stage).toBe('round')
    act(() => result.current.completeRound(metricsForGeneration(generation, result.current.roundSeed)))
    expect(result.current.session.stage).toBe('generation_review')
    expect(result.current.currentSimulation.generation).toBe(generation)
    act(() => result.current.continueAfterReview())
  }
  expect(result.current.session.stage).toBe('habitat_summary')
}

function selectRequiredEvidence(
  result: ReturnType<typeof renderHook<ReturnType<typeof useGameSession>, unknown>>['result'],
) {
  for (const [habitatId, generation] of [
    ['reef_fish', 0],
    ['reef_fish', 3],
    ['bark_moths', 0],
    ['bark_moths', 3],
  ] as const) {
    act(() =>
      result.current.togglePopulationEvidence({
        kind: 'population',
        habitatId,
        generation,
      }),
    )
  }
  act(() =>
    result.current.selectComparisonEvidence({
      kind: 'comparison',
      habitatId: 'reef_fish',
      generation: 1,
    }),
  )
}

describe('useGameSession v2', () => {
  it('starts a voluntary observation study atomically with standard timing stored internally', () => {
    const { result } = renderHook(() => useGameSession())

    act(() => result.current.startStudy('predator'))
    expect(result.current.session.stage).toBe('mission')
    expect(result.current.session.studyRoute).toBeNull()

    act(() => result.current.startStudy('observation'))
    expect(result.current.session).toMatchObject({
      stage: 'prediction',
      studyRoute: 'observation',
      selectedTimingMode: 'standard',
    })
  })

  it('starts a predator study atomically only after a timing mode is supplied', () => {
    const { result } = renderHook(() => useGameSession())

    act(() => result.current.startStudy('predator', 'extended'))

    expect(result.current.session).toMatchObject({
      stage: 'prediction',
      studyRoute: 'predator',
      selectedTimingMode: 'extended',
    })
  })

  it('gates prediction behind timing and runs three independent generations per habitat', () => {
    const { result } = renderHook(() => useGameSession())

    expect(result.current.session.stage).toBe('mission')
    act(() =>
      result.current.submitPrediction(
        'camouflaged',
        'This prediction must not be accepted before timing is selected.',
      ),
    )
    expect(result.current.session.stage).toBe('mission')
    expect(result.current.session.predictions.reef_fish).toBeNull()

    act(() => result.current.selectTiming('standard'))
    expect(result.current.session.stage).toBe('prediction')
    act(() =>
      result.current.submitPrediction(
        'camouflaged',
        'Reef-matched fish may be harder for predators to detect.',
      ),
    )
    expect(result.current.session.stage).toBe('round')

    completeCurrentHabitat(result)
    expect(result.current.session.habitats.reef_fish.simulation.history).toHaveLength(3)
    expect(result.current.session.habitats.bark_moths.simulation.generation).toBe(0)

    act(() => result.current.continueAfterHabitat())
    expect(result.current.session.currentHabitatId).toBe('bark_moths')
    expect(result.current.session.stage).toBe('prediction')
    expect(result.current.currentSimulation.counts).toEqual({
      camouflaged: 20,
      conspicuous: 20,
    })

    act(() =>
      result.current.submitPrediction(
        'camouflaged',
        'Bark-matched moths may be harder for predators to detect.',
      ),
    )
    completeCurrentHabitat(result)
    expect(result.current.session.habitats.bark_moths.simulation.history).toHaveLength(3)
    expect(result.current.session.habitats.reef_fish.simulation.history).toHaveLength(3)

    act(() => result.current.continueAfterHabitat())
    expect(result.current.session.stage).toBe('evidence')
  })

  it('requires evidence and corrected checks before CER, then replays with a fresh session', () => {
    const { result } = renderHook(() => useGameSession())
    const originalSessionId = result.current.session.sessionId
    const originalSeed = result.current.session.seed

    act(() => result.current.selectTiming('standard'))
    act(() =>
      result.current.submitPrediction(
        'camouflaged',
        'The reef-matched inherited pattern may reduce predation.',
      ),
    )
    completeCurrentHabitat(result)
    act(() => result.current.continueAfterHabitat())
    act(() =>
      result.current.submitPrediction(
        'camouflaged',
        'The bark-matched inherited pattern may reduce predation.',
      ),
    )
    completeCurrentHabitat(result)
    act(() => result.current.continueAfterHabitat())

    act(() => result.current.enterChecks())
    expect(result.current.session.stage).toBe('evidence')
    selectRequiredEvidence(result)
    act(() => result.current.enterChecks())
    expect(result.current.session.stage).toBe('checks')

    result.current.misconceptionQuestions.forEach((question, index) => {
      const correctChoice = question.choices.find((choice) => choice.isCorrect)
      expect(correctChoice).toBeDefined()
      if (index === 0) {
        const incorrectChoice = question.choices.find((choice) => !choice.isCorrect)
        expect(incorrectChoice).toBeDefined()
        act(() => result.current.answerCheck(question.id, incorrectChoice!.id, false))
        act(() => result.current.nextCheck())
        expect(result.current.session.currentCheckIndex).toBe(0)
      }
      act(() => result.current.answerCheck(question.id, correctChoice!.id, true))
      act(() => result.current.nextCheck())
    })

    expect(result.current.session.stage).toBe('cer')
    act(() =>
      result.current.completeCer({
        claimId: 'data-supported-selection',
        reasoning:
          'Inherited variation affected survival and reproduction, so offspring changed each pattern percentage in the population.',
      }),
    )

    expect(result.current.session.stage).toBe('results')
    expect(result.current.session.completedResult?.habitats.reef_fish.generations).toHaveLength(3)
    expect(result.current.session.completedResult?.habitats.bark_moths.generations).toHaveLength(3)
    expect(result.current.session.completedResult?.scienceCompletion).toMatchObject({
      firstAttemptCorrect: 3,
      questionCount: 4,
      evidenceComplete: true,
      cerComplete: true,
    })

    act(() => result.current.replay())
    expect(result.current.session.stage).toBe('mission')
    expect(result.current.session.sessionId).not.toBe(originalSessionId)
    expect(result.current.session.seed).not.toBe(originalSeed)
    expect(result.current.session.habitats.reef_fish.simulation.generation).toBe(0)
    expect(result.current.session.habitats.bark_moths.simulation.generation).toBe(0)
  })

  it('reaches Results with exact fractional predator accuracy', () => {
    const { result } = renderHook(() => useGameSession())

    act(() => result.current.selectTiming('standard'))
    act(() =>
      result.current.submitPrediction(
        'camouflaged',
        'The reef-matched inherited pattern may reduce predation.',
      ),
    )
    completeCurrentHabitat(result, (generation, seed) =>
      generation === 1
        ? {
            seed,
            manualCatches: { camouflaged: 1, conspicuous: 0 },
            misses: 2,
            protectedEscapes: 0,
            elapsedMs: 25_000,
            timingMode: 'standard',
            inputMode: 'interactive',
            fallbackUsed: false,
          }
        : observationRound(seed),
    )
    act(() => result.current.continueAfterHabitat())
    act(() =>
      result.current.submitPrediction(
        'camouflaged',
        'The bark-matched inherited pattern may reduce predation.',
      ),
    )
    completeCurrentHabitat(result)
    act(() => result.current.continueAfterHabitat())

    selectRequiredEvidence(result)
    act(() => result.current.enterChecks())
    result.current.misconceptionQuestions.forEach((question) => {
      const correctChoice = question.choices.find((choice) => choice.isCorrect)
      expect(correctChoice).toBeDefined()
      act(() => result.current.answerCheck(question.id, correctChoice!.id, true))
      act(() => result.current.nextCheck())
    })

    act(() =>
      result.current.completeCer({
        claimId: 'data-supported-selection',
        reasoning:
          'Inherited variation changed survival and reproduction, so offspring changed population percentages.',
      }),
    )

    expect(result.current.session.stage).toBe('results')
    expect(result.current.session.completedResult?.predatorPerformance.accuracyPercent)
      .toBeCloseTo(100 / 3, 12)
  })
})
