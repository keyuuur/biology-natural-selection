import { HABITAT_STUDENT_COPY } from './content.ts'
import { formatPercent, summarizeMorphOutcome } from './outcomes.ts'
import type {
  CerClaimChoice,
  FeedbackChoice,
  HabitatOutcome,
  MisconceptionQuestionConfig,
} from './types.ts'

function pressureQuestion(): MisconceptionQuestionConfig {
  return {
    id: 'environmental-pressure',
    prompt: 'What environmental pressure affected both populations in this model?',
    choices: [
      {
        id: 'predation',
        text: 'Predation: organisms that were detected were removed before reproduction.',
        isCorrect: true,
        feedback:
          'Correct. Predation affected which inherited patterns survived and had a chance to reproduce.',
      },
      {
        id: 'need-created-pattern',
        text: 'The need to hide caused individual organisms to develop a better pattern.',
        isCorrect: false,
        feedback:
          'Individuals did not develop a needed inherited pattern. Both patterns already existed before predation.',
      },
      {
        id: 'fixed-population',
        text: 'Keeping the displayed population at 40 was the environmental pressure.',
        isCorrect: false,
        feedback:
          'Forty is a classroom-model setting. The environmental pressure acting on the organisms was predation.',
      },
    ],
  }
}

function mostChangedOutcome(outcomes: readonly HabitatOutcome[]): HabitatOutcome {
  if (outcomes.length === 0) {
    throw new Error('At least one habitat outcome is required.')
  }
  return [...outcomes].sort((left, right) => {
    const leftSummary = summarizeMorphOutcome(left)
    const rightSummary = summarizeMorphOutcome(right)
    return (
      Math.abs(rightSummary.endPercent - rightSummary.startPercent) -
      Math.abs(leftSummary.endPercent - leftSummary.startPercent)
    )
  })[0]
}

function changeQuestion(outcomes: readonly HabitatOutcome[]): MisconceptionQuestionConfig {
  const outcome = mostChangedOutcome(outcomes)
  const summary = summarizeMorphOutcome(outcome)
  const habitat = HABITAT_STUDENT_COPY[outcome.habitatId]
  const from = formatPercent(summary.startPercent)
  const to = formatPercent(summary.endPercent)

  let prompt: string
  let correct: FeedbackChoice
  if (summary.trend === 'increase') {
    prompt = `In the ${habitat.title.toLowerCase()}, the ${summary.label} increased from ${from} to ${to}. What best explains this result?`
    correct = {
      id: 'differential-success',
      text: `A greater percentage of organisms with the ${summary.label} survived predation and reproduced, so more offspring inherited that pattern.`,
      isCorrect: true,
      feedback:
        'Correct. Unequal survival and reproduction changed the percentage of an inherited pattern in the population.',
    }
  } else if (summary.trend === 'decrease') {
    prompt = `In the ${habitat.title.toLowerCase()}, the ${summary.label} decreased from ${from} to ${to}. What best explains this result?`
    correct = {
      id: 'differential-success',
      text: `A smaller percentage of organisms with the ${summary.label} survived predation and reproduced, so fewer offspring inherited that pattern.`,
      isCorrect: true,
      feedback:
        'Correct. This run must be explained from its actual survival and reproduction data, even when the background-matching pattern decreases.',
    }
  } else {
    prompt = `In the ${habitat.title.toLowerCase()}, the ${summary.label} ended at the same ${to} where it began. What best explains this result?`
    correct = {
      id: 'similar-success',
      text: 'The two inherited patterns had similar overall survival and reproduction in this run, so their percentages ended near where they began.',
      isCorrect: true,
      feedback:
        'Correct. One run can end with little net change. Explain the result with the survival and offspring evidence from that run.',
    }
  }

  return {
    id: 'population-change',
    prompt,
    choices: [
      correct,
      {
        id: 'individual-choice',
        text: 'Individual organisms changed their own inherited pattern because they needed to survive.',
        isCorrect: false,
        feedback:
          'Individuals kept their inherited patterns. Population percentages changed only when survival and reproduction differed.',
      },
      {
        id: 'environment-created-variation',
        text: 'The habitat created the inherited pattern that the population needed.',
        isCorrect: false,
        feedback:
          'The inherited variation existed before selection. The habitat affected which existing patterns had greater success.',
      },
    ],
  }
}

function fitnessQuestion(): MisconceptionQuestionConfig {
  return {
    id: 'fitness',
    prompt: 'Which organisms had higher fitness during a generation?',
    choices: [
      {
        id: 'survive-and-reproduce',
        text: 'Organisms carrying an inherited pattern that survived and contributed more offspring to the next generation.',
        isCorrect: true,
        feedback:
          'Correct. Fitness describes success at both surviving and reproducing in a particular environment.',
      },
      {
        id: 'most-common-at-start',
        text: 'Whichever inherited pattern happened to be most common at the start.',
        isCorrect: false,
        feedback:
          'Starting abundance does not define fitness. Compare survival rates and contribution to offspring.',
      },
      {
        id: 'survival-only',
        text: 'Organisms that avoided one capture, even if they left no offspring.',
        isCorrect: false,
        feedback:
          'Survival alone is not the complete measure. Higher fitness requires survival and reproductive success.',
      },
    ],
  }
}

function changedEnvironmentQuestion(): MisconceptionQuestionConfig {
  return {
    id: 'changed-environment',
    prompt:
      'Suppose the bark became much lighter and the other inherited moth pattern now blended in better. What should you predict?',
    choices: [
      {
        id: 'fitness-can-switch',
        text: 'That inherited pattern could have higher fitness because fewer carriers might be caught and more might reproduce.',
        isCorrect: true,
        feedback:
          'Correct. Whether an inherited pattern is helpful depends on the environmental conditions.',
      },
      {
        id: 'individuals-change',
        text: 'Each moth would choose to change its inherited wing pattern to match the lighter bark.',
        isCorrect: false,
        feedback:
          'Individual moths do not choose a new inherited pattern. Selection acts on variation already present in the population.',
      },
      {
        id: 'camouflage-always-wins',
        text: 'The pattern called camouflaged must always have higher fitness, no matter what the background looks like.',
        isCorrect: false,
        feedback:
          'Camouflage describes how an appearance relates to a background. A different background can change which inherited pattern is less visible.',
      },
    ],
  }
}

export function createMisconceptionQuestions(
  outcomes: readonly HabitatOutcome[],
): readonly MisconceptionQuestionConfig[] {
  return [
    pressureQuestion(),
    changeQuestion(outcomes),
    fitnessQuestion(),
    changedEnvironmentQuestion(),
  ]
}

export function createCerClaimChoices(
  outcomes: readonly HabitatOutcome[],
): readonly CerClaimChoice[] {
  if (outcomes.length !== 2) {
    throw new Error('CER claim generation requires both habitat outcomes.')
  }

  const summaries = outcomes.map((outcome) => summarizeMorphOutcome(outcome))
  const [first, second] = summaries
  let supportedText: string
  if (first.trend === second.trend && first.trend === 'increase') {
    supportedText =
      'Across both studies, the background-matching inherited pattern became a larger percentage of the population because its carriers had greater survival and reproductive success in these runs.'
  } else if (first.trend === second.trend && first.trend === 'decrease') {
    supportedText =
      'Across both studies, the background-matching inherited pattern became a smaller percentage of the population because its carriers had lower survival and reproductive success in these runs.'
  } else if (first.trend === second.trend && first.trend === 'no_change') {
    supportedText =
      'Across both studies, the pattern percentages ended near where they began because the two patterns had similar overall survival and reproductive success in these runs.'
  } else {
    supportedText =
      'The two studies produced different percentage changes. The predator behavior and each habitat affected which inherited pattern survived and contributed more offspring in each run.'
  }

  return [
    {
      id: 'data-supported-selection',
      text: supportedText,
      isSupported: true,
      feedback: 'This claim matches the recorded population evidence from both habitats.',
    },
    {
      id: 'intentional-individual-change',
      text: 'Individual organisms changed their inherited patterns because they needed to avoid the predator.',
      isSupported: false,
      feedback:
        'Individuals did not change their inherited patterns. Use population survival, reproduction, and offspring evidence.',
    },
    {
      id: 'fixed-total-no-evolution',
      text: 'No population change occurred because the model kept the total number of organisms at 40.',
      isSupported: false,
      feedback:
        'The total stayed fixed for comparison, but the percentage of each inherited pattern could still change.',
    },
  ]
}
