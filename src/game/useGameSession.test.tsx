import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGameSession } from './useGameSession.ts'

describe('useGameSession', () => {
  it('enforces the complete learning flow and creates a new replay session', () => {
    const { result } = renderHook(() => useGameSession())
    const originalSessionId = result.current.session.sessionId

    expect(result.current.session.stage).toBe('mission')
    act(() => result.current.enterObserve())
    expect(result.current.session.stage).toBe('observe')
    act(() => result.current.enterPrediction())
    expect(result.current.session.stage).toBe('prediction')
    act(() =>
      result.current.commitPrediction(
        'higher_speed',
        'Limited, distant food may affect which deer leave offspring.',
      ),
    )
    expect(result.current.session.stage).toBe('generations')

    for (let generation = 1; generation <= 5; generation += 1) {
      let prepared: ReturnType<typeof result.current.prepareGeneration> | null = null
      act(() => {
        prepared = result.current.prepareGeneration()
      })
      act(() => result.current.commitGeneration(prepared!.nextState))
      expect(result.current.session.simulation.generation).toBe(generation)
    }

    expect(result.current.session.stage).toBe('misconception')
    expect(
      result.current.graphPoints.map((point) => point.percentages.higher_speed),
    ).toEqual([50, 60, 65, 75, 85, 90])

    act(() => result.current.answerMisconception('individual-change', false))
    act(() => result.current.enterEvidence())
    expect(result.current.session.stage).toBe('misconception')

    act(() => result.current.answerMisconception('population-selection', true))
    act(() => result.current.enterEvidence())
    expect(result.current.session.stage).toBe('evidence')

    act(() => result.current.toggleEvidenceGeneration(0))
    act(() => result.current.enterCer())
    expect(result.current.session.stage).toBe('evidence')
    act(() => result.current.toggleEvidenceGeneration(5))
    act(() => result.current.selectSurvivorGeneration(3))
    act(() => result.current.enterCer())
    expect(result.current.session.stage).toBe('cer')

    act(() =>
      result.current.completeCer({
        claim: 'higher_speed',
        reasoning:
          'Higher-speed deer left more offspring, so their inherited trait increased in the population.',
      }),
    )
    expect(result.current.session.stage).toBe('results')
    expect(result.current.session.completedResult?.completionState).toBe('complete')
    expect(result.current.session.completedResult?.generations).toHaveLength(5)
    expect(result.current.session.completedResult?.cer.evidence).toHaveLength(3)

    act(() => result.current.replay())
    expect(result.current.session.stage).toBe('mission')
    expect(result.current.session.sessionId).not.toBe(originalSessionId)
  })
})
