import {
  type GenerationResult,
  type TraitCounts,
  type TraitGraphPoint,
} from './types'
import { calculateTraitFrequencies } from './generationRunner'

export function createGraphPoint(
  generation: number,
  counts: TraitCounts,
): TraitGraphPoint {
  if (!Number.isInteger(generation) || generation < 0) {
    throw new Error('Graph generation must be a non-negative integer.')
  }

  const frequencies = calculateTraitFrequencies(counts)

  return {
    generation,
    counts: { ...counts },
    frequencies,
    percentages: {
      higher_speed: frequencies.higher_speed * 100,
      lower_speed: frequencies.lower_speed * 100,
    },
  }
}

export function createGraphSeries(
  initialCounts: TraitCounts,
  generations: readonly GenerationResult[],
): readonly TraitGraphPoint[] {
  const points: TraitGraphPoint[] = [createGraphPoint(0, initialCounts)]

  generations.forEach((result, index) => {
    const expectedGeneration = index + 1
    if (result.generation !== expectedGeneration) {
      throw new Error('Graph generations must be sequential and begin at 1.')
    }
    points.push(createGraphPoint(result.generation, result.endingCounts))
  })

  return points
}
