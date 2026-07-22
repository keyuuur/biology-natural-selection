import type { ReactNode } from 'react'
import {
  formatGenerationPopulationEvidence,
  formatRateBasedGenerationEvidence,
} from '../learning/index.ts'
import type {
  ComparisonEvidenceReference,
  GenerationResult,
  HabitatId,
  PopulationEvidenceReference,
  PopulationGraphPoint,
} from '../simulation/index.ts'
import { HABITAT_STUDENT_COPY } from '../learning/index.ts'
import { PopulationGraph } from './PopulationGraph.tsx'
import { ScreenCard } from './ScreenCard.tsx'

type EvidenceScreenProps = {
  graphPoints: Readonly<Record<HabitatId, readonly PopulationGraphPoint[]>>
  generations: Readonly<Record<HabitatId, readonly GenerationResult[]>>
  selectedPopulation: readonly PopulationEvidenceReference[]
  selectedComparison: ComparisonEvidenceReference | null
  onTogglePopulation: (reference: PopulationEvidenceReference) => void
  onSelectComparison: (reference: ComparisonEvidenceReference) => void
  onContinue: () => void
  /**
   * Optional insertion point for the shared stage action dock. The screen
   * keeps its in-flow button only when no dock is supplied, so students never
   * see two competing actions in the full app.
   */
  renderActionDock?: (state: EvidenceProgressState) => ReactNode
}

export type EvidenceProgressState = {
  selectedCount: number
  requiredCount: number
  remainingCount: number
  isComplete: boolean
}

const POPULATION_REFERENCES: readonly PopulationEvidenceReference[] = [
  { kind: 'population', habitatId: 'reef_fish', generation: 0 },
  { kind: 'population', habitatId: 'reef_fish', generation: 3 },
  { kind: 'population', habitatId: 'bark_moths', generation: 0 },
  { kind: 'population', habitatId: 'bark_moths', generation: 3 },
]

function samePopulationReference(
  left: PopulationEvidenceReference,
  right: PopulationEvidenceReference,
) {
  return left.habitatId === right.habitatId && left.generation === right.generation
}

function findPoint(
  graphPoints: Readonly<Record<HabitatId, readonly PopulationGraphPoint[]>>,
  reference: PopulationEvidenceReference,
) {
  const point = graphPoints[reference.habitatId].find(
    (candidate) => candidate.generation === reference.generation,
  )
  if (!point) throw new Error(`Generation ${reference.generation} evidence is unavailable.`)
  return point
}

function comparisonCandidate(
  generations: Readonly<Record<HabitatId, readonly GenerationResult[]>>,
): GenerationResult {
  const candidates = [...generations.reef_fish, ...generations.bark_moths]
  if (candidates.length === 0) throw new Error('Generation comparison evidence is unavailable.')

  return [...candidates].sort((left, right) => {
    const leftDifference = Math.abs(
      left.survivorCounts.camouflaged / left.startingCounts.camouflaged -
        left.survivorCounts.conspicuous / left.startingCounts.conspicuous,
    )
    const rightDifference = Math.abs(
      right.survivorCounts.camouflaged / right.startingCounts.camouflaged -
        right.survivorCounts.conspicuous / right.startingCounts.conspicuous,
    )
    return rightDifference - leftDifference
  })[0]
}

function toRateEvidence(result: GenerationResult) {
  return {
    habitatId: result.habitatId,
    generation: result.generation,
    startingCounts: result.startingCounts,
    manualCatches: result.manualCatches,
    automaticCatches: result.automaticCatches,
    protectedEscapes: result.protectedEscapes,
    survivorCounts: result.survivorCounts,
    offspringCounts: result.offspringCounts,
  }
}

export function EvidenceScreen({
  graphPoints,
  generations,
  selectedPopulation,
  selectedComparison,
  onTogglePopulation,
  onSelectComparison,
  onContinue,
  renderActionDock,
}: EvidenceScreenProps) {
  const comparison = comparisonCandidate(generations)
  const comparisonReference: ComparisonEvidenceReference = {
    kind: 'comparison',
    habitatId: comparison.habitatId,
    generation: comparison.generation,
  }
  const hasComparison =
    selectedComparison?.habitatId === comparisonReference.habitatId &&
    selectedComparison.generation === comparisonReference.generation
  const populationComplete = POPULATION_REFERENCES.every((reference) =>
    selectedPopulation.some((selected) => samePopulationReference(selected, reference)),
  )
  const isComplete = populationComplete && selectedComparison !== null
  const progressItems = [
    ...POPULATION_REFERENCES.map((reference) => ({
      id: `${reference.habitatId}-g${reference.generation}`,
      label: `${HABITAT_STUDENT_COPY[reference.habitatId].title}, Generation ${reference.generation}`,
      selected: selectedPopulation.some((item) => samePopulationReference(item, reference)),
    })),
    {
      id: 'survival-reproduction-comparison',
      label: 'Survival and reproduction comparison',
      selected: hasComparison,
    },
  ]
  const progress: EvidenceProgressState = {
    selectedCount: progressItems.filter((item) => item.selected).length,
    requiredCount: progressItems.length,
    remainingCount: progressItems.filter((item) => !item.selected).length,
    isComplete,
  }

  function renderPopulationChoice(reference: PopulationEvidenceReference) {
    const point = findPoint(graphPoints, reference)
    const selected = selectedPopulation.some((item) => samePopulationReference(item, reference))
    const habitat = HABITAT_STUDENT_COPY[reference.habitatId]
    return (
      <button
        aria-pressed={selected}
        className={`evidence-choice${selected ? ' is-selected' : ''}`}
        data-testid={`evidence-${reference.habitatId}-g${reference.generation}`}
        key={`${reference.habitatId}-${reference.generation}`}
        onClick={() => onTogglePopulation(reference)}
        type="button"
      >
        <strong>
          {habitat.title}, Generation {reference.generation}
        </strong>
        <span>
          {formatGenerationPopulationEvidence(reference.habitatId, reference.generation, point.counts)}
        </span>
      </button>
    )
  }

  return (
    <div className="evidence-layout">
      <ScreenCard
        className="evidence-card"
        eyebrow="Evidence notebook"
        title="Select evidence from both habitats"
      >
        <p>
          Natural selection is a population-level pattern. Select the starting and ending
          percentages from both studies, then add one survival-and-reproduction comparison.
        </p>

        <section aria-labelledby="evidence-progress-title" className="evidence-progress">
          <h3 id="evidence-progress-title">Your evidence checklist</h3>
          <p className="evidence-progress__summary" data-testid="evidence-progress">
            {progress.isComplete
              ? 'All 5 evidence pieces selected.'
              : `${progress.selectedCount} of ${progress.requiredCount} evidence pieces selected. ${progress.remainingCount} remaining.`}
          </p>
          <ol className="evidence-progress__list">
            {progressItems.map((item, index) => (
              <li className={item.selected ? 'is-selected' : ''} key={item.id}>
                <span aria-hidden="true">{item.selected ? '✓' : index + 1}</span>
                {item.label}
              </li>
            ))}
          </ol>
        </section>

        {renderActionDock?.(progress)}

        <section aria-labelledby="population-evidence-title">
          <h3 id="population-evidence-title">Population evidence</h3>
          <p className="evidence-section-intro">Select the beginning and ending population evidence for each habitat.</p>
          <section aria-labelledby="reef-population-evidence-title" className="evidence-habitat-group">
            <h4 id="reef-population-evidence-title">Reef fish: Generations 0 and 3</h4>
            <div className="evidence-choice-grid evidence-choice-grid--pair">
              {POPULATION_REFERENCES.filter((reference) => reference.habitatId === 'reef_fish').map(renderPopulationChoice)}
            </div>
          </section>
          <section aria-labelledby="moth-population-evidence-title" className="evidence-habitat-group">
            <h4 id="moth-population-evidence-title">Bark moths: Generations 0 and 3</h4>
            <div className="evidence-choice-grid evidence-choice-grid--pair">
              {POPULATION_REFERENCES.filter((reference) => reference.habitatId === 'bark_moths').map(renderPopulationChoice)}
            </div>
          </section>
        </section>

        <section aria-labelledby="comparison-evidence-title">
          <h3 id="comparison-evidence-title">Within-generation comparison</h3>
          <button
            aria-pressed={hasComparison}
            className={`evidence-choice evidence-choice--wide${hasComparison ? ' is-selected' : ''}`}
            data-testid="evidence-within-generation"
            onClick={() => onSelectComparison(comparisonReference)}
            type="button"
          >
            <strong>Compare survival rates and offspring</strong>
            <span>{formatRateBasedGenerationEvidence(toRateEvidence(comparison))}</span>
          </button>
        </section>

        {!renderActionDock && (
          <button
            className="primary-button primary-button--full"
            data-testid="primary-action"
            disabled={!isComplete}
            onClick={onContinue}
            type="button"
          >
            Use this evidence <span aria-hidden="true">→</span>
          </button>
        )}
      </ScreenCard>

      <section aria-labelledby="full-evidence-data-title" className="evidence-graphs">
        <h2 id="full-evidence-data-title">Full graphs and data tables</h2>
        <PopulationGraph
          habitatId="reef_fish"
          points={graphPoints.reef_fish}
          title="Reef fish: percentage of each pattern"
        />
        <PopulationGraph
          habitatId="bark_moths"
          points={graphPoints.bark_moths}
          title="Bark moths: percentage of each pattern"
        />
      </section>
    </div>
  )
}
