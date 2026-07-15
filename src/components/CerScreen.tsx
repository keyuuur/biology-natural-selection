import { useState } from 'react'
import type { TraitId } from '../simulation/index.ts'
import type { CerDraft } from '../game/sessionTypes.ts'
import { ScreenCard } from './ScreenCard.tsx'

type CerScreenProps = {
  evidenceTexts: readonly string[]
  onComplete: (cer: CerDraft) => void
}

export function CerScreen({ evidenceTexts, onComplete }: CerScreenProps) {
  const [claim, setClaim] = useState<TraitId | null>(null)
  const [reasoning, setReasoning] = useState('')
  const canComplete = claim !== null && reasoning.trim().length > 0

  return (
    <ScreenCard
      className="cer-card"
      eyebrow="Claim · Evidence · Reasoning"
      title="Build your field report"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (claim && reasoning.trim()) onComplete({ claim, reasoning: reasoning.trim() })
        }}
      >
        <fieldset className="choice-fieldset">
          <legend>Claim: Which inherited trait became more common?</legend>
          <div className="claim-grid">
            <label className="choice-card">
              <input
                checked={claim === 'higher_speed'}
                name="cer-claim"
                onChange={() => setClaim('higher_speed')}
                type="radio"
              />
              <span><strong>Higher-speed</strong><small>became more common</small></span>
            </label>
            <label className="choice-card">
              <input
                checked={claim === 'lower_speed'}
                name="cer-claim"
                onChange={() => setClaim('lower_speed')}
                type="radio"
              />
              <span><strong>Lower-speed</strong><small>became more common</small></span>
            </label>
          </div>
        </fieldset>

        <section className="cer-evidence" aria-labelledby="cer-evidence-title">
          <h3 id="cer-evidence-title">Your selected evidence</h3>
          <ul>
            {evidenceTexts.map((evidence) => <li key={evidence}>{evidence}</li>)}
          </ul>
        </section>

        <label className="reasoning-field" htmlFor="cer-reasoning">
          <strong>Reasoning</strong>
          <span>
            Explain how inherited variation, limited food, survival and reproduction,
            and offspring caused the population frequency to change.
          </span>
          <textarea
            id="cer-reasoning"
            onChange={(event) => setReasoning(event.target.value)}
            placeholder="Because the movement-speed trait was inherited…"
            rows={6}
            value={reasoning}
          />
        </label>

        <div className="cer-reminder">
          Your response is saved for review. This first version checks completion, not the meaning of free text.
        </div>

        <button className="primary-button primary-button--full" disabled={!canComplete} type="submit">
          Complete field report <span aria-hidden="true">→</span>
        </button>
      </form>
    </ScreenCard>
  )
}
