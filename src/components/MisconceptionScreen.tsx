import { useState } from 'react'
import type { TraitGraphPoint } from '../simulation/index.ts'
import { PopulationGraph } from './PopulationGraph.tsx'
import { ScreenCard } from './ScreenCard.tsx'

type MisconceptionScreenProps = {
  graphPoints: readonly TraitGraphPoint[]
  recordedResponse: { selectedAnswer: string; isCorrect: boolean } | null
  onAnswer: (selectedAnswer: string, isCorrect: boolean) => void
  onContinue: () => void
}

const ANSWERS = [
  {
    id: 'individual-change',
    text: 'Each deer became faster because it needed to reach food.',
    isCorrect: false,
  },
  {
    id: 'population-selection',
    text: 'The deer already varied in inherited movement speed. More higher-speed deer reached food and reproduced, so their trait became more common in the population.',
    isCorrect: true,
  },
  {
    id: 'environment-created-trait',
    text: 'The distant food created a new higher-speed trait in every deer.',
    isCorrect: false,
  },
] as const

export function MisconceptionScreen({
  graphPoints,
  recordedResponse,
  onAnswer,
  onContinue,
}: MisconceptionScreenProps) {
  const [selectedId, setSelectedId] = useState(recordedResponse?.selectedAnswer ?? '')
  const selected = ANSWERS.find((answer) => answer.id === selectedId)

  return (
    <div className="analysis-layout">
      <ScreenCard eyebrow="Population check" title="What actually changed?">
        <fieldset className="choice-fieldset misconception-fieldset">
          <legend>Choose the best explanation from Generation 0 to Generation 5.</legend>
          <div className="choice-stack">
            {ANSWERS.map((answer) => (
              <label className="choice-card choice-card--reason" key={answer.id}>
                <input
                  checked={selectedId === answer.id}
                  name="misconception-check"
                  onChange={() => {
                    setSelectedId(answer.id)
                    onAnswer(answer.id, answer.isCorrect)
                  }}
                  type="radio"
                  value={answer.id}
                />
                <span>{answer.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {selected && (
          <div className={`feedback-box ${selected.isCorrect ? 'feedback-box--correct' : 'feedback-box--retry'}`} role="status">
            <strong>{selected.isCorrect ? 'Exactly.' : 'Look at who left offspring.'}</strong>
            <p>
              {selected.isCorrect
                ? 'Natural selection changed the population across generations. It did not make an individual deer change its inherited trait.'
                : 'The population already had different inherited speed traits. The environment favored an existing trait; it did not cause individuals to change because they needed to.'}
            </p>
          </div>
        )}

        <button
          className="primary-button primary-button--full"
          disabled={!selected?.isCorrect}
          onClick={onContinue}
          type="button"
        >
          Continue to evidence <span aria-hidden="true">→</span>
        </button>
      </ScreenCard>
      <PopulationGraph points={graphPoints} />
    </div>
  )
}
