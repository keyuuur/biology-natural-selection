import { HABITAT_STUDENT_COPY } from './content.ts'
import { formatPercent, percentage } from './outcomes.ts'
import type { GenerationEvidenceInput, PopulationCounts } from './types.ts'

function total(counts: PopulationCounts): number {
  return counts.camouflaged + counts.conspicuous
}

function assertGenerationEvidence(input: GenerationEvidenceInput): void {
  if (!Number.isInteger(input.generation) || input.generation < 1) {
    throw new Error('Evidence generation must be a positive integer.')
  }

  for (const morph of ['camouflaged', 'conspicuous'] as const) {
    const values = [
      input.startingCounts[morph],
      input.manualCatches[morph],
      input.automaticCatches[morph],
      input.survivorCounts[morph],
      input.offspringCounts[morph],
    ]
    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new Error('Evidence counts must be non-negative integers.')
    }
    if (
      input.startingCounts[morph] -
        input.manualCatches[morph] -
        input.automaticCatches[morph] !==
      input.survivorCounts[morph]
    ) {
      throw new Error('Evidence captures and survivors must reconcile for each morph.')
    }
  }

  if (total(input.startingCounts) !== 40) {
    throw new Error('Generation evidence must start with 40 organisms.')
  }
  if (total(input.manualCatches) + total(input.automaticCatches) !== 12) {
    throw new Error('Generation evidence must contain exactly 12 predation events.')
  }
  if (total(input.survivorCounts) !== 28 || total(input.offspringCounts) !== 40) {
    throw new Error('Generation evidence must contain 28 survivors and 40 offspring.')
  }
  if (
    input.protectedEscapes !== undefined &&
    (!Number.isInteger(input.protectedEscapes) || input.protectedEscapes < 0)
  ) {
    throw new Error('Protected escapes must be a non-negative integer when provided.')
  }
}

export function formatGenerationPopulationEvidence(
  habitatId: GenerationEvidenceInput['habitatId'],
  generation: number,
  counts: PopulationCounts,
): string {
  if (!Number.isInteger(generation) || generation < 0) {
    throw new Error('Population evidence generation must be a non-negative integer.')
  }
  const populationTotal = total(counts)
  if (populationTotal <= 0) throw new Error('Population evidence requires organisms.')
  const copy = HABITAT_STUDENT_COPY[habitatId]
  const camouflagedPercent = formatPercent(
    percentage(counts.camouflaged, populationTotal),
  )
  const conspicuousPercent = formatPercent(
    percentage(counts.conspicuous, populationTotal),
  )

  return `${copy.title}, Generation ${generation}: ${counts.camouflaged} of ${populationTotal} (${camouflagedPercent}) had the ${copy.morphLabels.camouflaged}; ${counts.conspicuous} of ${populationTotal} (${conspicuousPercent}) had the ${copy.morphLabels.conspicuous}.`
}

export function formatRateBasedGenerationEvidence(
  input: GenerationEvidenceInput,
): string {
  assertGenerationEvidence(input)
  const copy = HABITAT_STUDENT_COPY[input.habitatId]
  const camouflagedSurvival = formatPercent(
    percentage(input.survivorCounts.camouflaged, input.startingCounts.camouflaged),
  )
  const conspicuousSurvival = formatPercent(
    percentage(input.survivorCounts.conspicuous, input.startingCounts.conspicuous),
  )
  const manual = total(input.manualCatches)
  const automatic = total(input.automaticCatches)
  const protectedEscapeDisclosure = input.protectedEscapes
    ? ` The classroom model protected ${input.protectedEscapes} additional ${input.protectedEscapes === 1 ? 'tap' : 'taps'} for comparison; ${input.protectedEscapes === 1 ? 'it was' : 'they were'} not a capture or miss.`
    : ''

  return `${copy.title}, Generation ${input.generation}: ${input.survivorCounts.camouflaged} of ${input.startingCounts.camouflaged} organisms with the ${copy.morphLabels.camouflaged} survived (${camouflagedSurvival}), compared with ${input.survivorCounts.conspicuous} of ${input.startingCounts.conspicuous} organisms with the ${copy.morphLabels.conspicuous} (${conspicuousSurvival}). Those survivors produced ${input.offspringCounts.camouflaged} and ${input.offspringCounts.conspicuous} offspring, respectively. ${manual} of 12 captures came from your taps; the model completed ${automatic}.${protectedEscapeDisclosure}`
}
