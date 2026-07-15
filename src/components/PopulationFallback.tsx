import type { TraitCounts, TraitId } from '../simulation/index.ts'

type PopulationFallbackProps = {
  counts: TraitCounts
  generation: number
}

const TRAITS: Array<{ id: TraitId; label: string; symbol: string }> = [
  { id: 'higher_speed', label: 'Higher-speed', symbol: '»' },
  { id: 'lower_speed', label: 'Lower-speed', symbol: '•' },
]

export function PopulationFallback({
  counts,
  generation,
}: PopulationFallbackProps) {
  return (
    <div className="population-fallback" aria-label={`Generation ${generation} population`}>
      <p className="fallback-note">
        The 3D habitat is unavailable, so the complete field study is continuing with
        accessible population markers.
      </p>
      <div className="population-marker-grid">
        {TRAITS.flatMap((trait) =>
          Array.from({ length: counts[trait.id] }, (_, index) => (
            <span
              className={`population-marker population-marker--${trait.id}`}
              key={`${generation}-${trait.id}-${index}`}
              title={trait.label}
              aria-label={`${trait.label} deer`}
            >
              <span aria-hidden="true">{trait.symbol}</span>
            </span>
          )),
        )}
      </div>
    </div>
  )
}
