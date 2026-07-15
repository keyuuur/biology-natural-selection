import { describe, expect, it } from 'vitest'
import { runAllGenerations } from './generationRunner'
import {
  createNaturalSelectionResult,
  parseNaturalSelectionResult,
  serializeNaturalSelectionResult,
} from './resultSchema'
import { DEFAULT_SCENARIO, createInitialState } from './scenario'
import type { NaturalSelectionResult } from './types'

function makeCompletedResult(): NaturalSelectionResult {
  const finalState = runAllGenerations(
    createInitialState(DEFAULT_SCENARIO),
    DEFAULT_SCENARIO,
  )

  return createNaturalSelectionResult({
    sessionId: 'local-session-001',
    startedAt: '2026-07-09T15:00:00.000Z',
    completedAt: '2026-07-09T15:12:00.000Z',
    scenarioId: DEFAULT_SCENARIO.id,
    prediction: {
      trait: 'higher_speed',
      reason: 'Higher-speed deer will reach more of the distant food.',
    },
    generations: finalState.history,
    misconceptionResponse: {
      selectedAnswer:
        'The population changed because higher-speed deer left more offspring.',
      isCorrect: true,
    },
    cer: {
      claim: 'The inherited higher-speed trait became more common.',
      evidence: ['generation-0', 'generation-5', 'generation-3-survivors'],
      reasoning:
        'More higher-speed deer reached food and reproduced, so their inherited trait appeared in more offspring.',
    },
    completionState: 'complete',
    clientVersion: '0.1.0',
  })
}

describe('natural-selection result serialization', () => {
  it('round-trips the approved result fields', () => {
    const result = makeCompletedResult()
    const serialized = serializeNaturalSelectionResult(result)

    expect(parseNaturalSelectionResult(serialized)).toEqual(result)
  })

  it('drops accidental identity fields from serialized output', () => {
    const resultWithIdentityFields = {
      ...makeCompletedResult(),
      studentName: 'Not allowed',
      studentId: 'Not allowed',
      period: 'Not allowed',
      cer: {
        ...makeCompletedResult().cer,
        studentEmail: 'not-allowed@example.test',
      },
    } as NaturalSelectionResult

    const serialized = serializeNaturalSelectionResult(resultWithIdentityFields)
    const parsed = JSON.parse(serialized) as Record<string, unknown>

    expect(parsed).not.toHaveProperty('studentName')
    expect(parsed).not.toHaveProperty('studentId')
    expect(parsed).not.toHaveProperty('period')
    expect(parsed.cer).not.toHaveProperty('studentEmail')
  })

  it('supports an unfinished local draft', () => {
    const draft = createNaturalSelectionResult({
      sessionId: 'local-session-draft',
      startedAt: '2026-07-09T15:00:00.000Z',
      completedAt: null,
      scenarioId: DEFAULT_SCENARIO.id,
      prediction: { trait: null, reason: '' },
      generations: [],
      misconceptionResponse: null,
      cer: { claim: '', evidence: [], reasoning: '' },
      completionState: 'draft',
      clientVersion: '0.1.0',
    })

    expect(parseNaturalSelectionResult(serializeNaturalSelectionResult(draft))).toEqual(
      draft,
    )
  })

  it('preserves a no-change student prediction', () => {
    const result = createNaturalSelectionResult({
      ...makeCompletedResult(),
      prediction: {
        trait: 'no_change',
        reason: 'I think both traits will remain equally common.',
      },
    })

    expect(parseNaturalSelectionResult(serializeNaturalSelectionResult(result)).prediction)
      .toEqual(result.prediction)
  })

  it('rejects invalid JSON and inconsistent completion timestamps', () => {
    expect(() => parseNaturalSelectionResult('{not-json')).toThrow(
      'not valid JSON',
    )
    expect(() =>
      createNaturalSelectionResult({
        ...makeCompletedResult(),
        completedAt: null,
      }),
    ).toThrow('requires completedAt')
  })
})
