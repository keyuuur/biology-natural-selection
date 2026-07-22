import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BARK_MOTH_HABITAT,
  createGraphSeries,
  createInitialState,
  REEF_FISH_HABITAT,
  runGeneration,
  type HabitatConfig,
  type PlayerRoundMetrics,
} from '../simulation/index.ts'
import { GenerationPanel } from './GenerationPanel.tsx'
import { ObservationRound } from './ObservationRound.tsx'
import { PopulationGraph } from './PopulationGraph.tsx'
import { PredictionPanel } from './PredictionPanel.tsx'

afterEach(cleanup)

const habitats = [
  {
    habitat: REEF_FISH_HABITAT,
    labels: { camouflaged: 'reef-matched pattern', conspicuous: 'high-contrast pattern' },
  },
  {
    habitat: BARK_MOTH_HABITAT,
    labels: { camouflaged: 'mottled bark pattern', conspicuous: 'solid light pattern' },
  },
] as const

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

function firstGeneration(habitat: HabitatConfig) {
  const initial = createInitialState(habitat)
  return runGeneration(initial, metrics(17), habitat).result
}

describe.each(habitats)('$habitat.copy.shortTitle student labels', ({ habitat, labels }) => {
  it('keeps prediction, generation review, observation, and graph labels specific to that habitat', () => {
    const generation = firstGeneration(habitat)
    const graphPoints = createGraphSeries(habitat, [generation])
    const view = render(
      <>
        <PredictionPanel habitat={habitat} onSubmit={vi.fn()} />
        <GenerationPanel habitat={habitat} result={generation} onContinue={vi.fn()} />
        <ObservationRound
          counts={habitat.initialCounts}
          generation={1}
          habitatId={habitat.id}
          habitatTitle={habitat.copy.title}
          onComplete={vi.fn()}
          roundSeed={17}
        />
        <PopulationGraph
          habitatId={habitat.id}
          points={graphPoints}
          title={`${habitat.copy.shortTitle} population evidence`}
        />
      </>,
    )

    expect(screen.getByRole('radio', { name: `The ${labels.camouflaged} will become a larger percentage.` })).toBeTruthy()
    expect(screen.getByRole('radio', { name: `The ${labels.conspicuous} will become a larger percentage.` })).toBeTruthy()
    expect(screen.getByText(`${labels.camouflaged} survival rate`)).toBeTruthy()
    expect(screen.getByText(`${labels.conspicuous} survival rate`)).toBeTruthy()
    expect(screen.getByText(`20 ${labels.camouflaged}`)).toBeTruthy()
    expect(screen.getByText(`20 ${labels.conspicuous}`)).toBeTruthy()

    const graph = screen.getByTestId(`population-graph-${habitat.id}`)
    expect(within(graph).getByLabelText('Graph legend').textContent).toContain(labels.camouflaged)
    expect(within(graph).getByLabelText('Graph legend').textContent).toContain(labels.conspicuous)
    expect(screen.getByTestId(`population-table-${habitat.id}`).textContent).toContain(labels.camouflaged)
    expect(screen.getByTestId(`population-table-${habitat.id}`).textContent).toContain(labels.conspicuous)
    expect(view.container.querySelector('desc')?.textContent).toContain(labels.camouflaged)
    expect(view.container.querySelector('desc')?.textContent).toContain(labels.conspicuous)
  })
})
