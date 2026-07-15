import type { NaturalSelectionResult, TraitGraphPoint } from '../simulation/index.ts'
import { PopulationGraph } from './PopulationGraph.tsx'
import { ScreenCard } from './ScreenCard.tsx'

type ResultsScreenProps = {
  result: NaturalSelectionResult
  graphPoints: readonly TraitGraphPoint[]
  storageMessage: string
  onReplay: () => void
}

const PREDICTION_LABELS = {
  higher_speed: 'Higher-speed would become more common',
  lower_speed: 'Lower-speed would become more common',
  no_change: 'The population mix would not change much',
} as const

export function ResultsScreen({
  result,
  graphPoints,
  storageMessage,
  onReplay,
}: ResultsScreenProps) {
  const predictedHigher = result.prediction.trait === 'higher_speed'
  const predictionLabel = result.prediction.trait
    ? PREDICTION_LABELS[result.prediction.trait]
    : 'No prediction recorded'

  return (
    <div className="results-layout">
      <ScreenCard
        className="results-card"
        eyebrow="Field study complete"
        title="The population changed across generations"
      >
        <div className="result-hero">
          <div className="result-badge" aria-hidden="true">✓</div>
          <div>
            <strong>Generation 0 → Generation 5</strong>
            <p>Higher-speed: 50% → 90% · Lower-speed: 50% → 10%</p>
          </div>
        </div>

        <div className="result-summary-grid">
          <section>
            <p className="eyebrow">Prediction</p>
            <h3>{predictedHigher ? 'Supported by the data' : 'Not supported by the data'}</h3>
            <p>{predictionLabel}</p>
            <small>{result.prediction.reason}</small>
          </section>
          <section>
            <p className="eyebrow">Key idea</p>
            <h3>Populations evolve</h3>
            <p>Individual deer kept the same modeled trait throughout their lives.</p>
          </section>
        </div>

        <section className="final-cer">
          <p className="eyebrow">Your CER</p>
          <h3>{result.cer.claim}</h3>
          <ul>{result.cer.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
          <blockquote>{result.cer.reasoning}</blockquote>
        </section>

        <div className="feedback-box feedback-box--correct">
          <strong>Natural selection changed the population.</strong>
          <p>
            Existing inherited variation affected which deer reached limited food and
            reproduced. Their offspring inherited those modeled traits, changing the
            trait frequency across generations.
          </p>
        </div>

        <p className="storage-status" role="status">{storageMessage}</p>

        <details className="result-json">
          <summary>Teacher/debug result object</summary>
          <p>This local record contains no student name, period, email, or other identity field.</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </details>

        <button className="secondary-button secondary-button--full" onClick={onReplay} type="button">
          Replay with a new session
        </button>
      </ScreenCard>
      <PopulationGraph points={graphPoints} />
    </div>
  )
}
