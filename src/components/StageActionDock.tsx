import type { ReactNode } from 'react'

type StageActionDockProps = {
  status: ReactNode
  primaryLabel: string
  disabled?: boolean
  disabledReason?: string
  onPrimary?: () => void
  formId?: string
  testId?: string
}

/**
 * Keeps the one next action visible while a student reads a longer field-study
 * screen. It deliberately lives in the document flow rather than creating a
 * second scrolling region.
 */
export function StageActionDock({
  status,
  primaryLabel,
  disabled = false,
  disabledReason,
  onPrimary,
  formId,
  testId = 'primary-action',
}: StageActionDockProps) {
  return (
    <div className="stage-action-dock" data-testid="stage-action-dock">
      <div className="stage-action-dock__copy">
        <strong>{status}</strong>
        {disabled && disabledReason && <span>{disabledReason}</span>}
      </div>
      <button
        className="primary-button"
        data-testid={testId}
        disabled={disabled}
        form={formId}
        onClick={onPrimary}
        type={formId ? 'submit' : 'button'}
      >
        {primaryLabel}
      </button>
    </div>
  )
}
