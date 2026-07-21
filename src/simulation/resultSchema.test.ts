import { describe, expect, it } from 'vitest'
import { BARK_MOTH_HABITAT, REEF_FISH_HABITAT, createInitialState } from './habitats.ts'
import { runGeneration, totalCounts } from './generationRunner.ts'
import {
  calculatePredatorAccuracyPercent,
  createNaturalSelectionResult,
  parseNaturalSelectionResult,
  serializeNaturalSelectionResult,
} from './resultSchema.ts'
import type {
  GenerationResult,
  HabitatConfig,
  NaturalSelectionResult,
  PlayerRoundMetrics,
} from './types.ts'

function completedHabitat(habitat: HabitatConfig): readonly GenerationResult[] {
  let state = createInitialState(habitat)
  for (let generation = 1; generation <= 3; generation += 1) {
    const metrics: PlayerRoundMetrics = {
      seed: generation * 100 + (habitat.id === 'reef_fish' ? 1 : 2),
      manualCatches: { camouflaged: 1, conspicuous: 2 },
      misses: generation,
      protectedEscapes: 0,
      elapsedMs: 25_000,
      timingMode: 'standard',
      inputMode: 'interactive',
      fallbackUsed: false,
    }
    state = runGeneration(state, metrics, habitat).nextState
  }
  return state.history
}

function makeResult(): NaturalSelectionResult {
  const reef = completedHabitat(REEF_FISH_HABITAT)
  const moths = completedHabitat(BARK_MOTH_HABITAT)
  const generations = [...reef, ...moths]
  const manualCaptures = generations.reduce(
    (sum, generation) => sum + totalCounts(generation.manualCatches),
    0,
  )
  const misses = generations.reduce((sum, generation) => sum + generation.misses, 0)
  const protectedEscapes = 0
  const points = generations.reduce(
    (sum, generation) => sum + generation.predatorPoints,
    0,
  )
  const evidence = {
    population: [
      { kind: 'population' as const, habitatId: 'reef_fish' as const, generation: 0 },
      { kind: 'population' as const, habitatId: 'reef_fish' as const, generation: 3 },
      { kind: 'population' as const, habitatId: 'bark_moths' as const, generation: 0 },
      { kind: 'population' as const, habitatId: 'bark_moths' as const, generation: 3 },
    ],
    comparison: {
      kind: 'comparison' as const,
      habitatId: 'reef_fish' as const,
      generation: 2,
    },
  }
  return createNaturalSelectionResult({
    sessionId: 'session-safe-001',
    seed: 987_654,
    startedAt: '2026-07-15T14:00:00.000Z',
    completedAt: '2026-07-15T14:12:00.000Z',
    selectedTimingMode: 'standard',
    predictions: {
      reef_fish: {
        outcome: 'camouflaged',
        reason: 'Camouflaged fish may be harder for a predator to catch.',
      },
      bark_moths: {
        outcome: 'camouflaged',
        reason: 'Camouflaged moths may be harder for a predator to catch.',
      },
    },
    habitats: {
      reef_fish: { habitatId: 'reef_fish', generations: reef },
      bark_moths: { habitatId: 'bark_moths', generations: moths },
    },
    misconceptionChecks: [
      {
        questionId: 'pressure',
        firstAnswerId: 'predation',
        firstAttemptCorrect: true,
        finalAnswerId: 'predation',
        attempts: 1,
      },
      {
        questionId: 'frequency',
        firstAnswerId: 'need',
        firstAttemptCorrect: false,
        finalAnswerId: 'reproduction',
        attempts: 2,
      },
      {
        questionId: 'fitness',
        firstAnswerId: 'survive-reproduce',
        firstAttemptCorrect: true,
        finalAnswerId: 'survive-reproduce',
        attempts: 1,
      },
      {
        questionId: 'transfer',
        firstAnswerId: 'environment-dependent',
        firstAttemptCorrect: true,
        finalAnswerId: 'environment-dependent',
        attempts: 1,
      },
    ],
    evidence,
    cer: {
      claimId: 'environment-dependent-selection',
      evidence: [...evidence.population, evidence.comparison],
      reasoning:
        'Inherited variation affected which organisms survived and reproduced, changing the population percentages.',
    },
    predatorPerformance: {
      manualCaptures,
      misses,
      protectedEscapes,
      points,
      accuracyPercent:
        (manualCaptures / (manualCaptures + misses)) * 100,
    },
    scienceCompletion: {
      firstAttemptCorrect: 3,
      questionCount: 4,
      evidenceComplete: true,
      cerComplete: true,
    },
    clientVersion: '0.2.0',
  })
}

function makeFractionalAccuracyResult(): NaturalSelectionResult {
  const template = makeResult()
  const oneCatchThenObservation = (habitat: HabitatConfig): readonly GenerationResult[] => {
    let state = createInitialState(habitat)
    for (let generation = 1; generation <= 3; generation += 1) {
      const metrics: PlayerRoundMetrics = generation === 1 && habitat.id === 'reef_fish'
        ? {
            seed: 8_001,
            manualCatches: { camouflaged: 1, conspicuous: 0 },
            misses: 2,
            protectedEscapes: 0,
            elapsedMs: 25_000,
            timingMode: 'standard',
            inputMode: 'interactive',
            fallbackUsed: false,
          }
        : {
            seed: 8_000 + generation + (habitat.id === 'reef_fish' ? 0 : 100),
            manualCatches: { camouflaged: 0, conspicuous: 0 },
            misses: 0,
            protectedEscapes: 0,
            elapsedMs: 25_000,
            timingMode: 'standard',
            inputMode: 'observation',
            fallbackUsed: true,
          }
      state = runGeneration(state, metrics, habitat).nextState
    }
    return state.history
  }
  const reef = oneCatchThenObservation(REEF_FISH_HABITAT)
  const moths = oneCatchThenObservation(BARK_MOTH_HABITAT)
  const generations = [...reef, ...moths]
  const manualCaptures = generations.reduce(
    (sum, generation) => sum + totalCounts(generation.manualCatches),
    0,
  )
  const misses = generations.reduce((sum, generation) => sum + generation.misses, 0)
  const protectedEscapes = generations.reduce(
    (sum, generation) => sum + generation.protectedEscapes,
    0,
  )
  const points = generations.reduce((sum, generation) => sum + generation.predatorPoints, 0)

  return createNaturalSelectionResult({
    ...template,
    habitats: {
      reef_fish: { habitatId: 'reef_fish', generations: reef },
      bark_moths: { habitatId: 'bark_moths', generations: moths },
    },
    predatorPerformance: {
      manualCaptures,
      misses,
      protectedEscapes,
      points,
      accuracyPercent: calculatePredatorAccuracyPercent(manualCaptures, misses),
    },
  })
}

describe('NaturalSelectionResult v2', () => {
  it.each([
    [0, 0, 0],
    [3, 2, 60],
    [1, 2, 100 / 3],
    [12, 1, 1200 / 13],
  ])('calculates exact predator accuracy for %i captures and %i misses', (captures, misses, expected) => {
    expect(calculatePredatorAccuracyPercent(captures, misses)).toBeCloseTo(expected, 12)
  })

  it('round-trips a complete two-habitat identity-free result', () => {
    const result = makeResult()
    expect(parseNaturalSelectionResult(serializeNaturalSelectionResult(result)))
      .toEqual(result)
    expect(result.habitats.reef_fish.generations).toHaveLength(3)
    expect(result.habitats.bark_moths.generations).toHaveLength(3)
  })

  it('preserves exact fractional accuracy while rejecting a display-rounded aggregate', () => {
    const result = makeFractionalAccuracyResult()
    expect(result.predatorPerformance.accuracyPercent).toBeCloseTo(100 / 3, 12)
    expect(parseNaturalSelectionResult(serializeNaturalSelectionResult(result)))
      .toEqual(result)

    expect(() =>
      createNaturalSelectionResult({
        ...result,
        predatorPerformance: {
          ...result.predatorPerformance,
          accuracyPercent: 33,
        },
      }),
    ).toThrow('does not match')
  })

  it('drops accidental identity fields at every schema boundary', () => {
    const unsafe = {
      ...makeResult(),
      studentName: 'Not allowed',
      period: 'Not allowed',
      predictions: {
        ...makeResult().predictions,
        studentEmail: 'not-allowed@example.test',
      },
    } as NaturalSelectionResult
    const parsed = JSON.parse(
      serializeNaturalSelectionResult(unsafe),
    ) as Record<string, unknown>

    expect(parsed).not.toHaveProperty('studentName')
    expect(parsed).not.toHaveProperty('period')
    expect(parsed.predictions).not.toHaveProperty('studentEmail')
  })

  it('rejects mismatched population frequencies and predator aggregates', () => {
    const result = makeResult()
    expect(() =>
      createNaturalSelectionResult({
        ...result,
        habitats: {
          ...result.habitats,
          reef_fish: {
            ...result.habitats.reef_fish,
            generations: result.habitats.reef_fish.generations.map(
              (generation, index) =>
                index === 0
                  ? {
                      ...generation,
                      endingPercentages: {
                        ...generation.endingPercentages,
                        camouflaged: 99,
                      },
                    }
                  : generation,
            ),
          },
        },
      }),
    ).toThrow('does not match')
    expect(() =>
      createNaturalSelectionResult({
        ...result,
        predatorPerformance: {
          ...result.predatorPerformance,
          points: result.predatorPerformance.points + 10,
        },
      }),
    ).toThrow('Predator performance')
  })

  it('requires the four graph endpoints, one comparison, and four checks', () => {
    const result = makeResult()
    expect(() =>
      createNaturalSelectionResult({
        ...result,
        evidence: {
          ...result.evidence,
          population: result.evidence.population.slice(1),
        },
      }),
    ).toThrow('Generation 0 and 3')
    expect(() =>
      createNaturalSelectionResult({
        ...result,
        misconceptionChecks: result.misconceptionChecks.slice(0, 3),
      }),
    ).toThrow('four unique')
  })

  it('rejects invalid JSON, timestamps, and result seeds', () => {
    const result = makeResult()
    expect(() => parseNaturalSelectionResult('{broken')).toThrow('not valid JSON')
    expect(() =>
      createNaturalSelectionResult({
        ...result,
        completedAt: '2026-07-15T13:00:00.000Z',
      }),
    ).toThrow('timestamps')
    expect(() => createNaturalSelectionResult({ ...result, seed: -1 })).toThrow(
      'unsigned 32-bit',
    )
  })
})
