import { HABITATS } from './habitats.ts'
import {
  calculateMorphFrequencies,
  calculateMorphPercentages,
  totalCounts,
  validateSimulationState,
} from './generationRunner.ts'
import { validateSeed } from './seededRandom.ts'
import {
  HABITAT_IDS,
  MORPH_IDS,
  RESULT_SCHEMA_VERSION,
  type CerResponse,
  type ComparisonEvidenceReference,
  type EvidenceReference,
  type EvidenceSelection,
  type GenerationResult,
  type HabitatExperimentResult,
  type HabitatId,
  type MisconceptionCheckResult,
  type MorphCounts,
  type MorphFrequencies,
  type MorphPercentages,
  type NaturalSelectionResult,
  type PopulationEvidenceReference,
  type PredictionResponse,
  type PredatorPerformance,
  type ScienceCompletion,
  type SelectedTimingMode,
} from './types.ts'

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
    throw new Error(`${key} must be a${options.allowEmpty ? '' : ' non-empty'} string.`)
  }
  return value
}

function readNumber(record: UnknownRecord, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number.`)
  }
  return value
}

function readInteger(
  record: UnknownRecord,
  key: string,
  minimum = 0,
): number {
  const value = readNumber(record, key)
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${key} must be an integer of at least ${minimum}.`)
  }
  return value
}

function readBoolean(record: UnknownRecord, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be a boolean.`)
  }
  return value
}

function readCounts(value: unknown, label: string): MorphCounts {
  const record = asRecord(value, label)
  const counts = {
    camouflaged: readInteger(record, 'camouflaged'),
    conspicuous: readInteger(record, 'conspicuous'),
  }
  return counts
}

function readPair(value: unknown, label: string): MorphFrequencies {
  const record = asRecord(value, label)
  const pair = {
    camouflaged: readNumber(record, 'camouflaged'),
    conspicuous: readNumber(record, 'conspicuous'),
  }
  return pair
}

function readPercentages(value: unknown, label: string): MorphPercentages {
  return readPair(value, label)
}

function assertClose(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${label} does not match its population counts.`)
  }
}

function readTimingMode(value: unknown, label: string): SelectedTimingMode {
  if (value !== 'standard' && value !== 'extended') {
    throw new Error(`${label} must be standard or extended.`)
  }
  return value
}

function readGeneration(value: unknown, habitatId: HabitatId): GenerationResult {
  const record = asRecord(value, 'generation')
  if (record.habitatId !== habitatId) {
    throw new Error('generation.habitatId does not match its habitat.')
  }
  const inputMode = record.inputMode
  if (inputMode !== 'interactive' && inputMode !== 'observation') {
    throw new Error('generation.inputMode is invalid.')
  }
  const generation: GenerationResult = {
    habitatId,
    generation: readInteger(record, 'generation', 1),
    seed: readNumber(record, 'seed'),
    startingCounts: readCounts(record.startingCounts, 'generation.startingCounts'),
    manualCatches: readCounts(record.manualCatches, 'generation.manualCatches'),
    automaticCatches: readCounts(record.automaticCatches, 'generation.automaticCatches'),
    protectedEscapes: readInteger(record, 'protectedEscapes'),
    survivorCounts: readCounts(record.survivorCounts, 'generation.survivorCounts'),
    offspringCounts: readCounts(record.offspringCounts, 'generation.offspringCounts'),
    endingCounts: readCounts(record.endingCounts, 'generation.endingCounts'),
    startingFrequencies: readPair(
      record.startingFrequencies,
      'generation.startingFrequencies',
    ),
    endingFrequencies: readPair(
      record.endingFrequencies,
      'generation.endingFrequencies',
    ),
    startingPercentages: readPercentages(
      record.startingPercentages,
      'generation.startingPercentages',
    ),
    endingPercentages: readPercentages(
      record.endingPercentages,
      'generation.endingPercentages',
    ),
    misses: readInteger(record, 'misses'),
    elapsedMs: readNumber(record, 'elapsedMs'),
    timingMode: readTimingMode(record.timingMode, 'generation.timingMode'),
    inputMode,
    fallbackUsed: readBoolean(record, 'fallbackUsed'),
    predatorPoints: readInteger(record, 'predatorPoints'),
  }
  validateSeed(generation.seed)
  if (generation.elapsedMs < 0) {
    throw new Error('generation.elapsedMs must be non-negative.')
  }
  if (
    generation.inputMode === 'observation' &&
    totalCounts(generation.manualCatches) > 0
  ) {
    throw new Error('Observation generations cannot have manual catches.')
  }

  const expectedStartingFrequency = calculateMorphFrequencies(
    generation.startingCounts,
  )
  const expectedEndingFrequency = calculateMorphFrequencies(generation.endingCounts)
  const expectedStartingPercentage = calculateMorphPercentages(
    generation.startingCounts,
  )
  const expectedEndingPercentage = calculateMorphPercentages(generation.endingCounts)
  for (const morph of MORPH_IDS) {
    assertClose(
      generation.startingFrequencies[morph],
      expectedStartingFrequency[morph],
      `generation.startingFrequencies.${morph}`,
    )
    assertClose(
      generation.endingFrequencies[morph],
      expectedEndingFrequency[morph],
      `generation.endingFrequencies.${morph}`,
    )
    assertClose(
      generation.startingPercentages[morph],
      expectedStartingPercentage[morph],
      `generation.startingPercentages.${morph}`,
    )
    assertClose(
      generation.endingPercentages[morph],
      expectedEndingPercentage[morph],
      `generation.endingPercentages.${morph}`,
    )
  }
  return generation
}

function readPrediction(value: unknown): PredictionResponse {
  const record = asRecord(value, 'prediction')
  const outcome = record.outcome
  if (
    outcome !== 'camouflaged' &&
    outcome !== 'conspicuous' &&
    outcome !== 'no_change'
  ) {
    throw new Error('prediction.outcome is invalid.')
  }
  return { outcome, reason: readString(record, 'reason') }
}

function readHabitatExperiment(
  value: unknown,
  habitatId: HabitatId,
  selectedTimingMode: SelectedTimingMode,
): HabitatExperimentResult {
  const record = asRecord(value, `habitats.${habitatId}`)
  if (record.habitatId !== habitatId || !Array.isArray(record.generations)) {
    throw new Error(`habitats.${habitatId} is invalid.`)
  }
  const generations = record.generations.map((item) =>
    readGeneration(item, habitatId),
  )
  const habitat = HABITATS[habitatId]
  if (generations.length !== habitat.generationCount) {
    throw new Error(`${habitatId} must contain all configured generations.`)
  }
  if (generations.some((result) => result.timingMode !== selectedTimingMode)) {
    throw new Error('Generation timing modes must match the selected timing mode.')
  }
  validateSimulationState(
    {
      habitatId,
      generation: generations.length,
      counts: generations.at(-1)?.endingCounts ?? habitat.initialCounts,
      history: generations,
    },
    habitat,
  )
  return { habitatId, generations }
}

function readCheck(value: unknown): MisconceptionCheckResult {
  const record = asRecord(value, 'misconceptionCheck')
  const result = {
    questionId: readString(record, 'questionId'),
    firstAnswerId: readString(record, 'firstAnswerId'),
    firstAttemptCorrect: readBoolean(record, 'firstAttemptCorrect'),
    finalAnswerId: readString(record, 'finalAnswerId'),
    attempts: readInteger(record, 'attempts', 1),
  }
  if (result.firstAttemptCorrect && result.attempts !== 1) {
    throw new Error('A correct first attempt must have exactly one attempt.')
  }
  if (!result.firstAttemptCorrect && result.attempts < 2) {
    throw new Error('A corrected misconception requires at least two attempts.')
  }
  return result
}

function readPopulationEvidence(value: unknown): PopulationEvidenceReference {
  const record = asRecord(value, 'populationEvidence')
  if (record.kind !== 'population' || !HABITAT_IDS.includes(record.habitatId as HabitatId)) {
    throw new Error('Population evidence is invalid.')
  }
  return {
    kind: 'population',
    habitatId: record.habitatId as HabitatId,
    generation: readInteger(record, 'generation'),
  }
}

function readComparisonEvidence(value: unknown): ComparisonEvidenceReference {
  const record = asRecord(value, 'comparisonEvidence')
  if (record.kind !== 'comparison' || !HABITAT_IDS.includes(record.habitatId as HabitatId)) {
    throw new Error('Comparison evidence is invalid.')
  }
  const generation = readInteger(record, 'generation', 1)
  if (generation > HABITATS[record.habitatId as HabitatId].generationCount) {
    throw new Error('Comparison evidence generation is outside the habitat.')
  }
  return {
    kind: 'comparison',
    habitatId: record.habitatId as HabitatId,
    generation,
  }
}

function evidenceKey(reference: EvidenceReference): string {
  return `${reference.kind}:${reference.habitatId}:${reference.generation}`
}

function readEvidence(value: unknown): EvidenceSelection {
  const record = asRecord(value, 'evidence')
  if (!Array.isArray(record.population)) {
    throw new Error('evidence.population must be an array.')
  }
  const population = record.population.map(readPopulationEvidence)
  const required = new Set(
    HABITAT_IDS.flatMap((habitatId) => [
      `population:${habitatId}:0`,
      `population:${habitatId}:3`,
    ]),
  )
  const selected = new Set(population.map(evidenceKey))
  if (
    population.length !== required.size ||
    selected.size !== required.size ||
    [...required].some((key) => !selected.has(key))
  ) {
    throw new Error('Evidence must include Generation 0 and 3 for both habitats.')
  }
  return {
    population,
    comparison: readComparisonEvidence(record.comparison),
  }
}

function readCer(value: unknown, evidence: EvidenceSelection): CerResponse {
  const record = asRecord(value, 'cer')
  if (!Array.isArray(record.evidence)) {
    throw new Error('cer.evidence must be an array.')
  }
  const references = record.evidence.map((item) => {
    const itemRecord = asRecord(item, 'cer.evidence item')
    return itemRecord.kind === 'population'
      ? readPopulationEvidence(item)
      : readComparisonEvidence(item)
  })
  const expected = new Set(
    [...evidence.population, evidence.comparison].map(evidenceKey),
  )
  const actual = new Set(references.map(evidenceKey))
  if (
    references.length !== expected.size ||
    actual.size !== expected.size ||
    [...expected].some((key) => !actual.has(key))
  ) {
    throw new Error('CER evidence must match the selected evidence.')
  }
  return {
    claimId: readString(record, 'claimId'),
    evidence: references,
    reasoning: readString(record, 'reasoning'),
  }
}

function readPredatorPerformance(value: unknown): PredatorPerformance {
  const record = asRecord(value, 'predatorPerformance')
  return {
    manualCaptures: readInteger(record, 'manualCaptures'),
    misses: readInteger(record, 'misses'),
    protectedEscapes: readInteger(record, 'protectedEscapes'),
    points: readInteger(record, 'points'),
    accuracyPercent: readNumber(record, 'accuracyPercent'),
  }
}

function readScienceCompletion(value: unknown): ScienceCompletion {
  const record = asRecord(value, 'scienceCompletion')
  return {
    firstAttemptCorrect: readInteger(record, 'firstAttemptCorrect'),
    questionCount: readInteger(record, 'questionCount'),
    evidenceComplete: readBoolean(record, 'evidenceComplete'),
    cerComplete: readBoolean(record, 'cerComplete'),
  }
}

function sanitizeNaturalSelectionResult(value: unknown): NaturalSelectionResult {
  const record = asRecord(value, 'NaturalSelectionResult')
  if (record.schemaVersion !== RESULT_SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${RESULT_SCHEMA_VERSION}.`)
  }
  const seed = readNumber(record, 'seed')
  validateSeed(seed)
  const startedAt = readString(record, 'startedAt')
  const completedAt = readString(record, 'completedAt')
  if (
    Number.isNaN(Date.parse(startedAt)) ||
    Number.isNaN(Date.parse(completedAt)) ||
    Date.parse(completedAt) < Date.parse(startedAt)
  ) {
    throw new Error('Result timestamps are invalid.')
  }
  const selectedTimingMode = readTimingMode(
    record.selectedTimingMode,
    'selectedTimingMode',
  )
  const predictionRecord = asRecord(record.predictions, 'predictions')
  const habitatRecord = asRecord(record.habitats, 'habitats')
  const predictions = {
    reef_fish: readPrediction(predictionRecord.reef_fish),
    bark_moths: readPrediction(predictionRecord.bark_moths),
  }
  const habitats = {
    reef_fish: readHabitatExperiment(
      habitatRecord.reef_fish,
      'reef_fish',
      selectedTimingMode,
    ),
    bark_moths: readHabitatExperiment(
      habitatRecord.bark_moths,
      'bark_moths',
      selectedTimingMode,
    ),
  }
  if (!Array.isArray(record.misconceptionChecks)) {
    throw new Error('misconceptionChecks must be an array.')
  }
  const misconceptionChecks = record.misconceptionChecks.map(readCheck)
  if (
    misconceptionChecks.length !== 4 ||
    new Set(misconceptionChecks.map((check) => check.questionId)).size !== 4
  ) {
    throw new Error('Exactly four unique misconception checks are required.')
  }
  const evidence = readEvidence(record.evidence)
  const cer = readCer(record.cer, evidence)
  const predatorPerformance = readPredatorPerformance(record.predatorPerformance)
  const scienceCompletion = readScienceCompletion(record.scienceCompletion)

  const generations = HABITAT_IDS.flatMap(
    (habitatId) => habitats[habitatId].generations,
  )
  const manualCaptures = generations.reduce(
    (sum, generation) => sum + totalCounts(generation.manualCatches),
    0,
  )
  const misses = generations.reduce((sum, generation) => sum + generation.misses, 0)
  const protectedEscapes = generations.reduce(
    (sum, generation) => sum + generation.protectedEscapes,
    0,
  )
  const points = generations.reduce(
    (sum, generation) => sum + generation.predatorPoints,
    0,
  )
  // Protected escapes are conservation safeguards, not successful captures or
  // misses, so they are intentionally excluded from tap accuracy.
  const attempts = manualCaptures + misses
  const expectedAccuracy = attempts === 0 ? 0 : (manualCaptures / attempts) * 100
  if (
    predatorPerformance.manualCaptures !== manualCaptures ||
    predatorPerformance.misses !== misses ||
    predatorPerformance.protectedEscapes !== protectedEscapes ||
    predatorPerformance.points !== points
  ) {
    throw new Error('Predator performance does not match generation results.')
  }
  assertClose(
    predatorPerformance.accuracyPercent,
    expectedAccuracy,
    'predatorPerformance.accuracyPercent',
  )

  const firstAttemptCorrect = misconceptionChecks.filter(
    (check) => check.firstAttemptCorrect,
  ).length
  if (
    scienceCompletion.questionCount !== misconceptionChecks.length ||
    scienceCompletion.firstAttemptCorrect !== firstAttemptCorrect ||
    !scienceCompletion.evidenceComplete ||
    !scienceCompletion.cerComplete
  ) {
    throw new Error('Science completion does not match the completed study.')
  }

  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    sessionId: readString(record, 'sessionId'),
    seed,
    startedAt,
    completedAt,
    selectedTimingMode,
    predictions,
    habitats,
    misconceptionChecks,
    evidence,
    cer,
    predatorPerformance,
    scienceCompletion,
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

/** Serializes only approved fields, dropping accidental identity properties. */
export function serializeNaturalSelectionResult(
  result: NaturalSelectionResult,
): string {
  return JSON.stringify(sanitizeNaturalSelectionResult(result))
}

export function parseNaturalSelectionResult(
  serialized: string,
): NaturalSelectionResult {
  if (typeof serialized !== 'string' || serialized.trim().length === 0) {
    throw new Error('Serialized result must be non-empty JSON.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw new Error('Serialized result is not valid JSON.')
  }
  return sanitizeNaturalSelectionResult(parsed)
}
