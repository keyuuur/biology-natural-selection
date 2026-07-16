import {
  type GenerationResult,
  type HabitatConfig,
  type HabitatId,
  type MorphCounts,
  type PopulationGraphPoint,
} from './types.ts'
import {
  calculateMorphFrequencies,
  calculateMorphPercentages,
} from './generationRunner.ts'

export function createGraphPoint(
  habitatId: HabitatId,
  generation: number,
  counts: MorphCounts,
): PopulationGraphPoint {
  if (!Number.isInteger(generation) || generation < 0) {
    throw new Error('Graph generation must be a non-negative integer.')
  }
  return {
    habitatId,
    generation,
    counts: { ...counts },
    frequencies: calculateMorphFrequencies(counts),
    percentages: calculateMorphPercentages(counts),
  }
}

export function createGraphSeries(
  habitat: HabitatConfig,
  generations: readonly GenerationResult[],
): readonly PopulationGraphPoint[] {
  const points: PopulationGraphPoint[] = [
    createGraphPoint(habitat.id, 0, habitat.initialCounts),
  ]
  let expectedCounts = habitat.initialCounts
  generations.forEach((result, index) => {
    const generation = index + 1
    if (
      result.habitatId !== habitat.id ||
      result.generation !== generation ||
      result.startingCounts.camouflaged !== expectedCounts.camouflaged ||
      result.startingCounts.conspicuous !== expectedCounts.conspicuous
    ) {
      throw new Error('Graph history must be sequential for one habitat.')
    }
    points.push(createGraphPoint(habitat.id, generation, result.endingCounts))
    expectedCounts = result.endingCounts
  })
  return points
}
