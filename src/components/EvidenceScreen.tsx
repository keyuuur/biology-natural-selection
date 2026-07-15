import type { GenerationResult, TraitGraphPoint } from '../simulation/index.ts'
import { PopulationGraph } from './PopulationGraph.tsx'
import { ScreenCard } from './ScreenCard.tsx'

type EvidenceScreenProps = {
  graphPoints: readonly TraitGraphPoint[]
  generations: readonly GenerationResult[]
  selectedGenerations: readonly number[]
  survivorGeneration: number | null
  onToggleGeneration: (generation: number) => void
  onSelectSurvivorGeneration: (generation: number) => void
  onContinue: () => void
}

function survivalText(result: GenerationResult) {
  const higherPercent = Math.round(
    (result.survivorCounts.higher_speed / result.startingCounts.higher_speed) * 100,
  )
  const lowerPercent = Math.round(
    (result.survivorCounts.lower_speed / result.startingCounts.lower_speed) * 100,
  )
  return `G${result.generation}: ${result.survivorCounts.higher_speed}/${result.startingCounts.higher_speed} (${higherPercent}%) higher-speed vs. ${result.survivorCounts.lower_speed}/${result.startingCounts.lower_speed} (${lowerPercent}%) lower-speed reached enough food.`
}

export function EvidenceScreen({
  graphPoints,
  generations,
  selectedGenerations,
  survivorGeneration,
  onToggleGeneration,
  onSelectSurvivorGeneration,
  onContinue,
}: EvidenceScreenProps) {
  const selectedSet = new Set(selectedGenerations)
  const hasStart = selectedSet.has(0)
  const hasEnd = selectedSet.has(5)
  const isComplete = hasStart && hasEnd && survivorGeneration !== null

  return (
    <div className="evidence-layout">
      <ScreenCard eyebrow="Evidence notebook" title="Choose data that supports a population claim">
        <ol className="evidence-steps">
          <li className={hasStart ? 'is-complete' : ''}>Select Generation 0 as your starting evidence.</li>
          <li className={hasEnd ? 'is-complete' : ''}>Select Generation 5 as your ending evidence.</li>
          <li className={survivorGeneration !== null ? 'is-complete' : ''}>Select one survival/reproduction comparison.</li>
        </ol>

        <fieldset className="choice-fieldset survivor-evidence">
          <legend>Within-generation evidence</legend>
          <div className="choice-stack choice-stack--compact">
            {generations.map((result) => (
              <label className="choice-card choice-card--reason" key={result.generation}>
                <input
                  checked={survivorGeneration === result.generation}
                  name="survivor-evidence"
                  onChange={() => onSelectSurvivorGeneration(result.generation)}
                  type="radio"
                  value={result.generation}
                />
                <span>{survivalText(result)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          className="primary-button primary-button--full"
          disabled={!isComplete}
          onClick={onContinue}
          type="button"
        >
          Use this evidence <span aria-hidden="true">→</span>
        </button>
      </ScreenCard>

      <PopulationGraph
        onToggleGeneration={onToggleGeneration}
        points={graphPoints}
        selectedGenerations={selectedSet}
        selectionHint="Tap Generation 0 and Generation 5. You may inspect other generations too."
      />
    </div>
  )
}
