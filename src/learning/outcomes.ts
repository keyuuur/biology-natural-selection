import type { HabitatId, MorphId } from '../simulation/types.ts'
import { HABITAT_STUDENT_COPY } from './content.ts'
import type { HabitatOutcome, PopulationCounts } from './types.ts'

export type OutcomeTrend = 'increase' | 'decrease' | 'no_change'

export interface MorphOutcomeSummary {
  readonly habitatId: HabitatId
  readonly morphId: MorphId
  readonly label: string
  readonly startCount: number
  readonly endCount: number
  readonly startPercent: number
  readonly endPercent: number
  readonly trend: OutcomeTrend
}

function assertCounts(counts: PopulationCounts, label: string): number {
  const total = counts.camouflaged + counts.conspicuous
  if (
    !Number.isInteger(counts.camouflaged) ||
    !Number.isInteger(counts.conspicuous) ||
    counts.camouflaged < 0 ||
    counts.conspicuous < 0 ||
    total <= 0
  ) {
    throw new Error(`${label} must contain non-negative integer counts with a positive total.`)
  }
  return total
}

export function percentage(count: number, total: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) {
    throw new Error('A percentage requires finite values and a positive total.')
  }
  return (count / total) * 100
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Percentage must be finite.')
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

export function summarizeMorphOutcome(
  outcome: HabitatOutcome,
  morphId: MorphId = 'camouflaged',
): MorphOutcomeSummary {
  const startTotal = assertCounts(outcome.startingCounts, 'startingCounts')
  const endTotal = assertCounts(outcome.endingCounts, 'endingCounts')
  const startPercent = percentage(outcome.startingCounts[morphId], startTotal)
  const endPercent = percentage(outcome.endingCounts[morphId], endTotal)
  const trend: OutcomeTrend =
    endPercent > startPercent
      ? 'increase'
      : endPercent < startPercent
        ? 'decrease'
        : 'no_change'

  return {
    habitatId: outcome.habitatId,
    morphId,
    label: HABITAT_STUDENT_COPY[outcome.habitatId].morphLabels[morphId],
    startCount: outcome.startingCounts[morphId],
    endCount: outcome.endingCounts[morphId],
    startPercent,
    endPercent,
    trend,
  }
}
