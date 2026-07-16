import {
  MORPH_IDS,
  type GenerationResult,
  type HabitatConfig,
  type MorphCounts,
  type MorphFrequencies,
  type MorphId,
  type MorphPercentages,
  type PlayerRoundMetrics,
  type PredationResult,
  type RandomSource,
  type RunGenerationResult,
  type SimulationState,
} from './types.ts'
import { createSeededRandom, deriveSeed, validateSeed } from './seededRandom.ts'

const TIE_EPSILON = 1e-12

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`)
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`)
  }
}

function assertNonEmptyString(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`)
  }
}

function assertCounts(counts: MorphCounts, label: string): void {
  for (const morph of MORPH_IDS) {
    assertNonNegativeInteger(counts[morph], `${label}.${morph}`)
  }
}

function countsEqual(left: MorphCounts, right: MorphCounts): boolean {
  return MORPH_IDS.every((morph) => left[morph] === right[morph])
}

function addCounts(left: MorphCounts, right: MorphCounts): MorphCounts {
  return {
    camouflaged: left.camouflaged + right.camouflaged,
    conspicuous: left.conspicuous + right.conspicuous,
  }
}

function subtractCounts(left: MorphCounts, right: MorphCounts): MorphCounts {
  return {
    camouflaged: left.camouflaged - right.camouflaged,
    conspicuous: left.conspicuous - right.conspicuous,
  }
}

export function totalCounts(counts: MorphCounts): number {
  return MORPH_IDS.reduce((total, morph) => total + counts[morph], 0)
}

export function calculateMorphFrequencies(
  counts: MorphCounts,
): MorphFrequencies {
  assertCounts(counts, 'counts')
  const total = totalCounts(counts)
  if (total === 0) {
    throw new Error('Morph frequencies require at least one organism.')
  }
  return {
    camouflaged: counts.camouflaged / total,
    conspicuous: counts.conspicuous / total,
  }
}

export function calculateMorphPercentages(
  counts: MorphCounts,
): MorphPercentages {
  const frequencies = calculateMorphFrequencies(counts)
  return {
    camouflaged: frequencies.camouflaged * 100,
    conspicuous: frequencies.conspicuous * 100,
  }
}

/** Hamilton allocation with the documented camouflaged-first stable tie order. */
export function allocateByLargestRemainder(
  totalToAllocate: number,
  weights: Readonly<Record<MorphId, number>>,
): MorphCounts {
  assertNonNegativeInteger(totalToAllocate, 'Allocation total')
  for (const morph of MORPH_IDS) {
    const weight = weights[morph]
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`Allocation weight for ${morph} must be finite and non-negative.`)
    }
  }
  if (totalToAllocate === 0) {
    return { camouflaged: 0, conspicuous: 0 }
  }

  const weightTotal = MORPH_IDS.reduce(
    (total, morph) => total + weights[morph],
    0,
  )
  if (weightTotal <= 0) {
    throw new Error('At least one allocation weight must be greater than zero.')
  }

  const quotas = MORPH_IDS.map((morph, stableIndex) => {
    const exact = (totalToAllocate * weights[morph]) / weightTotal
    const floor = Math.floor(exact)
    return { morph, stableIndex, floor, remainder: exact - floor }
  })
  const allocated: Record<MorphId, number> = {
    camouflaged: quotas[0].floor,
    conspicuous: quotas[1].floor,
  }
  const remaining =
    totalToAllocate - quotas.reduce((total, quota) => total + quota.floor, 0)
  const ranked = [...quotas].sort((left, right) => {
    const difference = right.remainder - left.remainder
    return Math.abs(difference) > TIE_EPSILON
      ? difference
      : left.stableIndex - right.stableIndex
  })
  for (let index = 0; index < remaining; index += 1) {
    allocated[ranked[index % ranked.length].morph] += 1
  }
  return { ...allocated }
}

export function validateHabitatConfig(habitat: HabitatConfig): void {
  if (!MORPH_IDS.every((morph) => morph in habitat.initialCounts)) {
    throw new Error('habitat.initialCounts must define every morph.')
  }
  assertNonEmptyString(habitat.id, 'habitat.id')
  assertPositiveInteger(habitat.populationSize, 'habitat.populationSize')
  assertPositiveInteger(habitat.generationCount, 'habitat.generationCount')
  assertPositiveInteger(habitat.predationSlots, 'habitat.predationSlots')
  assertNonNegativeInteger(
    habitat.minSurvivorsPerMorph,
    'habitat.minSurvivorsPerMorph',
  )
  assertNonNegativeInteger(
    habitat.minOffspringPerMorph,
    'habitat.minOffspringPerMorph',
  )
  assertPositiveInteger(
    habitat.maxOffspringPerMorph,
    'habitat.maxOffspringPerMorph',
  )
  assertPositiveInteger(
    habitat.pointsPerManualCapture,
    'habitat.pointsPerManualCapture',
  )
  assertCounts(habitat.initialCounts, 'habitat.initialCounts')

  if (totalCounts(habitat.initialCounts) !== habitat.populationSize) {
    throw new Error('habitat.initialCounts must total habitat.populationSize.')
  }
  if (
    habitat.predationSlots >
    habitat.populationSize - MORPH_IDS.length * habitat.minSurvivorsPerMorph
  ) {
    throw new Error('habitat.predationSlots cannot violate the survivor floor.')
  }
  if (
    habitat.minOffspringPerMorph * MORPH_IDS.length > habitat.populationSize ||
    habitat.maxOffspringPerMorph * MORPH_IDS.length < habitat.populationSize ||
    habitat.minOffspringPerMorph > habitat.maxOffspringPerMorph
  ) {
    throw new Error('Habitat offspring bounds cannot contain the population.')
  }

  for (const morph of MORPH_IDS) {
    if (habitat.initialCounts[morph] < habitat.minSurvivorsPerMorph) {
      throw new Error(`habitat.initialCounts.${morph} is below the survivor floor.`)
    }
    const weight = habitat.visibilityWeights[morph]
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`habitat.visibilityWeights.${morph} must be positive.`)
    }
    assertNonEmptyString(habitat.morphLabels[morph], `habitat.morphLabels.${morph}`)
  }

  for (const mode of ['standard', 'extended'] as const) {
    const timing = habitat.timing[mode]
    assertPositiveInteger(timing.durationMs, `habitat.timing.${mode}.durationMs`)
    if (!Number.isFinite(timing.movementScale) || timing.movementScale <= 0) {
      throw new Error(`habitat.timing.${mode}.movementScale must be positive.`)
    }
    if (!Number.isFinite(timing.hitAreaScale) || timing.hitAreaScale <= 0) {
      throw new Error(`habitat.timing.${mode}.hitAreaScale must be positive.`)
    }
  }
  for (const [key, value] of Object.entries(habitat.copy)) {
    assertNonEmptyString(value, `habitat.copy.${key}`)
  }
}

export function validatePlayerRoundMetrics(
  metrics: PlayerRoundMetrics,
  startingCounts: MorphCounts,
  habitat: HabitatConfig,
): void {
  validateSeed(metrics.seed)
  assertCounts(metrics.manualCatches, 'metrics.manualCatches')
  assertNonNegativeInteger(metrics.misses, 'metrics.misses')
  assertNonNegativeInteger(metrics.protectedEscapes, 'metrics.protectedEscapes')
  if (!Number.isFinite(metrics.elapsedMs) || metrics.elapsedMs < 0) {
    throw new Error('metrics.elapsedMs must be finite and non-negative.')
  }
  if (metrics.timingMode !== 'standard' && metrics.timingMode !== 'extended') {
    throw new Error('metrics.timingMode is invalid.')
  }
  if (metrics.inputMode !== 'interactive' && metrics.inputMode !== 'observation') {
    throw new Error('metrics.inputMode is invalid.')
  }
  if (typeof metrics.fallbackUsed !== 'boolean') {
    throw new Error('metrics.fallbackUsed must be a boolean.')
  }
  if (metrics.inputMode === 'observation' && totalCounts(metrics.manualCatches) > 0) {
    throw new Error('Observation rounds cannot contain manual catches.')
  }
  if (totalCounts(metrics.manualCatches) > habitat.predationSlots) {
    throw new Error('Manual catches cannot exceed the predation slots.')
  }
  for (const morph of MORPH_IDS) {
    if (
      metrics.manualCatches[morph] >
      startingCounts[morph] - habitat.minSurvivorsPerMorph
    ) {
      throw new Error(`Manual catches would violate the ${morph} parent floor.`)
    }
  }
}

/**
 * Completes unfilled predation slots with abundance multiplied by visibility.
 * Each draw removes one individual, so selection is weighted without replacement.
 */
export function resolvePredation(
  state: SimulationState,
  metrics: PlayerRoundMetrics,
  habitat: HabitatConfig,
  rng: RandomSource,
): PredationResult {
  validateHabitatConfig(habitat)
  validateSimulationState(state, habitat)
  validatePlayerRoundMetrics(metrics, state.counts, habitat)

  const manualCatches: MorphCounts = { ...metrics.manualCatches }
  const afterManual = subtractCounts(state.counts, manualCatches)
  const automatic: Record<MorphId, number> = {
    camouflaged: 0,
    conspicuous: 0,
  }
  const working: Record<MorphId, number> = { ...afterManual }
  const remainingSlots = habitat.predationSlots - totalCounts(manualCatches)

  for (let draw = 0; draw < remainingSlots; draw += 1) {
    const weightedEligible: Record<MorphId, number> = {
      camouflaged:
        Math.max(working.camouflaged - habitat.minSurvivorsPerMorph, 0) *
        habitat.visibilityWeights.camouflaged,
      conspicuous:
        Math.max(working.conspicuous - habitat.minSurvivorsPerMorph, 0) *
        habitat.visibilityWeights.conspicuous,
    }
    const weightTotal = weightedEligible.camouflaged + weightedEligible.conspicuous
    if (weightTotal <= 0) {
      throw new Error('Automatic predation cannot fill the configured slots.')
    }

    const randomValue = rng()
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new Error('Random source must return a finite value from 0 up to 1.')
    }
    const threshold = randomValue * weightTotal
    const selected: MorphId =
      threshold < weightedEligible.camouflaged && weightedEligible.camouflaged > 0
        ? 'camouflaged'
        : 'conspicuous'
    working[selected] -= 1
    automatic[selected] += 1
  }

  const automaticCatches: MorphCounts = { ...automatic }
  const survivorCounts: MorphCounts = { ...working }
  return { manualCatches, automaticCatches, survivorCounts }
}

export function produceOffspring(
  survivors: MorphCounts,
  habitat: HabitatConfig,
): MorphCounts {
  validateHabitatConfig(habitat)
  assertCounts(survivors, 'survivors')
  if (totalCounts(survivors) !== habitat.populationSize - habitat.predationSlots) {
    throw new Error('Survivors must equal population size minus predation slots.')
  }
  for (const morph of MORPH_IDS) {
    if (survivors[morph] < habitat.minSurvivorsPerMorph) {
      throw new Error(`Survivors violate the ${morph} parent floor.`)
    }
  }

  const proportional = allocateByLargestRemainder(
    habitat.populationSize,
    survivors,
  )
  const camouflaged = Math.min(
    habitat.maxOffspringPerMorph,
    Math.max(habitat.minOffspringPerMorph, proportional.camouflaged),
  )
  const offspring: MorphCounts = {
    camouflaged,
    conspicuous: habitat.populationSize - camouflaged,
  }
  for (const morph of MORPH_IDS) {
    if (
      offspring[morph] < habitat.minOffspringPerMorph ||
      offspring[morph] > habitat.maxOffspringPerMorph
    ) {
      throw new Error('Offspring allocation violates configured morph bounds.')
    }
  }
  return offspring
}

function validateGenerationResult(
  result: GenerationResult,
  expectedGeneration: number,
  expectedStartingCounts: MorphCounts,
  habitat: HabitatConfig,
): void {
  if (result.habitatId !== habitat.id || result.generation !== expectedGeneration) {
    throw new Error('Simulation history habitat or generation is invalid.')
  }
  for (const [label, counts] of Object.entries({
    startingCounts: result.startingCounts,
    manualCatches: result.manualCatches,
    automaticCatches: result.automaticCatches,
    survivorCounts: result.survivorCounts,
    offspringCounts: result.offspringCounts,
    endingCounts: result.endingCounts,
  })) {
    assertCounts(counts, `history.${label}`)
  }
  if (!countsEqual(result.startingCounts, expectedStartingCounts)) {
    throw new Error('A history entry does not start with the previous population.')
  }
  const totalCatches = addCounts(result.manualCatches, result.automaticCatches)
  if (totalCounts(totalCatches) !== habitat.predationSlots) {
    throw new Error('A history entry must contain exactly the configured predation events.')
  }
  if (!countsEqual(subtractCounts(result.startingCounts, totalCatches), result.survivorCounts)) {
    throw new Error('History survivor counts do not match its catches.')
  }
  if (totalCounts(result.survivorCounts) !== habitat.populationSize - habitat.predationSlots) {
    throw new Error('A history entry has the wrong number of survivors.')
  }
  if (
    totalCounts(result.endingCounts) !== habitat.populationSize ||
    !countsEqual(result.offspringCounts, result.endingCounts)
  ) {
    throw new Error('History offspring must form the complete ending population.')
  }
  if (result.predatorPoints !== totalCounts(result.manualCatches) * habitat.pointsPerManualCapture) {
    throw new Error('History predator points do not match manual catches.')
  }
  for (const morph of MORPH_IDS) {
    if (result.survivorCounts[morph] < habitat.minSurvivorsPerMorph) {
      throw new Error('A history entry violates the survivor floor.')
    }
  }
}

export function validateSimulationState(
  state: SimulationState,
  habitat: HabitatConfig,
): void {
  validateHabitatConfig(habitat)
  if (state.habitatId !== habitat.id) {
    throw new Error('Simulation state and habitat IDs do not match.')
  }
  if (
    !Number.isInteger(state.generation) ||
    state.generation < 0 ||
    state.generation > habitat.generationCount ||
    state.history.length !== state.generation
  ) {
    throw new Error('Simulation generation or history length is invalid.')
  }
  assertCounts(state.counts, 'state.counts')
  if (totalCounts(state.counts) !== habitat.populationSize) {
    throw new Error('Simulation state counts must total the habitat population.')
  }

  let expectedCounts = habitat.initialCounts
  state.history.forEach((result, index) => {
    validateGenerationResult(result, index + 1, expectedCounts, habitat)
    expectedCounts = result.endingCounts
  })
  if (!countsEqual(state.counts, expectedCounts)) {
    throw new Error('Simulation counts do not match the latest history entry.')
  }
}

export function runGeneration(
  state: SimulationState,
  metrics: PlayerRoundMetrics,
  habitat: HabitatConfig,
): RunGenerationResult {
  validateSimulationState(state, habitat)
  if (state.generation >= habitat.generationCount) {
    throw new Error('All configured generations have already been run.')
  }

  const rng = createSeededRandom(
    deriveSeed(metrics.seed, habitat.id, state.generation + 1, 'automatic-predation'),
  )
  const predation = resolvePredation(state, metrics, habitat, rng)
  const offspringCounts = produceOffspring(predation.survivorCounts, habitat)
  const startingCounts: MorphCounts = { ...state.counts }
  const endingCounts: MorphCounts = { ...offspringCounts }
  const result: GenerationResult = {
    habitatId: habitat.id,
    generation: state.generation + 1,
    seed: metrics.seed,
    startingCounts,
    manualCatches: { ...predation.manualCatches },
    automaticCatches: { ...predation.automaticCatches },
    protectedEscapes: metrics.protectedEscapes,
    survivorCounts: { ...predation.survivorCounts },
    offspringCounts: { ...offspringCounts },
    endingCounts,
    startingFrequencies: calculateMorphFrequencies(startingCounts),
    endingFrequencies: calculateMorphFrequencies(endingCounts),
    startingPercentages: calculateMorphPercentages(startingCounts),
    endingPercentages: calculateMorphPercentages(endingCounts),
    misses: metrics.misses,
    elapsedMs: metrics.elapsedMs,
    timingMode: metrics.timingMode,
    inputMode: metrics.inputMode,
    fallbackUsed: metrics.fallbackUsed,
    predatorPoints:
      totalCounts(predation.manualCatches) * habitat.pointsPerManualCapture,
  }
  const nextState: SimulationState = {
    habitatId: habitat.id,
    generation: result.generation,
    counts: endingCounts,
    history: [...state.history, result],
  }
  validateSimulationState(nextState, habitat)
  return { nextState, result }
}
