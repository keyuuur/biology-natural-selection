import { useState } from 'react'
import type { CerDraft } from '../game/sessionTypes.ts'
import {
  CER_FORMATIVE_NOTE,
  CER_REASONING_PROMPT,
  CER_REQUIRED_VOCABULARY,
  type CerClaimChoice,
} from '../learning/index.ts'
import { ScreenCard } from './ScreenCard.tsx'

type CerScreenProps = {
  claims: readonly CerClaimChoice[]
  evidenceTexts: readonly string[]
  initialDraft: CerDraft
  onDraftChange?: (draft: CerDraft) => void
  onComplete: (cer: CerDraft) => void
}

const MIN_REASONING_LENGTH = 40

export function CerScreen({
  claims,
  evidenceTexts,
  initialDraft,
  onDraftChange,
  onComplete,
}: CerScreenProps) {
  const [draft, setDraft] = useState<CerDraft>(initialDraft)
  const selectedClaim = claims.find((claim) => claim.id === draft.claimId)
  const reasoningLength = draft.reasoning.trim().length
  const canComplete = draft.claimId !== null && reasoningLength >= MIN_REASONING_LENGTH

  function updateDraft(nextDraft: CerDraft) {
    setDraft(nextDraft)
    onDraftChange?.(nextDraft)
  }

  return (
    <ScreenCard
      className="cer-card"
      eyebrow="Claim · Evidence · Reasoning"
      title="Build your field report"
    >
      <form
        data-testid="cer-screen"
        onSubmit={(event) => {
          event.preventDefault()
          if (canComplete) onComplete({ ...draft, reasoning: draft.reasoning.trim() })
        }}
      >
        <fieldset className="choice-fieldset">
          <legend>Claim: What conclusion matches the results from both habitats?</legend>
          <div className="choice-stack">
            {claims.map((claim) => (
              <label
                className={`choice-card choice-card--reason${draft.claimId === claim.id ? ' is-selected' : ''}`}
                data-testid={
                  claim.isSupported
                    ? 'cer-claim-population-change'
                    : `cer-claim-${claim.id}`
                }
                key={claim.id}
              >
                <input
                  checked={draft.claimId === claim.id}
                  name="cer-claim"
                  onChange={() => updateDraft({ ...draft, claimId: claim.id })}
                  type="radio"
                  value={claim.id}
                />
                <span>{claim.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {selectedClaim && (
          <div
            className={`feedback-box ${selectedClaim.isSupported ? 'feedback-box--correct' : 'feedback-box--retry'}`}
            role="status"
          >
            <strong>{selectedClaim.isSupported ? 'This claim matches your data.' : 'Check this claim against your evidence.'}</strong>
            <p>{selectedClaim.feedback}</p>
          </div>
        )}

        <section className="cer-evidence" aria-labelledby="cer-evidence-title">
          <h3 id="cer-evidence-title">Your selected evidence</h3>
          <ul>
            {evidenceTexts.map((evidence) => <li key={evidence}>{evidence}</li>)}
          </ul>
        </section>

        <label className="reasoning-field" htmlFor="cer-reasoning">
          <strong>Reasoning</strong>
          <span>{CER_REASONING_PROMPT}</span>
          <textarea
            data-testid="cer-reasoning"
            id="cer-reasoning"
            onChange={(event) => updateDraft({ ...draft, reasoning: event.target.value })}
            placeholder="The populations began with inherited variation…"
            rows={6}
            value={draft.reasoning}
          />
        </label>

        <div className="vocabulary-bank" aria-label="Reasoning vocabulary">
          {CER_REQUIRED_VOCABULARY.map((term) => <span key={term}>{term}</span>)}
        </div>
        <p className="cer-reminder">{CER_FORMATIVE_NOTE}</p>
        <p aria-live="polite" className="response-progress">
          {reasoningLength < MIN_REASONING_LENGTH
            ? `Add ${MIN_REASONING_LENGTH - reasoningLength} more characters to complete your reasoning.`
            : 'Your reasoning is long enough to submit.'}
        </p>

        <button
          className="primary-button primary-button--full"
          data-testid="primary-action"
          disabled={!canComplete}
          type="submit"
        >
          Complete the field report <span aria-hidden="true">→</span>
        </button>
      </form>
    </ScreenCard>
  )
}
