export type QaOutcome = 'caught' | 'miss' | 'protected'

export type QaSessionAggregate = {
  caught: number
  misses: number
  protectedAttempts: number
  feedbackLatencyMs: readonly number[]
}

export type QaLatencySummary = {
  count: number
  medianMs: number | null
  p95Ms: number | null
  maxMs: number | null
}

const MAX_QA_FEEDBACK_SAMPLES = 120

export function emptyQaSessionAggregate(): QaSessionAggregate {
  return {
    caught: 0,
    misses: 0,
    protectedAttempts: 0,
    feedbackLatencyMs: [],
  }
}

export function recordQaOutcome(
  aggregate: QaSessionAggregate,
  outcome: QaOutcome,
): QaSessionAggregate {
  if (outcome === 'caught') return { ...aggregate, caught: aggregate.caught + 1 }
  if (outcome === 'miss') return { ...aggregate, misses: aggregate.misses + 1 }
  return { ...aggregate, protectedAttempts: aggregate.protectedAttempts + 1 }
}

export function recordQaFeedbackLatency(
  aggregate: QaSessionAggregate,
  latencyMs: number,
): QaSessionAggregate {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) return aggregate
  return {
    ...aggregate,
    feedbackLatencyMs: [...aggregate.feedbackLatencyMs, latencyMs].slice(-MAX_QA_FEEDBACK_SAMPLES),
  }
}

function percentile(samples: readonly number[], fraction: number): number | null {
  if (samples.length === 0) return null
  const sorted = [...samples].sort((first, second) => first - second)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))
  return sorted[index] ?? null
}

export function summarizeQaLatencies(samples: readonly number[]): QaLatencySummary {
  const validSamples = samples.filter((sample) => Number.isFinite(sample) && sample >= 0)
  return {
    count: validSamples.length,
    medianMs: percentile(validSamples, 0.5),
    p95Ms: percentile(validSamples, 0.95),
    maxMs: validSamples.length > 0 ? Math.max(...validSamples) : null,
  }
}
