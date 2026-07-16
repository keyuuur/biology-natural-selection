import type { GameStage } from '../game/sessionTypes.ts'

type GameHeaderProps = {
  stage: GameStage
  habitatLabel?: string
  generation?: number
}

const STAGE_META: Record<GameStage, { step: number; label: string }> = {
  mission: { step: 1, label: 'Mission briefing' },
  timing: { step: 1, label: 'Choose timing' },
  habitat_intro: { step: 2, label: 'Observe variation' },
  prediction: { step: 2, label: 'Make a prediction' },
  round: { step: 3, label: 'Predator rounds' },
  generation_review: { step: 3, label: 'Generation evidence' },
  habitat_summary: { step: 4, label: 'Habitat evidence' },
  evidence: { step: 5, label: 'Compare evidence' },
  checks: { step: 6, label: 'Science checks' },
  cer: { step: 7, label: 'Build your CER' },
  results: { step: 8, label: 'Study results' },
}

export function GameHeader({ stage, habitatLabel, generation }: GameHeaderProps) {
  const meta = STAGE_META[stage]

  return (
    <header className="game-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">NS</span>
        <div>
          <p className="brand-kicker">Natural Selection Field Lab</p>
          <h1>Natural Selection: Predator &amp; Camouflage</h1>
        </div>
      </div>
      <div className="mission-progress">
        <div className="mission-progress__copy">
          <span>{meta.label}</span>
          {stage === 'round' && habitatLabel && generation && (
            <strong>{habitatLabel} · Generation {generation} of 3</strong>
          )}
        </div>
        <div
          aria-valuemax={8}
          aria-valuemin={1}
          aria-valuenow={meta.step}
          aria-valuetext={`Step ${meta.step} of 8: ${meta.label}`}
          className="progress-track"
          role="progressbar"
        >
          <span style={{ width: `${(meta.step / 8) * 100}%` }} />
        </div>
      </div>
    </header>
  )
}
