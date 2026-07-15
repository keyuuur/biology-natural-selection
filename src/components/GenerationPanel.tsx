import type { GenerationResult, TraitCounts } from '../simulation/index.ts'

type GenerationPanelProps = {
  counts: TraitCounts
  currentGeneration: number
  isAnimating: boolean
  latestResult: GenerationResult | undefined
  onRun: () => void
}

function percent(part: number, whole: number) {
  return Math.round((part / whole) * 100)
}

export function GenerationPanel({
  counts,
  currentGeneration,
  isAnimating,
  latestResult,
  onRun,
}: GenerationPanelProps) {
  const nextGeneration = currentGeneration + 1

  return (
    <section className="field-panel" aria-labelledby="generation-title">
      <p className="eyebrow">Run the model · Generation {currentGeneration} of 5</p>
      <h2 id="generation-title">
        {currentGeneration === 0 ? 'Test your prediction' : 'Record what changed'}
      </h2>

      <div className="current-population">
        <p>Current offspring population</p>
        <div>
          <span className="count-pill count-pill--higher">» {counts.higher_speed}/20</span>
          <span className="count-pill count-pill--lower">• {counts.lower_speed}/20</span>
        </div>
      </div>

      {latestResult ? (
        <div className="generation-observation" aria-live="polite">
          <strong>Generation {latestResult.generation} observation</strong>
          <p>
            {latestResult.survivorCounts.higher_speed}/{latestResult.startingCounts.higher_speed}
            {' '}({percent(latestResult.survivorCounts.higher_speed, latestResult.startingCounts.higher_speed)}%)
            {' '}higher-speed deer and {latestResult.survivorCounts.lower_speed}/{latestResult.startingCounts.lower_speed}
            {' '}({percent(latestResult.survivorCounts.lower_speed, latestResult.startingCounts.lower_speed)}%)
            {' '}lower-speed deer reached enough food.
          </p>
          <p className="observation-transition">
            Those 12 parents produced a visibly new generation of 20 offspring.
          </p>
        </div>
      ) : (
        <div className="generation-observation generation-observation--empty">
          Press Run Generation to watch which inherited variants reach the 12 food opportunities.
        </div>
      )}

      <div className="science-reminder">
        Traits do not change within a deer’s lifetime. Watch the population proportions.
      </div>

      <button
        className="primary-button primary-button--full run-button"
        disabled={isAnimating || currentGeneration >= 5}
        onClick={onRun}
        type="button"
      >
        {isAnimating ? 'Generation in progress…' : `Run Generation ${nextGeneration}`}
      </button>
    </section>
  )
}
