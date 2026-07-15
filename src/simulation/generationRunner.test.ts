import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SCENARIO, createInitialState } from './scenario'
import {
  allocateByLargestRemainder,
  runAllGenerations,
  runGeneration,
  totalCounts,
  validateScenarioConfig,
} from './generationRunner'
import type { ScenarioConfig, SimulationState } from './types'

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value)
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue)
    }
  }
  return value
}

function scenarioWith(
  overrides: Partial<ScenarioConfig>,
): ScenarioConfig {
  return {
    ...DEFAULT_SCENARIO,
    ...overrides,
    initialCounts: {
      ...DEFAULT_SCENARIO.initialCounts,
      ...overrides.initialCounts,
    },
    fitnessWeights: {
      ...DEFAULT_SCENARIO.fitnessWeights,
      ...overrides.fitnessWeights,
    },
    traitLabels: {
      ...DEFAULT_SCENARIO.traitLabels,
      ...overrides.traitLabels,
    },
    copy: {
      ...DEFAULT_SCENARIO.copy,
      ...overrides.copy,
    },
  }
}

describe('runGeneration', () => {
  it('produces the exact five-generation deterministic sequence', () => {
    const finalState = runAllGenerations(
      createInitialState(DEFAULT_SCENARIO),
      DEFAULT_SCENARIO,
    )

    expect(finalState.history.map((result) => result.endingCounts)).toEqual([
      { higher_speed: 12, lower_speed: 8 },
      { higher_speed: 13, lower_speed: 7 },
      { higher_speed: 15, lower_speed: 5 },
      { higher_speed: 17, lower_speed: 3 },
      { higher_speed: 18, lower_speed: 2 },
    ])
    expect(finalState.history.map((result) => result.survivorCounts)).toEqual([
      { higher_speed: 7, lower_speed: 5 },
      { higher_speed: 8, lower_speed: 4 },
      { higher_speed: 9, lower_speed: 3 },
      { higher_speed: 10, lower_speed: 2 },
      { higher_speed: 11, lower_speed: 1 },
    ])
  })

  it('keeps 12 survivors and replaces them with exactly 20 offspring', () => {
    const finalState = runAllGenerations(
      createInitialState(DEFAULT_SCENARIO),
      DEFAULT_SCENARIO,
    )

    for (const result of finalState.history) {
      expect(totalCounts(result.startingCounts)).toBe(20)
      expect(totalCounts(result.survivorCounts)).toBe(12)
      expect(totalCounts(result.offspringCounts)).toBe(20)
      expect(totalCounts(result.endingCounts)).toBe(20)
      expect(result.offspringCounts).toEqual(result.endingCounts)
      expect(
        result.endingFrequencies.higher_speed +
          result.endingFrequencies.lower_speed,
      ).toBeCloseTo(1)
    }
  })

  it('does not mutate a frozen scenario or state', () => {
    const scenario = deepFreeze(scenarioWith({}))
    const state = deepFreeze(createInitialState(scenario))
    const originalState = structuredClone(state)

    const nextState = runGeneration(state, scenario)

    expect(state).toEqual(originalState)
    expect(nextState).not.toBe(state)
    expect(nextState.counts).not.toBe(state.counts)
    expect(nextState.history).not.toBe(state.history)
  })

  it('breaks equal largest-remainder ties in higher-speed-first order', () => {
    expect(
      allocateByLargestRemainder(1, {
        higher_speed: 1,
        lower_speed: 1,
      }),
    ).toEqual({ higher_speed: 1, lower_speed: 0 })
  })

  it('never calls a random-number generator', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Randomness is not allowed in this model.')
    })

    expect(() =>
      runAllGenerations(
        createInitialState(DEFAULT_SCENARIO),
        DEFAULT_SCENARIO,
      ),
    ).not.toThrow()
    expect(random).not.toHaveBeenCalled()
    random.mockRestore()
  })

  it('rejects an additional run after the fifth generation', () => {
    const finalState = runAllGenerations(
      createInitialState(DEFAULT_SCENARIO),
      DEFAULT_SCENARIO,
    )

    expect(() => runGeneration(finalState, DEFAULT_SCENARIO)).toThrow(
      'already been run',
    )
  })
})

describe('validation', () => {
  it.each([
    scenarioWith({ populationSize: 0 }),
    scenarioWith({ feedingSlots: 21 }),
    scenarioWith({ initialCounts: { higher_speed: 9, lower_speed: 10 } }),
    scenarioWith({
      fitnessWeights: { higher_speed: Number.NaN, lower_speed: 1 },
    }),
    scenarioWith({
      fitnessWeights: { higher_speed: 0, lower_speed: 1 },
    }),
  ])('rejects invalid scenario configurations', (scenario) => {
    expect(() => validateScenarioConfig(scenario)).toThrow()
  })

  it('rejects a state with a changed population total', () => {
    const invalidState: SimulationState = {
      ...createInitialState(DEFAULT_SCENARIO),
      counts: { higher_speed: 10, lower_speed: 9 },
    }

    expect(() => runGeneration(invalidState, DEFAULT_SCENARIO)).toThrow(
      'must total',
    )
  })

  it('rejects state from another scenario', () => {
    const invalidState: SimulationState = {
      ...createInitialState(DEFAULT_SCENARIO),
      scenarioId: 'another-scenario',
    }

    expect(() => runGeneration(invalidState, DEFAULT_SCENARIO)).toThrow(
      'IDs do not match',
    )
  })
})
