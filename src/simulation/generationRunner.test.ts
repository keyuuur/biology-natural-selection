import { describe, expect, it } from 'vitest'
import { createInitialState, REEF_FISH_HABITAT } from './habitats.ts'
import {
  allocateByLargestRemainder,
  produceOffspring,
  resolvePredation,
  runGeneration,
  totalCounts,
  validateHabitatConfig,
  validatePlayerRoundMetrics,
} from './generationRunner.ts'
import { createSeededRandom } from './seededRandom.ts'
import type {
  HabitatConfig,
  PlayerRoundMetrics,
  SimulationState,
} from './types.ts'

function metrics(
  overrides: Partial<PlayerRoundMetrics> = {},
): PlayerRoundMetrics {
  return {
    seed: 1001,
    manualCatches: { camouflaged: 0, conspicuous: 0 },
    misses: 0,
    protectedEscapes: 0,
    elapsedMs: 25_000,
    timingMode: 'standard',
    inputMode: 'interactive',
    fallbackUsed: false,
    ...overrides,
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

describe('bounded predation and reproduction', () => {
  it('completes exactly 12 seeded predation events and restores 40 offspring', () => {
    const state = createInitialState(REEF_FISH_HABITAT)
    const { nextState, result } = runGeneration(
      state,
      metrics({ manualCatches: { camouflaged: 2, conspicuous: 3 } }),
      REEF_FISH_HABITAT,
    )

    expect(totalCounts(result.manualCatches)).toBe(5)
    expect(totalCounts(result.automaticCatches)).toBe(7)
    expect(totalCounts(result.survivorCounts)).toBe(28)
    expect(totalCounts(result.offspringCounts)).toBe(40)
    expect(result.endingCounts).toEqual(result.offspringCounts)
    expect(result.predatorPoints).toBe(50)
    expect(nextState.history).toEqual([result])
  })

  it('uses the same seed reproducibly and never mutates frozen inputs', () => {
    const state = deepFreeze(createInitialState(REEF_FISH_HABITAT))
    const round = deepFreeze(metrics({ seed: 42 }))
    const first = runGeneration(state, round, REEF_FISH_HABITAT)
    const second = runGeneration(state, round, REEF_FISH_HABITAT)

    expect(first).toEqual(second)
    expect(state.generation).toBe(0)
    expect(state.history).toEqual([])
    expect(first.nextState).not.toBe(state)
  })

  it('weights automatic catches by current abundance and visibility', () => {
    const state = createInitialState(REEF_FISH_HABITAT)
    const predation = resolvePredation(
      state,
      metrics(),
      REEF_FISH_HABITAT,
      createSeededRandom(77),
    )

    expect(predation.automaticCatches.conspicuous).toBeGreaterThan(
      predation.automaticCatches.camouflaged,
    )
    expect(totalCounts(predation.automaticCatches)).toBe(12)
  })

  it('allows student targeting to reverse the expected camouflage trend', () => {
    const { result } = runGeneration(
      createInitialState(REEF_FISH_HABITAT),
      metrics({ manualCatches: { camouflaged: 12, conspicuous: 0 } }),
      REEF_FISH_HABITAT,
    )

    expect(result.automaticCatches).toEqual({ camouflaged: 0, conspicuous: 0 })
    expect(result.survivorCounts).toEqual({ camouflaged: 8, conspicuous: 20 })
    expect(result.endingCounts).toEqual({ camouflaged: 11, conspicuous: 29 })
  })

  it('rejects manual catches that cross the three-parent floor', () => {
    expect(() =>
      validatePlayerRoundMetrics(
        metrics({ manualCatches: { camouflaged: 2, conspicuous: 0 } }),
        { camouflaged: 4, conspicuous: 36 },
        REEF_FISH_HABITAT,
      ),
    ).toThrow('parent floor')
  })

  it('keeps automatic selection above the parent floor', () => {
    const habitat: HabitatConfig = {
      ...REEF_FISH_HABITAT,
      initialCounts: { camouflaged: 4, conspicuous: 36 },
    }
    const predation = resolvePredation(
      createInitialState(habitat),
      metrics({ manualCatches: { camouflaged: 1, conspicuous: 0 } }),
      habitat,
      () => 0,
    )

    expect(predation.survivorCounts.camouflaged).toBe(3)
    expect(totalCounts(predation.survivorCounts)).toBe(28)
  })

  it('produces inherited offspring proportionally within the 4-36 bounds', () => {
    expect(produceOffspring({ camouflaged: 3, conspicuous: 25 }, REEF_FISH_HABITAT))
      .toEqual({ camouflaged: 4, conspicuous: 36 })
    expect(produceOffspring({ camouflaged: 25, conspicuous: 3 }, REEF_FISH_HABITAT))
      .toEqual({ camouflaged: 36, conspicuous: 4 })
  })

  it('uses camouflaged-first stable largest-remainder ties', () => {
    expect(
      allocateByLargestRemainder(1, { camouflaged: 1, conspicuous: 1 }),
    ).toEqual({ camouflaged: 1, conspicuous: 0 })
  })

  it('rejects observation rounds with manual captures and invalid random values', () => {
    expect(() =>
      runGeneration(
        createInitialState(REEF_FISH_HABITAT),
        metrics({
          manualCatches: { camouflaged: 1, conspicuous: 0 },
          inputMode: 'observation',
        }),
        REEF_FISH_HABITAT,
      ),
    ).toThrow('Observation rounds')
    expect(() =>
      resolvePredation(
        createInitialState(REEF_FISH_HABITAT),
        metrics(),
        REEF_FISH_HABITAT,
        () => 1,
      ),
    ).toThrow('Random source')
  })

  it('rejects runs after Generation 3 and invalid habitat constraints', () => {
    let state: SimulationState = createInitialState(REEF_FISH_HABITAT)
    for (let generation = 1; generation <= 3; generation += 1) {
      state = runGeneration(
        state,
        metrics({ seed: generation }),
        REEF_FISH_HABITAT,
      ).nextState
    }
    expect(() => runGeneration(state, metrics(), REEF_FISH_HABITAT)).toThrow(
      'already been run',
    )
    expect(() =>
      validateHabitatConfig({
        ...REEF_FISH_HABITAT,
        predationSlots: 35,
      }),
    ).toThrow('survivor floor')
  })
})
