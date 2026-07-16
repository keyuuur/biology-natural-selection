import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createFreshSession } from '../game/sessionReducer.ts'
import {
  BARK_MOTH_HABITAT,
  REEF_FISH_HABITAT,
  createInitialState,
  createNaturalSelectionResult,
  runGeneration,
  type GenerationResult,
  type HabitatConfig,
  type NaturalSelectionResult,
  type PlayerRoundMetrics,
} from '../simulation/index.ts'
import { LocalResultSaver } from './resultSaver.ts'

const DRAFT_KEY = 'natural-selection:v2:session-draft'
const RESULT_KEY = 'natural-selection:v2:last-result'

function completedHabitat(habitat: HabitatConfig): readonly GenerationResult[] {
  let state = createInitialState(habitat)
  for (let generation = 1; generation <= 3; generation += 1) {
    const metrics: PlayerRoundMetrics = {
      seed: generation * 100 + (habitat.id === 'reef_fish' ? 1 : 2),
      manualCatches: { camouflaged: 0, conspicuous: 0 },
      misses: 0,
      protectedEscapes: 0,
      elapsedMs: 25_000,
      timingMode: 'standard',
      inputMode: 'observation',
      fallbackUsed: true,
    }
    state = runGeneration(state, metrics, habitat).nextState
  }
  return state.history
}

function completedResult(): NaturalSelectionResult {
  const reef = completedHabitat(REEF_FISH_HABITAT)
  const moths = completedHabitat(BARK_MOTH_HABITAT)
  const evidence = {
    population: [
      { kind: 'population' as const, habitatId: 'reef_fish' as const, generation: 0 },
      { kind: 'population' as const, habitatId: 'reef_fish' as const, generation: 3 },
      { kind: 'population' as const, habitatId: 'bark_moths' as const, generation: 0 },
      { kind: 'population' as const, habitatId: 'bark_moths' as const, generation: 3 },
    ],
    comparison: {
      kind: 'comparison' as const,
      habitatId: 'reef_fish' as const,
      generation: 1,
    },
  }
  const misconceptionChecks = [
    'environmental-pressure',
    'population-change',
    'fitness',
    'changed-environment',
  ].map((questionId) => ({
    questionId,
    firstAnswerId: 'correct',
    firstAttemptCorrect: true,
    finalAnswerId: 'correct',
    attempts: 1,
  }))

  return createNaturalSelectionResult({
    sessionId: 'anonymous-test-session',
    seed: 42,
    startedAt: '2026-07-15T14:00:00.000Z',
    completedAt: '2026-07-15T14:12:00.000Z',
    selectedTimingMode: 'standard',
    predictions: {
      reef_fish: { outcome: 'camouflaged', reason: 'The reef pattern may reduce detection.' },
      bark_moths: { outcome: 'camouflaged', reason: 'The bark pattern may reduce detection.' },
    },
    habitats: {
      reef_fish: { habitatId: 'reef_fish', generations: reef },
      bark_moths: { habitatId: 'bark_moths', generations: moths },
    },
    misconceptionChecks,
    evidence,
    cer: {
      claimId: 'data-supported-selection',
      evidence: [...evidence.population, evidence.comparison],
      reasoning:
        'Inherited variation affected survival and reproduction, changing offspring percentages.',
    },
    predatorPerformance: {
      manualCaptures: 0,
      misses: 0,
      protectedEscapes: 0,
      points: 0,
      accuracyPercent: 0,
    },
    scienceCompletion: {
      firstAttemptCorrect: 4,
      questionCount: 4,
      evidenceComplete: true,
      cerComplete: true,
    },
    clientVersion: 'test',
  })
}

describe('LocalResultSaver v2', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    window.localStorage.clear()
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
    window.localStorage.clear()
  })

  it('saves, loads, and clears a complete session draft', () => {
    const saver = new LocalResultSaver()
    const session = createFreshSession(1234)

    saver.saveDraft(session)
    const loaded = saver.loadDraft()
    expect(loaded.status).toBe('valid')
    if (loaded.status === 'valid') {
      expect(loaded.draft.session).toMatchObject({
        sessionId: session.sessionId,
        seed: 1234,
        stage: 'mission',
      })
      expect(loaded.draft.session.completedResult).toBeNull()
    }

    saver.clearDraft()
    expect(saver.loadDraft()).toEqual({ status: 'none' })
  })

  it('saves an anonymous completed result and clears the resumable draft', () => {
    const saver = new LocalResultSaver()
    saver.saveDraft(createFreshSession(99))
    saver.saveResult(completedResult())

    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull()
    expect(saver.loadLastResult()).toEqual(completedResult())
    expect(window.localStorage.getItem(RESULT_KEY)).not.toContain('studentName')
    expect(window.localStorage.getItem(RESULT_KEY)).not.toContain('period')
  })

  it.each([
    ['incompatible schema', JSON.stringify({ schemaVersion: '1.0', savedAt: new Date().toISOString(), session: {} })],
    ['corrupt JSON', '{broken'],
  ])('discards an %s draft without blocking a fresh study', (_label, serialized) => {
    const saver = new LocalResultSaver()
    window.localStorage.setItem(DRAFT_KEY, serialized)

    const loaded = saver.loadDraft()
    expect(loaded.status).toBe('discarded')
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('keeps test-only storage failure playable and ignores the flag without e2e=1', () => {
    const saver = new LocalResultSaver()
    window.history.replaceState({}, '', '/?e2eStorage=fail')
    expect(() => saver.saveDraft(createFreshSession(7))).not.toThrow()

    window.localStorage.clear()
    window.history.replaceState({}, '', '/?e2e=1&e2eStorage=fail')
    expect(() => saver.saveDraft(createFreshSession(8))).toThrow(
      'This browser could not save locally',
    )
    expect(saver.loadDraft()).toMatchObject({
      status: 'unavailable',
      message: expect.stringMatching(/cannot be resumed/i),
    })
  })

  it('returns null for corrupt completed-result JSON', () => {
    const saver = new LocalResultSaver()
    window.localStorage.setItem(RESULT_KEY, '{broken')
    expect(saver.loadLastResult()).toBeNull()
  })
})
