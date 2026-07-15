import type { GameStage } from '../game/sessionTypes.ts'

type GameHeaderProps = {
  stage: GameStage
  generation: number
}

const STAGE_PROGRESS: Record<GameStage, number> = {
  mission: 1,
  observe: 2,
  prediction: 3,
  generations: 4,
  misconception: 5,
  evidence: 6,
  cer: 7,
  results: 8,
}

const STAGE_LABELS: Record<GameStage, string> = {
  mission: 'Mission briefing',
  observe: 'Observe variation',
  prediction: 'Make a prediction',
  generations: 'Run generations',
  misconception: 'Explain the change',
  evidence: 'Select evidence',
  cer: 'Build your CER',
  results: 'Field report',
}

export function GameHeader({ stage, generation }: GameHeaderProps) {
  const step = STAGE_PROGRESS[stage]
  const label = STAGE_LABELS[stage]

  return (
    <header className="game-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">NS</span>
        <div>
          <p className="brand-kicker">Natural Selection Field Lab</p>
          <h1>Trait Tracker</h1>
        </div>
      </div>
      <div className="mission-progress">
        <div className="mission-progress__copy">
          <span>{label}</span>
          {stage === 'generations' && <strong>Generation {generation} of 5</strong>}
        </div>
        <div
          aria-valuemax={8}
          aria-valuemin={1}
          aria-valuenow={step}
          aria-valuetext={`Step ${step} of 8: ${label}`}
          className="progress-track"
          role="progressbar"
        >
          <span style={{ width: `${(step / 8) * 100}%` }} />
        </div>
      </div>
    </header>
  )
}
