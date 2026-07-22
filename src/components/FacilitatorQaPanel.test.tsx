import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { FacilitatorQaPanel } from './FacilitatorQaPanel.tsx'
import {
  emptyQaSessionAggregate,
  recordQaFeedbackLatency,
  recordQaOutcome,
  summarizeQaLatencies,
  type QaSessionAggregate,
} from '../qa/facilitatorQaDiagnostics.ts'

const rendererSnapshot = {
  roundState: 'running',
  controllerCount: 1,
  canvasCount: 1,
  actorCount: 40,
  duplicateRoundEndCount: 0,
  pauseReasons: [],
  frameMetrics: {
    averageFps: 58.7,
    p95FrameTimeMs: 19.8,
    framesOver50Ms: 0,
  },
}

afterEach(cleanup)

describe('FacilitatorQaPanel', () => {
  it('summarizes bounded numeric outcomes and feedback samples', () => {
    let aggregate = emptyQaSessionAggregate()
    aggregate = recordQaOutcome(aggregate, 'caught')
    aggregate = recordQaOutcome(aggregate, 'miss')
    aggregate = recordQaOutcome(aggregate, 'protected')
    for (let latency = 1; latency <= 121; latency += 1) {
      aggregate = recordQaFeedbackLatency(aggregate, latency)
    }

    expect(aggregate).toMatchObject({ caught: 1, misses: 1, protectedAttempts: 1 })
    expect(aggregate.feedbackLatencyMs).toHaveLength(120)
    expect(aggregate.feedbackLatencyMs[0]).toBe(2)
    expect(summarizeQaLatencies([4, 8, 12, 16, 20])).toEqual({
      count: 5,
      medianMs: 12,
      p95Ms: 20,
      maxMs: 20,
    })
  })

  it('shows only aggregate device facts and never renders sensitive snapshot fields', () => {
    const { container } = render(
      <FacilitatorQaPanel
        aggregate={{
          caught: 2,
          misses: 1,
          protectedAttempts: 1,
          feedbackLatencyMs: [4, 8, 12, 16, 20],
        }}
        onReset={() => {}}
        readRendererSnapshot={() => ({
          ...rendererSnapshot,
          actors: [{ id: 'organism-id-must-not-render', morphId: 'camouflaged' }],
          seed: 'placement-seed-must-not-render',
          name: 'student-name-must-not-render',
          prediction: 'prediction-must-not-render',
          answer: 'answer-must-not-render',
          cer: 'cer-must-not-render',
        })}
      />,
    )

    expect(screen.getByTestId('facilitator-qa-panel').hasAttribute('open')).toBe(false)
    expect(screen.getByTestId('qa-caught-count').textContent).toContain('2')
    expect(screen.getByTestId('qa-miss-count').textContent).toContain('1')
    expect(screen.getByTestId('qa-protected-count').textContent).toContain('1')
    expect(screen.getByTestId('qa-latency-p95').textContent).toContain('20.0 ms')
    expect(screen.getByTestId('qa-renderer-counts').textContent).toContain('1 / 1')
    expect(screen.getByTestId('qa-average-fps').textContent).toContain('58.7')
    expect(container.textContent).not.toContain('organism-id-must-not-render')
    expect(container.textContent).not.toContain('student-name-must-not-render')
    expect(container.textContent).not.toContain('prediction-must-not-render')
    expect(container.textContent).not.toContain('answer-must-not-render')
    expect(container.textContent).not.toContain('cer-must-not-render')
  })

  it('can clear only the resettable facilitator aggregate', () => {
    function Harness() {
      const [aggregate, setAggregate] = useState<QaSessionAggregate>({
        caught: 2,
        misses: 1,
        protectedAttempts: 1,
        feedbackLatencyMs: [7, 13],
      })
      return (
        <FacilitatorQaPanel
          aggregate={aggregate}
          onReset={() => setAggregate(emptyQaSessionAggregate())}
          readRendererSnapshot={() => rendererSnapshot}
        />
      )
    }

    render(<Harness />)
    fireEvent.click(screen.getByTestId('qa-reset'))

    expect(screen.getByTestId('qa-caught-count').textContent).toContain('0')
    expect(screen.getByTestId('qa-miss-count').textContent).toContain('0')
    expect(screen.getByTestId('qa-protected-count').textContent).toContain('0')
    expect(screen.getByTestId('qa-latency-count').textContent).toContain('0')
    expect(screen.getByTestId('qa-renderer-counts').textContent).toContain('1 / 1')
  })

  it('reports an inactive renderer without blocking the reset control', () => {
    render(
      <FacilitatorQaPanel
        aggregate={emptyQaSessionAggregate()}
        onReset={() => {}}
        readRendererSnapshot={() => ({ controllerCount: 0, canvasCount: 0 })}
      />,
    )

    expect(screen.getByTestId('qa-renderer-inactive').textContent).toMatch(/inactive or unavailable/i)
    expect((screen.getByTestId('qa-reset') as HTMLButtonElement).disabled).toBe(false)
  })
})
