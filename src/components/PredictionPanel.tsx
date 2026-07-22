import { useState } from 'react'
import { HABITAT_STUDENT_COPY, MODEL_SAFEGUARD_DISCLOSURES } from '../learning/index.ts'
import type { HabitatConfig, MorphId } from '../simulation/index.ts'
import { ScreenCard } from './ScreenCard.tsx'

type PredictionPanelProps = {
  habitat: HabitatConfig
  onSubmit: (outcome: MorphId | 'no_change', reason: string) => void
}

export function PredictionPanel({ habitat, onSubmit }: PredictionPanelProps) {
  const [outcome, setOutcome] = useState<MorphId | 'no_change' | null>(null)
  const [reason, setReason] = useState('')
  const copy = HABITAT_STUDENT_COPY[habitat.id]
  const canSubmit = outcome !== null && reason.trim().length >= 12

  return (
    <div data-testid={`prediction-${habitat.id}`}>
      <ScreenCard
      className="prediction-card"
      eyebrow={`Habitat ${habitat.id === 'reef_fish' ? '1 of 2' : '2 of 2'}`}
      title={copy.title}
      footer={
        <button
          className="primary-button"
          data-testid="primary-action"
          disabled={!canSubmit}
          onClick={() => outcome && onSubmit(outcome, reason)}
          type="button"
        >
          Lock prediction
        </button>
      }
    >
      <div className="prediction-layout">
        <div className={`variation-preview variation-preview--${habitat.id}`} aria-hidden="true">
          <div className="preview-organism preview-organism--mottled">{copy.morphLabels.camouflaged}</div>
          <div className="preview-organism preview-organism--solid">{copy.morphLabels.conspicuous}</div>
        </div>
        <div>
          <p className="lead">{copy.variationPrompt}</p>
          <p>{copy.predatorDirections}</p>
          <fieldset className="choice-fieldset">
            <legend>Which outcome do you predict?</legend>
            <div className="choice-stack">
              <label className={`choice-card${outcome === 'camouflaged' ? ' is-selected' : ''}`}>
                <input
                  checked={outcome === 'camouflaged'}
                  name="prediction"
                  onChange={() => setOutcome('camouflaged')}
                  type="radio"
                />
                <span>The {copy.morphLabels.camouflaged} will become a larger percentage.</span>
              </label>
              <label className={`choice-card${outcome === 'conspicuous' ? ' is-selected' : ''}`}>
                <input
                  checked={outcome === 'conspicuous'}
                  name="prediction"
                  onChange={() => setOutcome('conspicuous')}
                  type="radio"
                />
                <span>The {copy.morphLabels.conspicuous} will become a larger percentage.</span>
              </label>
              <label className={`choice-card${outcome === 'no_change' ? ' is-selected' : ''}`}>
                <input
                  checked={outcome === 'no_change'}
                  name="prediction"
                  onChange={() => setOutcome('no_change')}
                  type="radio"
                />
                <span>The percentages will stay about the same.</span>
              </label>
            </div>
          </fieldset>
          <label className="reasoning-field">
            <strong>Why do you predict that?</strong>
            <span>Connect visibility, predation, survival, and reproduction.</span>
            <textarea
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              value={reason}
            />
          </label>
          <p className="model-note">{MODEL_SAFEGUARD_DISCLOSURES.comparisonFloor}</p>
        </div>
      </div>
      </ScreenCard>
    </div>
  )
}
