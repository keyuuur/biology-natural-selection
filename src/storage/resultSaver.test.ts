import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SCENARIO,
  createInitialState,
  createNaturalSelectionResult,
  runAllGenerations,
} from '../simulation/index.ts'
import { LocalResultSaver } from './resultSaver.ts'

function completedResult() {
  const finalState = runAllGenerations(
    createInitialState(DEFAULT_SCENARIO),
    DEFAULT_SCENARIO,
  )
  return createNaturalSelectionResult({
    sessionId: 'test-session',
    startedAt: '2026-07-09T12:00:00.000Z',
    completedAt: '2026-07-09T12:10:00.000Z',
    scenarioId: DEFAULT_SCENARIO.id,
    prediction: {
      trait: 'higher_speed',
      reason: 'Higher-speed deer may leave more offspring.',
    },
    generations: finalState.history,
    misconceptionResponse: {
      selectedAnswer: 'population-selection',
      isCorrect: true,
    },
    cer: {
      claim: 'The higher-speed trait became more common.',
      evidence: ['Generation 0 was 50%.', 'Generation 5 was 90%.'],
      reasoning: 'Differential reproduction changed the population.',
    },
    completionState: 'complete',
    clientVersion: 'test',
  })
}

describe('LocalResultSaver', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips a completed identity-free result', async () => {
    const saver = new LocalResultSaver()
    const result = completedResult()
    await saver.save(result)

    expect(saver.loadLastResult()).toEqual(result)
    expect(JSON.stringify(saver.loadLastResult())).not.toContain('studentName')
    expect(JSON.stringify(saver.loadLastResult())).not.toContain('period')
  })

  it('ignores corrupt local JSON safely', () => {
    const saver = new LocalResultSaver()
    window.localStorage.setItem('natural-selection:v1:last-result', '{broken')

    expect(saver.loadLastResult()).toBeNull()
    expect(window.localStorage.getItem('natural-selection:v1:last-result')).toBeNull()
  })

  it('rejects storage failure instead of claiming success', async () => {
    const saver = new LocalResultSaver()
    const storageSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota full')
      })

    await expect(saver.save(completedResult())).rejects.toThrow(
      'This browser could not save locally',
    )
    storageSpy.mockRestore()
  })
})
