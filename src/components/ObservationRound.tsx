import { useState } from 'react'
import { HABITAT_STUDENT_COPY } from '../learning/index.ts'
import type { HabitatId, MorphCounts, PlayerRoundMetrics } from '../simulation/index.ts'

type ObservationRoundProps = {
  habitatId: HabitatId
  habitatTitle: string
  generation: number
  counts: MorphCounts
  roundSeed: number
  onComplete: (metrics: PlayerRoundMetrics) => void
}

/**
 * A complete non-pointer route through the same biology model. It never
 * imports Phaser, so keyboard and screen-reader users can finish every science
 * task even when live predator tapping is not their chosen route.
 */
export function ObservationRound({
  habitatId,
  habitatTitle,
  generation,
  counts,
  roundSeed,
  onComplete,
}: ObservationRoundProps) {
  const [resolving, setResolving] = useState(false)
  const labels = HABITAT_STUDENT_COPY[habitatId].morphLabels

  function resolveGeneration() {
    if (resolving) return
    setResolving(true)
    onComplete({
      seed: roundSeed,
      manualCatches: { camouflaged: 0, conspicuous: 0 },
      misses: 0,
      protectedEscapes: 0,
      elapsedMs: 0,
      timingMode: 'standard',
      inputMode: 'observation',
      fallbackUsed: false,
    })
  }

  return (
    <section
      aria-labelledby={`observation-round-${habitatId}`}
      className="observation-fallback observation-round"
      data-testid="dom-observation-study"
    >
      <p className="eyebrow">Observation study</p>
      <h2 data-stage-heading="" id={`observation-round-${habitatId}`} tabIndex={-1}>
        {habitatTitle} · Generation {generation}
      </h2>
      <div className="fallback-population" aria-label="Starting population">
        <span><i className="morph-swatch morph-swatch--camo" />{counts.camouflaged} {labels.camouflaged}</span>
        <span><i className="morph-swatch morph-swatch--solid" />{counts.conspicuous} {labels.conspicuous}</span>
      </div>
      <p>
        The model will resolve 12 predation events using the same population rules. Then you will
        examine survivors, offspring, and population percentages.
      </p>
      <p className="model-note">
        This route reaches the same evidence, science checks, and field report. Predator
        performance is not part of an Observation study.
      </p>
      <button
        className="primary-button"
        data-testid="start-generation"
        disabled={resolving}
        onClick={resolveGeneration}
        type="button"
      >
        {resolving ? 'Resolving population…' : 'Resolve this generation'}
      </button>
    </section>
  )
}
