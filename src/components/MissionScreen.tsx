import { DEFAULT_SCENARIO } from '../simulation/index.ts'
import { ScreenCard } from './ScreenCard.tsx'

type MissionScreenProps = {
  onBegin: () => void
}

export function MissionScreen({ onBegin }: MissionScreenProps) {
  return (
    <ScreenCard
      className="mission-card"
      eyebrow="Field assignment · 10–15 minutes"
      title="Why does one inherited trait become more common?"
      footer={
        <button className="primary-button" onClick={onBegin} type="button">
          Begin field study <span aria-hidden="true">→</span>
        </button>
      }
    >
      <div className="mission-brief">
        <div className="mission-illustration" aria-hidden="true">
          <span className="sun-disc" />
          <span className="hill hill--back" />
          <span className="hill hill--front" />
          <span className="deer-token deer-token--higher">»</span>
          <span className="deer-token deer-token--lower">•</span>
        </div>
        <div className="mission-copy">
          <p className="lead">
            You are tracking one deer population through five generations while
            limited food is spread far apart.
          </p>
          <ul className="mission-checklist">
            <li><strong>Observe</strong> inherited movement-speed variation.</li>
            <li><strong>Predict</strong> which trait will become more common.</li>
            <li><strong>Collect</strong> survival and graph evidence.</li>
            <li><strong>Explain</strong> the population change with a CER.</li>
          </ul>
          <div className="science-notice">
            <strong>Simplified model:</strong> Movement speed is treated as an
            inherited trait. The environment favors existing variation; it does not
            make an individual deer change because it needs to.
          </div>
          <p className="mission-pressure">
            <span aria-hidden="true">12</span>
            Only {DEFAULT_SCENARIO.feedingSlots} of 20 deer can reach enough food to
            survive and reproduce each generation.
          </p>
        </div>
      </div>
    </ScreenCard>
  )
}
