import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CerDraft } from '../game/sessionTypes.ts'
import {
  CER_FORMATIVE_NOTE,
  CER_REASONING_PROMPT,
  CER_REQUIRED_VOCABULARY,
  type CerClaimChoice,
} from '../learning/index.ts'
import { ScreenCard } from './ScreenCard.tsx'

export type CerEvidenceItem = {
  id: string
  label: string
  text: string
}

export const CER_FIELD_REPORT_FORM_ID = 'cer-field-report-form'

export type CerActionDockState = {
  formId: typeof CER_FIELD_REPORT_FORM_ID
  canComplete: boolean
  reasoningLength: number
  minimumReasoningLength: number
}

type CerScreenProps = {
  claims: readonly CerClaimChoice[]
  evidenceItems: readonly CerEvidenceItem[]
  initialDraft: CerDraft
  onDraftChange?: (draft: CerDraft) => void
  onComplete: (cer: CerDraft) => void
  /** Optional shared action dock rendered before the report sections. */
  renderActionDock?: (state: CerActionDockState) => ReactNode
}

const MIN_REASONING_LENGTH = 40
const KEYBOARD_VIEWPORT_REDUCTION_PX = 160

/**
 * Safari reduces visualViewport.height when the software keyboard covers the
 * reading surface. A reference height that resets on a meaningful width change
 * avoids mistaking rotation for keyboard appearance.
 */
function useKeyboardViewport(): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const referenceRef = useRef<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      const current = { width: viewport.width, height: viewport.height }
      const reference = referenceRef.current
      const widthChanged = reference !== null && Math.abs(current.width - reference.width) >= 80

      if (reference === null || widthChanged) {
        referenceRef.current = current
        setKeyboardVisible(false)
        return
      }

      if (current.height > reference.height) {
        referenceRef.current = current
      }
      setKeyboardVisible((referenceRef.current!.height - current.height) >= KEYBOARD_VIEWPORT_REDUCTION_PX)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  return keyboardVisible
}

export function CerScreen({
  claims,
  evidenceItems,
  initialDraft,
  onDraftChange,
  onComplete,
  renderActionDock,
}: CerScreenProps) {
  const [draft, setDraft] = useState<CerDraft>(initialDraft)
  const keyboardVisible = useKeyboardViewport()
  const selectedClaim = claims.find((claim) => claim.id === draft.claimId)
  const reasoningLength = draft.reasoning.trim().length
  const canComplete = draft.claimId !== null && reasoningLength >= MIN_REASONING_LENGTH
  const dockState: CerActionDockState = {
    formId: CER_FIELD_REPORT_FORM_ID,
    canComplete,
    reasoningLength,
    minimumReasoningLength: MIN_REASONING_LENGTH,
  }

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
        id={CER_FIELD_REPORT_FORM_ID}
        onSubmit={(event) => {
          event.preventDefault()
          if (canComplete) onComplete({ ...draft, reasoning: draft.reasoning.trim() })
        }}
      >
        <section aria-label="Field report steps" className="cer-orientation">
          <h3>Three steps to complete your field report</h3>
          <ol>
            <li>Choose the claim that matches both habitats.</li>
            <li>Use the labeled evidence you selected.</li>
            <li>Explain how survival, reproduction, and offspring changed the population.</li>
          </ol>
        </section>

        {!keyboardVisible && renderActionDock?.(dockState)}

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
          >
            <strong>{selectedClaim.isSupported ? 'This claim matches your data.' : 'Check this claim against your evidence.'}</strong>
            <p>{selectedClaim.feedback}</p>
          </div>
        )}

        <section className="cer-evidence" aria-labelledby="cer-evidence-title">
          <h3 id="cer-evidence-title">Evidence bank</h3>
          <p>Use each labeled observation when you explain the pattern across both habitats.</p>
          <ol className="cer-evidence-bank" data-testid="cer-evidence-bank">
            {evidenceItems.map((evidence) => (
              <li key={evidence.id}>
                <strong>{evidence.label}</strong>
                <span>{evidence.text}</span>
              </li>
            ))}
          </ol>
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

        {(!renderActionDock || keyboardVisible) && (
          <button
            className="primary-button primary-button--full cer-keyboard-submit"
            data-testid={renderActionDock && keyboardVisible ? 'cer-keyboard-submit' : 'primary-action'}
            disabled={!canComplete}
            type="submit"
          >
            Complete the field report <span aria-hidden="true">→</span>
          </button>
        )}

        <div className="vocabulary-bank" aria-label="Reasoning vocabulary">
          {CER_REQUIRED_VOCABULARY.map((term) => <span key={term}>{term}</span>)}
        </div>
        <p className="cer-reminder">{CER_FORMATIVE_NOTE}</p>
        <p className="response-progress">
          {reasoningLength < MIN_REASONING_LENGTH
            ? `Add ${MIN_REASONING_LENGTH - reasoningLength} more characters to complete your reasoning.`
            : 'Your reasoning is long enough to submit.'}
        </p>

      </form>
    </ScreenCard>
  )
}
