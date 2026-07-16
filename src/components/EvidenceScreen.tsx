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

        <section aria-labelledby="population-evidence-title">
          <h3 id="population-evidence-title">Population evidence</h3>
          <div className="evidence-choice-grid">
            {POPULATION_REFERENCES.map((reference) => {
              const point = findPoint(graphPoints, reference)
              const selected = selectedPopulation.some((item) =>
                samePopulationReference(item, reference),
              )
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
                    {HABITAT_STUDENT_COPY[reference.habitatId].title}, Generation{' '}
                    {reference.generation}
                  </strong>
                  <span>
                    {formatGenerationPopulationEvidence(
                      reference.habitatId,
                      reference.generation,
                      point.counts,
                    )}
                  </span>
                </button>
              )
            })}
          </div>
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

        <button
          className="primary-button primary-button--full"
          data-testid="primary-action"
          disabled={!isComplete}
          onClick={onContinue}
          type="button"
        >
          Use this evidence <span aria-hidden="true">→</span>
        </button>
      </ScreenCard>

      <div className="evidence-graphs">
        <PopulationGraph
          habitatId="reef_fish"
          organismLabel={HABITAT_STUDENT_COPY.reef_fish.organismLabel}
          points={graphPoints.reef_fish}
          title="Reef fish: percentage of each pattern"
        />
        <PopulationGraph
          habitatId="bark_moths"
          organismLabel={HABITAT_STUDENT_COPY.bark_moths.organismLabel}
          points={graphPoints.bark_moths}
          title="Bark moths: percentage of each pattern"
        />
      </div>
    </div>
  )
}
