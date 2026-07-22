import { useState } from 'react'
import type { CheckAttemptDraft } from '../game/sessionTypes.ts'
import type {
  FeedbackChoice,
  MisconceptionQuestionConfig,
} from '../learning/index.ts'
import { ScreenCard } from './ScreenCard.tsx'

type MisconceptionScreenProps = {
  question: MisconceptionQuestionConfig
  questionNumber: number
  recordedAttempt?: CheckAttemptDraft
  onAnswer: (answerId: string, correct: boolean) => void
  onContinue: () => void
}

const TEST_IDS: Readonly<Record<string, string>> = {
  'environmental-pressure:predation': 'option-environmental-predation',
  'environmental-pressure:need-created-pattern': 'option-organisms-chose-to-change',
  'environmental-pressure:fixed-population': 'option-fixed-population-model',
  'population-change:differential-success': 'option-survivors-reproduced',
  'population-change:similar-success': 'option-survivors-reproduced',
  'population-change:individual-choice': 'option-individuals-chose-to-change',
  'population-change:environment-created-variation': 'option-environment-created-trait',
  'fitness:survive-and-reproduce': 'option-survive-and-reproduce',
  'fitness:most-common-at-start': 'option-most-common-at-start',
  'fitness:survival-only': 'option-survival-only',
  'changed-environment:fitness-can-switch': 'option-background-dependent',
  'changed-environment:individuals-change': 'option-individuals-change',
  'changed-environment:camouflage-always-wins': 'option-one-trait-always-best',
}

function choiceTestId(questionId: string, choiceId: string) {
  return TEST_IDS[`${questionId}:${choiceId}`] ?? `option-${choiceId}`
}

function MisconceptionQuestion({
  question,
  questionNumber,
  recordedAttempt,
  onAnswer,
  onContinue,
}: MisconceptionScreenProps) {
  const restoredChoiceId = recordedAttempt?.finalAnswerId ?? recordedAttempt?.firstAnswerId ?? ''
  const [selectedId, setSelectedId] = useState(restoredChoiceId)
  const [checkedChoice, setCheckedChoice] = useState<FeedbackChoice | null>(() =>
    recordedAttempt?.finalAnswerId
      ? question.choices.find((choice) => choice.id === recordedAttempt.finalAnswerId) ?? null
      : null,
  )

  const selectedChoice = question.choices.find((choice) => choice.id === selectedId)
  const correct = checkedChoice?.isCorrect === true

  return (
    <ScreenCard
      className="misconception-card"
      eyebrow={`Science check ${questionNumber} of 4`}
      title="Check your natural selection model"
    >
      <div data-testid={`misconception-${questionNumber}`}>
        <fieldset className="choice-fieldset">
          <legend>{question.prompt}</legend>
          <div className="choice-stack">
            {question.choices.map((choice) => (
              <label
                className={`choice-card choice-card--reason${selectedId === choice.id ? ' is-selected' : ''}`}
                data-testid={choiceTestId(question.id, choice.id)}
                key={choice.id}
              >
                <input
                  checked={selectedId === choice.id}
                  name={`misconception-${question.id}`}
                  onChange={() => {
                    setSelectedId(choice.id)
                    setCheckedChoice(null)
                  }}
                  type="radio"
                  value={choice.id}
                />
                <span>{choice.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {checkedChoice && (
          <div
            className={`feedback-box ${correct ? 'feedback-box--correct' : 'feedback-box--retry'}`}
            data-testid="answer-feedback"
            role={correct ? undefined : 'alert'}
          >
            <strong>{correct ? 'Correct.' : 'Not quite. Try again.'}</strong>
            <p>{checkedChoice.feedback}</p>
          </div>
        )}

        {!correct ? (
          <button
            className="primary-button primary-button--full"
            data-testid="primary-action"
            disabled={!selectedChoice}
            onClick={() => {
              if (!selectedChoice) return
              setCheckedChoice(selectedChoice)
              onAnswer(selectedChoice.id, selectedChoice.isCorrect)
            }}
            type="button"
          >
            Check answer
          </button>
        ) : (
          <button
            className="primary-button primary-button--full"
            data-testid="primary-action"
            onClick={onContinue}
            type="button"
          >
            Continue <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </ScreenCard>
  )
}

export function MisconceptionScreen(props: MisconceptionScreenProps) {
  // Remounting the focused question resets local selection and feedback only when
  // the student advances, not when the reducer records an attempt.
  return <MisconceptionQuestion key={props.question.id} {...props} />
}
