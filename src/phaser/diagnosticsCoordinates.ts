type CanvasActorDiagnostic = {
  center?: { x: number; y: number }
  hitBounds?: { x: number; y: number; width: number; height: number }
  visualBounds?: { x: number; y: number; width: number; height: number }
  patrolBounds?: { x: number; y: number; width: number; height: number }
  [key: string]: unknown
}

/**
 * Converts Phaser's canvas-space diagnostics into CSS client coordinates so
 * browser QA can compare actor centers and every visible/input boundary.
 * Original canvas values are retained under `canvas*` keys for renderer-only
 * debugging.
 */
export function diagnosticsWithClientCoordinates(
  diagnostics: Record<string, unknown>,
  canvas: HTMLCanvasElement | null,
): Record<string, unknown> {
  const rawFrameMetrics = diagnostics.frameMetrics
  const frameMetrics = rawFrameMetrics && typeof rawFrameMetrics === 'object'
    ? {
        ...rawFrameMetrics,
        medianFrameMs:
          Reflect.get(rawFrameMetrics, 'medianFrameTimeMs') ?? Reflect.get(rawFrameMetrics, 'medianFrameMs'),
        p95FrameMs:
          Reflect.get(rawFrameMetrics, 'p95FrameTimeMs') ?? Reflect.get(rawFrameMetrics, 'p95FrameMs'),
      }
    : rawFrameMetrics
  if (!canvas || !Array.isArray(diagnostics.actors)) {
    return { ...diagnostics, frameMetrics }
  }

  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width > 0 ? rect.width / canvas.width : 1
  const scaleY = canvas.height > 0 ? rect.height / canvas.height : 1
  const actors = (diagnostics.actors as CanvasActorDiagnostic[]).map((actor) => {
    const canvasCenter = actor.center
    const canvasHitBounds = actor.hitBounds
    const canvasVisualBounds = actor.visualBounds
    const canvasPatrolBounds = actor.patrolBounds
    return {
      ...actor,
      ...(canvasCenter
        ? {
            canvasCenter,
            center: {
              x: rect.left + canvasCenter.x * scaleX,
              y: rect.top + canvasCenter.y * scaleY,
            },
          }
        : {}),
      ...(canvasHitBounds
        ? {
            canvasHitBounds,
            hitBounds: {
              x: rect.left + canvasHitBounds.x * scaleX,
              y: rect.top + canvasHitBounds.y * scaleY,
              width: canvasHitBounds.width * scaleX,
              height: canvasHitBounds.height * scaleY,
            },
          }
        : {}),
      ...(canvasVisualBounds
        ? {
            canvasVisualBounds,
            visualBounds: {
              x: rect.left + canvasVisualBounds.x * scaleX,
              y: rect.top + canvasVisualBounds.y * scaleY,
              width: canvasVisualBounds.width * scaleX,
              height: canvasVisualBounds.height * scaleY,
            },
          }
        : {}),
      ...(canvasPatrolBounds
        ? {
            canvasPatrolBounds,
            patrolBounds: {
              x: rect.left + canvasPatrolBounds.x * scaleX,
              y: rect.top + canvasPatrolBounds.y * scaleY,
              width: canvasPatrolBounds.width * scaleX,
              height: canvasPatrolBounds.height * scaleY,
            },
          }
        : {}),
    }
  })

  return { ...diagnostics, actors, frameMetrics }
}
