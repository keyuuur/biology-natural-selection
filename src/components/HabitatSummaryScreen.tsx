import { HABITAT_STUDENT_COPY, formatPercent } from '../learning/index.ts'
import type { HabitatId, PopulationGraphPoint } from '../simulation/index.ts'
import { PopulationGraph } from './PopulationGraph.tsx'
import { ScreenCard } from './ScreenCard.tsx'

type HabitatSummaryScreenProps = {
  habitatId: HabitatId
  points: readonly PopulationGraphPoint[]
  onContinue: () => void
}

export function HabitatSummaryScreen({
  habitatId,
  points,
  onContinue,
}: HabitatSummaryScreenProps) {
  const copy = HABITAT_STUDENT_COPY[habitatId]
  const start = points.find((point) => point.generation === 0)
  const end = points.find((point) => point.generation === 3)
  if (!start || !end) throw new Error('A habitat summary requires Generations 0 through 3.')

  const startPercent = start.percentages.camouflaged
  const endPercent = end.percentages.camouflaged
  const change = endPercent > startPercent ? 'increased' : endPercent < startPercent ? 'decreased' : 'stayed the same'
  const buttonLabel = habitatId === 'reef_fish' ? 'Continue to the moth habitat' : 'Compare the habitats'

  return (
    <div className="analysis-layout">
      <ScreenCard eyebrow="Habitat evidence" title={`Review the ${copy.organismLabel} population`}>
        <p>
          The {copy.morphLabels.camouflaged} {change} from{' '}
          <strong>{formatPercent(startPercent)}</strong> to{' '}
          <strong>{formatPercent(endPercent)}</strong> of the population.
        </p>
        <div className="feedback-box">
          <strong>Explain this run from its actual evidence.</strong>
          <p>
            Existing inherited variation came first. Predation affected survival, and the survivors
            reproduced. The offspring then formed the next population of 40.
          </p>
        </div>
        <button
          className="primary-button primary-button--full"
          data-testid="primary-action"
          onClick={onContinue}
          type="button"
        >
          {buttonLabel} <span aria-hidden="true">→</span>
        </button>
      </ScreenCard>

      <PopulationGraph
        habitatId={habitatId}
        points={points}
        title={`${copy.title}: Generations 0–3`}
      />
    </div>
  )
}
