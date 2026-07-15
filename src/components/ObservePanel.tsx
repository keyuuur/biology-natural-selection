import type { TraitCounts } from '../simulation/index.ts'

type ObservePanelProps = {
  counts: TraitCounts
  onContinue: () => void
}

export function ObservePanel({ counts, onContinue }: ObservePanelProps) {
  return (
    <section className="field-panel" aria-labelledby="observe-title">
      <p className="eyebrow">Generation 0 · Observe</p>
      <h2 id="observe-title">Variation already exists</h2>
      <p>
        All 20 deer belong to the same population. In this simplified model,
        movement speed is inherited from parents.
      </p>

      <div className="trait-stat-grid">
        <div className="trait-stat trait-stat--higher">
          <span className="trait-symbol" aria-hidden="true">»</span>
          <div><strong>{counts.higher_speed}</strong><span>Higher-speed</span></div>
        </div>
        <div className="trait-stat trait-stat--lower">
          <span className="trait-symbol" aria-hidden="true">•</span>
          <div><strong>{counts.lower_speed}</strong><span>Lower-speed</span></div>
        </div>
      </div>

      <div className="tracking-note">
        Rings and symbols are tracking markers. Movement speed—not ring color—is the
        modeled trait.
      </div>

      <button className="primary-button primary-button--full" onClick={onContinue} type="button">
        I observed the variation <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}
