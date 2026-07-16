import { describe, expect, it } from 'vitest'
import { createGraphPoint, createGraphSeries } from './graphSeries.ts'
import { createInitialState, REEF_FISH_HABITAT } from './habitats.ts'
import { runGeneration } from './generationRunner.ts'
import type { PlayerRoundMetrics } from './types.ts'

const round: PlayerRoundMetrics = {
  seed: 18,
  manualCatches: { camouflaged: 0, conspicuous: 0 },
  misses: 0,
  protectedEscapes: 0,
  elapsedMs: 25_000,
  timingMode: 'standard',
  inputMode: 'interactive',
  fallbackUsed: false,
}

describe('population graph series', () => {
  it('builds habitat-specific Generation 0 through 3 percentages', () => {
    let state = createInitialState(REEF_FISH_HABITAT)
    for (let generation = 1; generation <= 3; generation += 1) {
      state = runGeneration(
        state,
        { ...round, seed: generation },
        REEF_FISH_HABITAT,
      ).nextState
    }
    const points = createGraphSeries(REEF_FISH_HABITAT, state.history)

    expect(points).toHaveLength(4)
    expect(points[0]).toMatchObject({
      habitatId: 'reef_fish',
      generation: 0,
      counts: { camouflaged: 20, conspicuous: 20 },
      percentages: { camouflaged: 50, conspicuous: 50 },
    })
    expect(points[3].counts.camouflaged + points[3].counts.conspicuous).toBe(40)
  })

  it('rejects empty populations and malformed history', () => {
    expect(() =>
      createGraphPoint('reef_fish', 0, { camouflaged: 0, conspicuous: 0 }),
    ).toThrow('at least one organism')
    expect(() => createGraphSeries(REEF_FISH_HABITAT, [
      {
        ...runGeneration(createInitialState(REEF_FISH_HABITAT), round, REEF_FISH_HABITAT).result,
        generation: 2,
      },
    ])).toThrow('sequential')
  })
})
