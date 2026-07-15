import type {
  NaturalSelectionResult,
  PredictionResponse,
  SimulationState,
  TraitId,
} from '../simulation/index.ts'

export type GameStage =
  | 'mission'
  | 'observe'
  | 'prediction'
  | 'generations'
  | 'misconception'
  | 'evidence'
  | 'cer'
  | 'results'

export type EvidenceSelection = {
  generationIds: readonly number[]
  survivorGeneration: number | null
}

export type CerDraft = {
  claim: TraitId | null
  reasoning: string
}

export type GameSession = {
  sessionId: string
  startedAt: string
  stage: GameStage
  simulation: SimulationState
  prediction: PredictionResponse
  misconceptionResponse: {
    selectedAnswer: string
    isCorrect: boolean
  } | null
  evidence: EvidenceSelection
  cer: CerDraft
  completedResult: NaturalSelectionResult | null
}

export type PreparedGeneration = {
  nextState: SimulationState
  result: SimulationState['history'][number]
}
