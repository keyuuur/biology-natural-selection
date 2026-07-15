import type { ScenarioConfig, SimulationState } from './types'
import { validateScenarioConfig } from './generationRunner'

export const DEFAULT_SCENARIO = {
  id: 'deer-distant-food',
  populationSize: 20,
  generationCount: 5,
  feedingSlots: 12,
  initialCounts: {
    higher_speed: 10,
    lower_speed: 10,
  },
  fitnessWeights: {
    higher_speed: 1.5,
    lower_speed: 1,
  },
  traitLabels: {
    higher_speed: 'Higher-speed deer',
    lower_speed: 'Lower-speed deer',
  },
  copy: {
    missionTitle: 'The Distant Food Challenge',
    mission:
      'Study a deer population for five generations as limited food is spread far apart.',
    variationPrompt:
      'Every generation begins with inherited variation in movement speed.',
    selectionPressure:
      'Only 12 deer can reach enough distant food to survive and reproduce.',
    misconceptionReminder:
      'Individual deer do not choose to become faster. The population changes because deer with an inherited trait leave more offspring.',
  },
} as const satisfies ScenarioConfig

export function createInitialState(
  scenario: ScenarioConfig = DEFAULT_SCENARIO,
): SimulationState {
  validateScenarioConfig(scenario)

  return {
    scenarioId: scenario.id,
    generation: 0,
    counts: { ...scenario.initialCounts },
    history: [],
  }
}
