import { useState } from 'react'
import type { PredictedOutcome } from '../simulation/index.ts'

type PredictionPanelProps = {
  onSubmit: (trait: PredictedOutcome, reason: string) => void
}

const OUTCOMES: Array<{ value: PredictedOutcome; label: string; detail: string }> = [
  { value: 'higher_speed', label: 'Higher-speed', detail: 'will become more common' },
  { value: 'lower_speed', label: 'Lower-speed', detail: 'will become more common' },
  { value: 'no_change', label: 'No major change', detail: 'the mix will stay similar' },
]

const REASONS = [
  'Limited, distant food may affect which deer reach enough food and leave offspring.',
  'Individual deer will choose to change their movement speed when they need food.',
  'The distant food will create a brand-new inherited trait in every deer.',
]

export function PredictionPanel({ onSubmit }: PredictionPanelProps) {
  const [outcome, setOutcome] = useState<PredictedOutcome | null>(null)
  const [reason, setReason] = useState('')
  const canSubmit = outcome !== null && reason.length > 0

  return (
    <form
      className="field-panel prediction-panel"
      onSubmit={(event) => {
        event.preventDefault()
        if (outcome && reason) onSubmit(outcome, reason)
      }}
    >
      <p className="eyebrow">Before Generation 1 · Predict</p>
      <h2>What will happen after five generations?</h2>
      <p>Your prediction is a scientific forecast. It is okay if the evidence later does not support it.</p>

      <fieldset className="choice-fieldset">
        <legend>Choose an outcome</legend>
        <div className="choice-stack">
          {OUTCOMES.map((option) => (
            <label className="choice-card" key={option.value}>
              <input
                checked={outcome === option.value}
                name="predicted-outcome"
                onChange={() => setOutcome(option.value)}
                type="radio"
                value={option.value}
              />
              <span><strong>{option.label}</strong><small>{option.detail}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="choice-fieldset">
        <legend>Why do you predict that?</legend>
        <div className="choice-stack choice-stack--compact">
          {REASONS.map((option) => (
            <label className="choice-card choice-card--reason" key={option}>
              <input
                checked={reason === option}
                name="prediction-reason"
                onChange={() => setReason(option)}
                type="radio"
                value={option}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button className="primary-button primary-button--full" disabled={!canSubmit} type="submit">
        Lock prediction <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
