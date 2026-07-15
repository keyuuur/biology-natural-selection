import { describe, expect, it } from 'vitest'
import { runAllGenerations } from './generationRunner'
import { createGraphPoint, createGraphSeries } from './graphSeries'
import { DEFAULT_SCENARIO, createInitialState } from './scenario'

describe('trait graph data', () => {
  it('creates a Generation 0 through Generation 5 percentage series', () => {
    const finalState = runAllGenerations(
      createInitialState(DEFAULT_SCENARIO),
      DEFAULT_SCENARIO,
    )
    const points = createGraphSeries(
      DEFAULT_SCENARIO.initialCounts,
      finalState.history,
    )

    expect(points).toHaveLength(6)
    expect(points[0]).toEqual({
      generation: 0,
      counts: { higher_speed: 10, lower_speed: 10 },
      frequencies: { higher_speed: 0.5, lower_speed: 0.5 },
      percentages: { higher_speed: 50, lower_speed: 50 },
    })
    expect(points[5]).toEqual({
      generation: 5,
      counts: { higher_speed: 18, lower_speed: 2 },
      frequencies: { higher_speed: 0.9, lower_speed: 0.1 },
      percentages: { higher_speed: 90, lower_speed: 10 },
    })
  })

  it('rejects empty populations and invalid generation numbers', () => {
    expect(() =>
      createGraphPoint(0, { higher_speed: 0, lower_speed: 0 }),
    ).toThrow('at least one organism')
    expect(() =>
      createGraphPoint(-1, { higher_speed: 10, lower_speed: 10 }),
    ).toThrow('non-negative integer')
  })
})
