import {
  RESULT_SCHEMA_VERSION,
  TRAIT_IDS,
  type CerResponse,
  type GenerationResult,
  type MisconceptionResponse,
  type NaturalSelectionResult,
  type PredictionResponse,
  type TraitCounts,
  type TraitFrequencies,
} from './types'

type ResultInput = Omit<NaturalSelectionResult, 'schemaVersion'>
type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`)
  }
  return value as UnknownRecord
}

function readString(
  record: UnknownRecord,
  key: string,
  options: { allowEmpty?: boolean } = {},
): string {
  const value = record[key]
  if (
    typeof value !== 'string' ||
    (!options.allowEmpty && value.trim().length === 0)
  ) {
    throw new Error(`${key} must be a string${options.allowEmpty ? '' : ' and must not be empty'}.`)
  }
  return value
}

function readFiniteNumber(record: UnknownRecord, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number.`)
  }
  return value
}

function readCounts(value: unknown, label: string): TraitCounts {
  const record = asRecord(value, label)
  const counts = {
    higher_speed: readFiniteNumber(record, 'higher_speed'),
    lower_speed: readFiniteNumber(record, 'lower_speed'),
  }

  for (const trait of TRAIT_IDS) {
    if (!Number.isInteger(counts[trait]) || counts[trait] < 0) {
      throw new Error(`${label}.${trait} must be a non-negative integer.`)
    }
  }
  return counts
}

function readFrequencies(value: unknown, label: string): TraitFrequencies {
  const record = asRecord(value, label)
  const frequencies = {
    higher_speed: readFiniteNumber(record, 'higher_speed'),
    lower_speed: readFiniteNumber(record, 'lower_speed'),
  }

  for (const trait of TRAIT_IDS) {
    if (frequencies[trait] < 0 || frequencies[trait] > 1) {
      throw new Error(`${label}.${trait} must be between 0 and 1.`)
    }
  }
  return frequencies
}

function readGeneration(value: unknown): GenerationResult {
  const record = asRecord(value, 'generation')
  const generation = readFiniteNumber(record, 'generation')
  if (!Number.isInteger(generation) || generation <= 0) {
    throw new Error('generation must be a positive integer.')
  }

  const offspringCounts = readCounts(
    record.offspringCounts,
    'generation.offspringCounts',
  )
  const endingCounts = readCounts(record.endingCounts, 'generation.endingCounts')
  if (
    offspringCounts.higher_speed !== endingCounts.higher_speed ||
    offspringCounts.lower_speed !== endingCounts.lower_speed
  ) {
    throw new Error('generation endingCounts must equal offspringCounts.')
  }

  return {
    generation,
    startingCounts: readCounts(
      record.startingCounts,
      'generation.startingCounts',
    ),
    survivorCounts: readCounts(
      record.survivorCounts,
      'generation.survivorCounts',
    ),
    offspringCounts,
    endingCounts,
    startingFrequencies: readFrequencies(
      record.startingFrequencies,
      'generation.startingFrequencies',
    ),
    endingFrequencies: readFrequencies(
      record.endingFrequencies,
      'generation.endingFrequencies',
    ),
  }
}

function readMisconceptionResponse(
  value: unknown,
): MisconceptionResponse | null {
  if (value === null) {
    return null
  }
  const record = asRecord(value, 'misconceptionResponse')
  if (typeof record.isCorrect !== 'boolean') {
    throw new Error('misconceptionResponse.isCorrect must be a boolean.')
  }
  return {
    selectedAnswer: readString(record, 'selectedAnswer', { allowEmpty: true }),
    isCorrect: record.isCorrect,
  }
}

function readPrediction(value: unknown): PredictionResponse {
  const record = asRecord(value, 'prediction')
  const trait = record.trait
  if (
    trait !== null &&
    trait !== 'higher_speed' &&
    trait !== 'lower_speed' &&
    trait !== 'no_change'
  ) {
    throw new Error(
      'prediction.trait must be higher_speed, lower_speed, no_change, or null.',
    )
  }

  return {
    trait,
    reason: readString(record, 'reason', { allowEmpty: true }),
  }
}

function readCer(value: unknown): CerResponse {
  const record = asRecord(value, 'cer')
  if (!Array.isArray(record.evidence)) {
    throw new Error('cer.evidence must be an array.')
  }

  const evidence = record.evidence.map((item) => {
    if (typeof item !== 'string') {
      throw new Error('Every cer.evidence item must be a string.')
    }
    return item
  })

  return {
    claim: readString(record, 'claim', { allowEmpty: true }),
    evidence,
    reasoning: readString(record, 'reasoning', { allowEmpty: true }),
  }
}

function isValidTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

function sanitizeNaturalSelectionResult(
  value: unknown,
): NaturalSelectionResult {
  const record = asRecord(value, 'NaturalSelectionResult')
  if (record.schemaVersion !== RESULT_SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${RESULT_SCHEMA_VERSION}.`)
  }

  const startedAt = readString(record, 'startedAt')
  if (!isValidTimestamp(startedAt)) {
    throw new Error('startedAt must be a valid timestamp.')
  }

  const completionState = record.completionState
  if (completionState !== 'draft' && completionState !== 'complete') {
    throw new Error('completionState must be draft or complete.')
  }

  const completedValue = record.completedAt
  let completedAt: string | null = null
  if (completedValue !== null) {
    if (typeof completedValue !== 'string' || !isValidTimestamp(completedValue)) {
      throw new Error('completedAt must be null or a valid timestamp.')
    }
    completedAt = completedValue
  }
  if (completionState === 'complete' && completedAt === null) {
    throw new Error('A complete result requires completedAt.')
  }
  if (completionState === 'draft' && completedAt !== null) {
    throw new Error('A draft result must not have completedAt.')
  }
  if (completedAt !== null && Date.parse(completedAt) < Date.parse(startedAt)) {
    throw new Error('completedAt cannot be earlier than startedAt.')
  }

  if (!Array.isArray(record.generations)) {
    throw new Error('generations must be an array.')
  }
  const generations = record.generations.map(readGeneration)
  generations.forEach((generation, index) => {
    if (generation.generation !== index + 1) {
      throw new Error('Result generations must be sequential and begin at 1.')
    }
  })

  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    sessionId: readString(record, 'sessionId'),
    startedAt,
    completedAt,
    scenarioId: readString(record, 'scenarioId'),
    prediction: readPrediction(record.prediction),
    generations,
    misconceptionResponse: readMisconceptionResponse(
      record.misconceptionResponse,
    ),
    cer: readCer(record.cer),
    completionState,
    clientVersion: readString(record, 'clientVersion'),
  }
}

export function createNaturalSelectionResult(
  input: ResultInput,
): NaturalSelectionResult {
  return sanitizeNaturalSelectionResult({
    ...input,
    schemaVersion: RESULT_SCHEMA_VERSION,
  })
}

/** Serializes only the approved schema, so accidental identity fields are dropped. */
export function serializeNaturalSelectionResult(
  result: NaturalSelectionResult,
): string {
  return JSON.stringify(sanitizeNaturalSelectionResult(result))
}

export function parseNaturalSelectionResult(
  serialized: string,
): NaturalSelectionResult {
  if (typeof serialized !== 'string' || serialized.trim().length === 0) {
    throw new Error('Serialized result must be a non-empty JSON string.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw new Error('Serialized result is not valid JSON.')
  }

  return sanitizeNaturalSelectionResult(parsed)
}
