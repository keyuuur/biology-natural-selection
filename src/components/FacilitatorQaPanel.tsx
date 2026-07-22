import { useEffect, useMemo, useState } from 'react'
import {
  summarizeQaLatencies,
  type QaSessionAggregate,
} from '../qa/facilitatorQaDiagnostics.ts'

type FacilitatorQaPanelProps = {
  aggregate: QaSessionAggregate
  onReset: () => void
  readRendererSnapshot: () => Record<string, unknown>
}


function numberFrom(snapshot: Record<string, unknown>, key: string): number | null {
  const value = snapshot[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function textFrom(snapshot: Record<string, unknown>, key: string): string | null {
  const value = snapshot[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function nestedNumber(snapshot: Record<string, unknown>, group: string, key: string): number | null {
  const value = snapshot[group]
  if (!value || typeof value !== 'object') return null
  const nested = (value as Record<string, unknown>)[key]
  return typeof nested === 'number' && Number.isFinite(nested) ? nested : null
}

function displayMilliseconds(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} ms`
}

function displayNumber(value: number | null, digits = 0): string {
  return value === null ? '—' : value.toFixed(digits)
}

/**
 * This panel is deliberately a compact, in-flow facilitator aid. It is only
 * mounted by an explicitly QA-enabled URL and intentionally renders aggregate
 * device facts—not organism IDs, traits, positions, student answers, or names.
 */
export function FacilitatorQaPanel({
  aggregate,
  onReset,
  readRendererSnapshot,
}: FacilitatorQaPanelProps) {
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>(() => readRendererSnapshot())

  useEffect(() => {
    const refresh = () => setSnapshot(readRendererSnapshot())
    refresh()
    const timer = window.setInterval(refresh, 500)
    return () => window.clearInterval(timer)
  }, [readRendererSnapshot])

  const latency = useMemo(
    () => summarizeQaLatencies(aggregate.feedbackLatencyMs),
    [aggregate.feedbackLatencyMs],
  )
  const pauseReasons = Array.isArray(snapshot.pauseReasons)
    ? snapshot.pauseReasons.filter((reason): reason is string => typeof reason === 'string')
    : []
  const controllerCount = numberFrom(snapshot, 'controllerCount')
  const canvasCount = numberFrom(snapshot, 'canvasCount')
  const rendererInactive = controllerCount === null || controllerCount === 0

  function resetSession(): void {
    onReset()
    setSnapshot(readRendererSnapshot())
  }

  return (
    <details
      aria-label="Facilitator diagnostics"
      className="facilitator-qa-panel"
      data-testid="facilitator-qa-panel"
      role="region"
    >
      <summary>Facilitator diagnostics <span>device-only · not saved</span></summary>
      <div className="facilitator-qa-panel__body">
        <p className="facilitator-qa-panel__note">
          Use only during technical checks. Input latency is measured from Phaser input handling to
          feedback creation; confirm visible feedback and freezes on the device.
        </p>
        <section aria-label="Input diagnostics">
          <h3>Input outcomes</h3>
          <dl className="facilitator-qa-panel__metrics">
            <div><dt>Caught</dt><dd data-testid="qa-caught-count">{aggregate.caught}</dd></div>
            <div><dt>Misses</dt><dd data-testid="qa-miss-count">{aggregate.misses}</dd></div>
            <div><dt>Protected</dt><dd data-testid="qa-protected-count">{aggregate.protectedAttempts}</dd></div>
            <div><dt>Latency samples</dt><dd data-testid="qa-latency-count">{latency.count}</dd></div>
            <div><dt>Latency median</dt><dd>{displayMilliseconds(latency.medianMs)}</dd></div>
            <div><dt>Latency p95</dt><dd data-testid="qa-latency-p95">{displayMilliseconds(latency.p95Ms)}</dd></div>
            <div><dt>Latency max</dt><dd>{displayMilliseconds(latency.maxMs)}</dd></div>
          </dl>
        </section>
        <section aria-label="Renderer diagnostics">
          <h3>Current renderer sample</h3>
          {rendererInactive ? (
            <p data-testid="qa-renderer-inactive">Renderer inactive or unavailable.</p>
          ) : (
            <dl className="facilitator-qa-panel__metrics">
              <div><dt>Round state</dt><dd data-testid="qa-round-state">{textFrom(snapshot, 'roundState') ?? '—'}</dd></div>
              <div><dt>Controllers / canvas</dt><dd data-testid="qa-renderer-counts">{displayNumber(controllerCount)} / {displayNumber(canvasCount)}</dd></div>
              <div><dt>Actors</dt><dd>{displayNumber(numberFrom(snapshot, 'actorCount'))}</dd></div>
              <div><dt>Average FPS</dt><dd data-testid="qa-average-fps">{displayNumber(nestedNumber(snapshot, 'frameMetrics', 'averageFps'), 1)}</dd></div>
              <div><dt>Frame p95</dt><dd data-testid="qa-frame-p95">{displayMilliseconds(nestedNumber(snapshot, 'frameMetrics', 'p95FrameTimeMs'))}</dd></div>
              <div><dt>Frames over 50 ms</dt><dd>{displayNumber(nestedNumber(snapshot, 'frameMetrics', 'framesOver50Ms'))}</dd></div>
              <div><dt>Frames sampled</dt><dd data-testid="qa-frame-sample-count">{displayNumber(nestedNumber(snapshot, 'frameMetrics', 'sampledFrames'))}</dd></div>
              <div><dt>Duplicate ends</dt><dd data-testid="qa-duplicate-ends">{displayNumber(numberFrom(snapshot, 'duplicateRoundEndCount'))}</dd></div>
              <div><dt>Pause reasons</dt><dd>{pauseReasons.length > 0 ? pauseReasons.join(', ') : 'none'}</dd></div>
            </dl>
          )}
        </section>
        <button className="secondary-button" data-testid="qa-reset" onClick={resetSession} type="button">
          Reset facilitator session data
        </button>
      </div>
    </details>
  )
}
