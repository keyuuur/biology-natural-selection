import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BARK_MOTH_HABITAT,
  createGraphSeries,
  createInitialState,
  REEF_FISH_HABITAT,
  runGeneration,
  type GenerationResult,
  type HabitatConfig,
  type PlayerRoundMetrics,
} from '../simulation/index.ts'
import { EvidenceScreen } from './EvidenceScreen.tsx'

function metrics(seed: number): PlayerRoundMetrics {
  return {
    seed,
    manualCatches: { camouflaged: 0, conspicuous: 0 },
    misses: 0,
    protectedEscapes: 0,
    elapsedMs: 25_000,
    timingMode: 'standard',
    inputMode: 'interactive',
    fallbackUsed: false,
  }
}

function historyFor(habitat: HabitatConfig): readonly GenerationResult[] {
  let state = createInitialState(habitat)
  for (let generation = 1; generation <= 3; generation += 1) {
    state = runGeneration(state, metrics(generation), habitat).nextState
  }
  return state.history
}

const reefHistory = historyFor(REEF_FISH_HABITAT)
const mothHistory = historyFor(BARK_MOTH_HABITAT)

afterEach(cleanup)

describe('EvidenceScreen', () => {
  it('keeps the five required evidence pieces ordered and groups population pairs by habitat', () => {
    const onTogglePopulation = vi.fn()
    render(
      <EvidenceScreen
        generations={{ reef_fish: reefHistory, bark_moths: mothHistory }}
        graphPoints={{
          reef_fish: createGraphSeries(REEF_FISH_HABITAT, reefHistory),
          bark_moths: createGraphSeries(BARK_MOTH_HABITAT, mothHistory),
        }}
        onContinue={vi.fn()}
        onSelectComparison={vi.fn()}
        onTogglePopulation={onTogglePopulation}
        selectedComparison={null}
        selectedPopulation={[]}
      />,
    )

    expect(screen.getByTestId('evidence-progress').textContent).toContain('0 of 5')
    expect(screen.getByText('Reef fish: Generations 0 and 3').parentElement?.querySelectorAll('button')).toHaveLength(2)
    expect(screen.getByText('Bark moths: Generations 0 and 3').parentElement?.querySelectorAll('button')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Full graphs and data tables' })).toBeTruthy()

    fireEvent.click(screen.getByTestId('evidence-reef_fish-g0'))
    expect(onTogglePopulation).toHaveBeenCalledWith({
      kind: 'population',
      habitatId: 'reef_fish',
      generation: 0,
    })
  })

  it('uses the dock as the only primary action when one is supplied', () => {
    render(
      <EvidenceScreen
        generations={{ reef_fish: reefHistory, bark_moths: mothHistory }}
        graphPoints={{
          reef_fish: createGraphSeries(REEF_FISH_HABITAT, reefHistory),
          bark_moths: createGraphSeries(BARK_MOTH_HABITAT, mothHistory),
        }}
        onContinue={vi.fn()}
        onSelectComparison={vi.fn()}
        onTogglePopulation={vi.fn()}
        renderActionDock={() => <button data-testid="evidence-dock">Use this evidence</button>}
        selectedComparison={null}
        selectedPopulation={[]}
      />,
    )

    expect(screen.getByTestId('evidence-dock')).toBeTruthy()
    expect(screen.queryByTestId('primary-action')).toBeNull()
  })
})
