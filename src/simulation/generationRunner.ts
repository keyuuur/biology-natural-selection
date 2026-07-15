import {
  TRAIT_IDS,
  type GenerationResult,
  type ScenarioConfig,
  type SimulationState,
  type TraitCounts,
  type TraitFrequencies,
  type TraitId,
} from './types'

const TIE_EPSILON = 1e-12

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`)
  }
}

function assertNonEmptyString(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`)
  }
}

function assertValidCounts(counts: TraitCounts, label: string): void {
  for (const trait of TRAIT_IDS) {
    const count = counts[trait]
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`${label}.${trait} must be a non-negative integer.`)
    }
  }
}

function countsEqual(left: TraitCounts, right: TraitCounts): boolean {
  return TRAIT_IDS.every((trait) => left[trait] === right[trait])
}

export function totalCounts(counts: TraitCounts): number {
  return TRAIT_IDS.reduce((total, trait) => total + counts[trait], 0)
}

export function calculateTraitFrequencies(
  counts: TraitCounts,
): TraitFrequencies {
  assertValidCounts(counts, 'counts')
  const total = totalCounts(counts)

  if (total === 0) {
    throw new Error('Trait frequencies require at least one organism.')
  }

  return {
    higher_speed: counts.higher_speed / total,
    lower_speed: counts.lower_speed / total,
  }
}

/**
 * Uses Hamilton's largest-remainder method. When remainders are equal, the
 * documented trait order makes the result predictable rather than random.
 */
export function allocateByLargestRemainder(
  totalToAllocate: number,
  weights: Readonly<Record<TraitId, number>>,
): TraitCounts {
  if (!Number.isInteger(totalToAllocate) || totalToAllocate < 0) {
    throw new Error('Allocation total must be a non-negative integer.')
  }

  for (const trait of TRAIT_IDS) {
    if (!Number.isFinite(weights[trait]) || weights[trait] < 0) {
      throw new Error(`Allocation weight for ${trait} must be finite and non-negative.`)
    }
  }

  if (totalToAllocate === 0) {
    return { higher_speed: 0, lower_speed: 0 }
  }

  const weightTotal = TRAIT_IDS.reduce(
    (total, trait) => total + weights[trait],
    0,
  )

  if (weightTotal <= 0) {
    throw new Error('At least one allocation weight must be greater than zero.')
  }

  const quotas = TRAIT_IDS.map((trait, stableIndex) => {
    const exact = (totalToAllocate * weights[trait]) / weightTotal
    const floor = Math.floor(exact)

    return {
      trait,
      stableIndex,
      floor,
      remainder: exact - floor,
    }
  })

  const allocated: Record<TraitId, number> = {
    higher_speed: quotas[0].floor,
    lower_speed: quotas[1].floor,
  }
  const floorTotal = quotas.reduce((total, quota) => total + quota.floor, 0)
  const remaining = totalToAllocate - floorTotal
  const ranked = [...quotas].sort((left, right) => {
    const remainderDifference = right.remainder - left.remainder
    if (Math.abs(remainderDifference) > TIE_EPSILON) {
      return remainderDifference
    }
    return left.stableIndex - right.stableIndex
  })

  for (let index = 0; index < remaining; index += 1) {
    const trait = ranked[index % ranked.length].trait
    allocated[trait] += 1
  }

  return { ...allocated }
}

export function validateScenarioConfig(scenario: ScenarioConfig): void {
  assertNonEmptyString(scenario.id, 'scenario.id')
  assertPositiveInteger(scenario.populationSize, 'scenario.populationSize')
  assertPositiveInteger(scenario.generationCount, 'scenario.generationCount')
  assertPositiveInteger(scenario.feedingSlots, 'scenario.feedingSlots')

  if (scenario.feedingSlots > scenario.populationSize) {
    throw new Error('scenario.feedingSlots cannot exceed scenario.populationSize.')
  }

  assertValidCounts(scenario.initialCounts, 'scenario.initialCounts')
  if (totalCounts(scenario.initialCounts) !== scenario.populationSize) {
    throw new Error('scenario.initialCounts must total scenario.populationSize.')
  }

  for (const trait of TRAIT_IDS) {
    const fitnessWeight = scenario.fitnessWeights[trait]
    if (!Number.isFinite(fitnessWeight) || fitnessWeight <= 0) {
      throw new Error(
        `scenario.fitnessWeights.${trait} must be finite and greater than zero.`,
      )
    }
    assertNonEmptyString(
      scenario.traitLabels[trait],
      `scenario.traitLabels.${trait}`,
    )
  }

  for (const [key, value] of Object.entries(scenario.copy)) {
    assertNonEmptyString(value, `scenario.copy.${key}`)
  }
}

function validateGenerationResult(
  result: GenerationResult,
  expectedGeneration: number,
  expectedStartingCounts: TraitCounts,
  scenario: ScenarioConfig,
): void {
  if (result.generation !== expectedGeneration) {
    throw new Error('Simulation history generations must be sequential.')
  }

  assertValidCounts(result.startingCounts, 'history.startingCounts')
  assertValidCounts(result.survivorCounts, 'history.survivorCounts')
  assertValidCounts(result.offspringCounts, 'history.offspringCounts')
  assertValidCounts(result.endingCounts, 'history.endingCounts')

  if (!countsEqual(result.startingCounts, expectedStartingCounts)) {
    throw new Error('A history entry does not start with the previous population.')
  }
  if (totalCounts(result.startingCounts) !== scenario.populationSize) {
    throw new Error('A history starting population has the wrong size.')
  }
  if (totalCounts(result.survivorCounts) !== scenario.feedingSlots) {
    throw new Error('A history survivor population has the wrong size.')
  }
  if (totalCounts(result.offspringCounts) !== scenario.populationSize) {
    throw new Error('A history offspring population has the wrong size.')
  }
  if (!countsEqual(result.offspringCounts, result.endingCounts)) {
    throw new Error('A history ending population must equal its offspring population.')
  }
}

export function validateSimulationState(
  state: SimulationState,
  scenario: ScenarioConfig,
): void {
  if (state.scenarioId !== scenario.id) {
    throw new Error('Simulation state and scenario IDs do not match.')
  }
  if (
    !Number.isInteger(state.generation) ||
    state.generation < 0 ||
    state.generation > scenario.generationCount
  ) {
    throw new Error('Simulation generation is outside the scenario range.')
  }
  if (state.history.length !== state.generation) {
    throw new Error('Simulation history length must match the current generation.')
  }

  assertValidCounts(state.counts, 'state.counts')
  if (totalCounts(state.counts) !== scenario.populationSize) {
    throw new Error('Simulation state counts must total scenario.populationSize.')
  }

  let expectedStartingCounts = scenario.initialCounts
  state.history.forEach((result, index) => {
    validateGenerationResult(
      result,
      index + 1,
      expectedStartingCounts,
      scenario,
    )
    expectedStartingCounts = result.endingCounts
  })

  if (!countsEqual(state.counts, expectedStartingCounts)) {
    throw new Error('Simulation state counts do not match the latest history entry.')
  }
}

export function runGeneration(
  state: SimulationState,
  scenario: ScenarioConfig,
): SimulationState {
  validateScenarioConfig(scenario)
  validateSimulationState(state, scenario)

  if (state.generation >= scenario.generationCount) {
    throw new Error('All configured generations have already been run.')
  }

  const startingCounts: TraitCounts = { ...state.counts }
  const weightedSuccess: Record<TraitId, number> = {
    higher_speed:
      startingCounts.higher_speed * scenario.fitnessWeights.higher_speed,
    lower_speed:
      startingCounts.lower_speed * scenario.fitnessWeights.lower_speed,
  }
  const survivorCounts = allocateByLargestRemainder(
    scenario.feedingSlots,
    weightedSuccess,
  )

  // The survivors are parents. Their offspring fully replace the population.
  const offspringCounts = allocateByLargestRemainder(
    scenario.populationSize,
    survivorCounts,
  )
  const endingCounts: TraitCounts = { ...offspringCounts }
  const result: GenerationResult = {
    generation: state.generation + 1,
    startingCounts,
    survivorCounts: { ...survivorCounts },
    offspringCounts: { ...offspringCounts },
    endingCounts,
    startingFrequencies: calculateTraitFrequencies(startingCounts),
    endingFrequencies: calculateTraitFrequencies(endingCounts),
  }

  return {
    scenarioId: state.scenarioId,
    generation: result.generation,
    counts: { ...endingCounts },
    history: [...state.history, result],
  }
}

export function runAllGenerations(
  initialState: SimulationState,
  scenario: ScenarioConfig,
): SimulationState {
  let nextState = initialState

  while (nextState.generation < scenario.generationCount) {
    nextState = runGeneration(nextState, scenario)
  }

  return nextState
}
