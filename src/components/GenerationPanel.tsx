import { HABITAT_STUDENT_COPY, MODEL_SAFEGUARD_DISCLOSURES } from '../learning/index.ts'
import type { GenerationResult, HabitatConfig } from '../simulation/index.ts'
import { ScreenCard } from './ScreenCard.tsx'

type GenerationPanelProps = {
  habitat: HabitatConfig
  result: GenerationResult
  onContinue: () => void
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

export function GenerationPanel({ habitat, result, onContinue }: GenerationPanelProps) {
  const isFinal = result.generation === habitat.generationCount
  const finalLabel = habitat.id === 'reef_fish' ? 'Review reef evidence' : 'Compare the habitats'
  const copy = HABITAT_STUDENT_COPY[habitat.id]

  return (
    <ScreenCard
      className="generation-card"
      eyebrow={`${copy.title} · data checkpoint`}
      title={`Generation ${result.generation} complete`}
      footer={
        <button
          className="primary-button"
          data-testid={isFinal ? 'primary-action' : 'continue-generation'}
          onClick={onContinue}
          type="button"
        >
          {isFinal ? finalLabel : `Continue to Generation ${result.generation + 1}`}
        </button>
      }
    >
      <div data-generation={result.generation} data-testid="generation-summary">
        <p className="lead">{copy.generationTransition}</p>
        <div className="generation-flow" aria-label="Generation population flow">
          <section>
            <span>1</span><strong>40 started</strong>
            <small>{result.startingCounts.camouflaged} mottled · {result.startingCounts.conspicuous} solid</small>
          </section>
          <i aria-hidden="true">→</i>
          <section>
            <span>2</span><strong>12 caught</strong>
            <small>
              {result.manualCatches.camouflaged + result.manualCatches.conspicuous} by you ·{' '}
              {result.automaticCatches.camouflaged + result.automaticCatches.conspicuous} modeled
            </small>
          </section>
          <i aria-hidden="true">→</i>
          <section>
            <span>3</span><strong>28 survived</strong>
            <small>{result.survivorCounts.camouflaged} mottled · {result.survivorCounts.conspicuous} solid</small>
          </section>
          <i aria-hidden="true">→</i>
          <section>
            <span>4</span><strong>40 offspring</strong>
            <small>{result.offspringCounts.camouflaged} mottled · {result.offspringCounts.conspicuous} solid</small>
          </section>
        </div>

        <div className="rate-comparison">
          <section className="morph-stat morph-stat--camo">
            <p>Mottled-pattern survival rate</p>
            <strong>{percent(result.survivorCounts.camouflaged, result.startingCounts.camouflaged)}%</strong>
            <span>{result.survivorCounts.camouflaged} of {result.startingCounts.camouflaged} survived</span>
          </section>
          <section className="morph-stat morph-stat--solid">
            <p>Solid-pattern survival rate</p>
            <strong>{percent(result.survivorCounts.conspicuous, result.startingCounts.conspicuous)}%</strong>
            <span>{result.survivorCounts.conspicuous} of {result.startingCounts.conspicuous} survived</span>
          </section>
        </div>

        <div className="model-disclosure">
          <p>{MODEL_SAFEGUARD_DISCLOSURES.automaticCompletion}</p>
          {result.protectedEscapes > 0 && <p>{MODEL_SAFEGUARD_DISCLOSURES.protectedEscape}</p>}
        </div>
      </div>
    </ScreenCard>
  )
}
