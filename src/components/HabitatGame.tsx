import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  HabitatId,
  MorphCounts,
  MorphId,
  PlayerRoundMetrics,
  SelectedTimingMode,
} from '../simulation/index.ts'
import { deriveSeed } from '../simulation/index.ts'
import {
  diagnosticsBridgeEnabled,
  interactionQaParams,
  readUnsignedE2eSeed,
} from '../testing/e2eControls.ts'
import { HABITAT_STUDENT_COPY } from '../learning/index.ts'
import type { PhaserSceneController } from '../phaser/PhaserSceneController.ts'
import { diagnosticsWithClientCoordinates } from '../phaser/diagnosticsCoordinates.ts'
import { loadPhaserSceneController } from '../phaser/loadPhaserSceneController.ts'
import type { SceneOrganism, SceneRound } from '../phaser/HabitatScene.ts'

type HabitatGameProps = {
  active: boolean
  habitatId: HabitatId
  habitatTitle: string
  generation: number
  counts: MorphCounts
  roundSeed: number
  timingMode: SelectedTimingMode
  durationMs: number
  movementScale: number
  hitAreaScale: number
  forceRendererFailure?: boolean
  onAnnounce?: (message: string) => void
  onComplete: (metrics: PlayerRoundMetrics) => void
}

type RoundStatus = 'loading' | 'ready' | 'running' | 'paused' | 'resolving' | 'fallback'
type PauseReason = 'host' | 'visibility' | 'blur' | 'resize'

type MutableMetrics = {
  manualCatches: MorphCounts
  misses: number
  protectedEscapes: number
  elapsedMs: number
}

type AcceptedCaptureTrace = {
  organismId: string
  morphId: MorphId
  elapsedMs: number
}

type InteractionController = PhaserSceneController & {
  setPauseReason?: (reason: PauseReason, active: boolean) => void
  getDiagnostics?: () => Record<string, unknown>
}

type InteractionQaBridge = {
  snapshot: () => Record<string, unknown>
}

type QaWindow = Window & {
  __NS_INTERACTION_QA__?: InteractionQaBridge
}

function emptyMetrics(): MutableMetrics {
  return {
    manualCatches: { camouflaged: 0, conspicuous: 0 },
    misses: 0,
    protectedEscapes: 0,
    elapsedMs: 0,
  }
}

function total(counts: MorphCounts): number {
  return counts.camouflaged + counts.conspicuous
}

function makeOrganisms(counts: MorphCounts, roundId: string): SceneOrganism[] {
  return (['camouflaged', 'conspicuous'] as const).flatMap((morphId) =>
    Array.from({ length: counts[morphId] }, (_, index) => ({
      id: `${roundId}:${morphId}:${index}`,
      morphId,
    })),
  )
}

function setControllerPause(
  controller: PhaserSceneController,
  reason: PauseReason,
  active: boolean,
): void {
  const interactionController = controller as InteractionController
  if (interactionController.setPauseReason) {
    interactionController.setPauseReason(reason, active)
  } else if (active) {
    controller.pause()
  } else {
    controller.resume()
  }
}

export function HabitatGame(props: HabitatGameProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const fallbackHeadingRef = useRef<HTMLHeadingElement>(null)
  const controllerRef = useRef<PhaserSceneController | null>(null)
  const rendererBrokenRef = useRef(props.forceRendererFailure ?? false)
  const rendererInitializationRef = useRef(0)
  const rendererWatchdogRef = useRef<number | null>(null)
  const completionLockedRef = useRef(false)
  const completionDeliveredRef = useRef(false)
  const resolvingTimeoutRef = useRef<number | null>(null)
  const handledOrganismIdsRef = useRef(new Set<string>())
  const metricsRef = useRef<MutableMetrics>(emptyMetrics())
  const firstAcceptedCatchElapsedMsRef = useRef<number | null>(null)
  const acceptedCaptureTraceRef = useRef<AcceptedCaptureTrace[]>([])
  const visibilityHandlerRef = useRef<(() => void) | null>(null)
  const blurHandlerRef = useRef<(() => void) | null>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const qaPlacementSeed = useMemo(
    () => readUnsignedE2eSeed(interactionQaParams(), 'e2ePlacementSeed'),
    [],
  )

  const roundId = `${props.habitatId}:g${props.generation}:s${props.roundSeed}`
  const organisms = useMemo(
    () => makeOrganisms(props.counts, roundId),
    [props.counts, roundId],
  )
  const organismsRef = useRef(organisms)
  organismsRef.current = organisms
  const roundIdRef = useRef(roundId)
  roundIdRef.current = roundId

  const initialStatus: RoundStatus = props.forceRendererFailure ? 'fallback' : 'loading'
  const [status, setStatus] = useState<RoundStatus>(initialStatus)
  const statusRef = useRef<RoundStatus>(initialStatus)
  const [remainingMs, setRemainingMs] = useState(props.durationMs)
  const remainingMsRef = useRef(props.durationMs)
  const lastVisibleSecondRef = useRef(Math.ceil(props.durationMs / 1000))
  const lastAnnouncedSecondRef = useRef<number | null>(null)
  const [displayMetrics, setDisplayMetrics] = useState<MutableMetrics>(metricsRef.current)
  const [rendererMessage, setRendererMessage] = useState(
    props.forceRendererFailure
      ? 'Observation mode is active because graphics are unavailable.'
      : 'Preparing habitat…',
  )
  function announce(message: string): void {
    propsRef.current.onAnnounce?.(message)
  }

  function transition(nextStatus: RoundStatus): void {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }

  function clearRendererWatchdog(): void {
    if (rendererWatchdogRef.current !== null) {
      window.clearTimeout(rendererWatchdogRef.current)
      rendererWatchdogRef.current = null
    }
  }

  function removePartialCanvas(): void {
    hostRef.current?.querySelectorAll('canvas').forEach((canvas) => canvas.remove())
  }

  function disposeRenderer(): void {
    const visibilityHandler = visibilityHandlerRef.current
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandlerRef.current = null
    }
    const blurHandler = blurHandlerRef.current
    if (blurHandler) {
      window.removeEventListener('blur', blurHandler)
      blurHandlerRef.current = null
    }

    const controller = controllerRef.current
    controllerRef.current = null
    controller?.dispose()
    removePartialCanvas()
  }

  useEffect(() => {
    if (!diagnosticsBridgeEnabled()) return

    const qaWindow = window as QaWindow
    const installedQaBridge: InteractionQaBridge = {
      snapshot: () => {
        const canvas = hostRef.current?.querySelector('canvas') ?? null
        const controller = controllerRef.current
        const rendererDiagnostics = diagnosticsWithClientCoordinates(
          (controller as InteractionController | null)?.getDiagnostics?.() ?? {},
          canvas,
        )
        return {
          ...rendererDiagnostics,
          roundState: statusRef.current,
          roundStatus: statusRef.current,
          remainingMs: remainingMsRef.current,
          manualCatches: total(metricsRef.current.manualCatches),
          manualCatchesByMorph: { ...metricsRef.current.manualCatches },
          misses: metricsRef.current.misses,
          protectedAttempts: metricsRef.current.protectedEscapes,
          firstAcceptedCatchElapsedMs: firstAcceptedCatchElapsedMsRef.current,
          acceptedCaptureTrace: acceptedCaptureTraceRef.current.map((entry) => ({ ...entry })),
          roundElapsedMs: metricsRef.current.elapsedMs,
          canvasCount: hostRef.current?.querySelectorAll('canvas').length ?? 0,
          documentCanvasCount: document.querySelectorAll('.habitat-canvas-host canvas').length,
        }
      },
    }
    qaWindow.__NS_INTERACTION_QA__ = installedQaBridge
    return () => {
      if (qaWindow.__NS_INTERACTION_QA__ === installedQaBridge) {
        delete qaWindow.__NS_INTERACTION_QA__
      }
    }
  }, [])

  function updateVisibleTime(nextRemainingMs: number): void {
    const nextSecond = Math.max(0, Math.ceil(nextRemainingMs / 1000))
    remainingMsRef.current = nextRemainingMs
    if (nextSecond !== lastVisibleSecondRef.current) {
      lastVisibleSecondRef.current = nextSecond
      setRemainingMs(nextRemainingMs)
    }
    const shouldAnnounce = nextSecond > 0 && (nextSecond % 10 === 0 || nextSecond <= 5)
    if (shouldAnnounce && lastAnnouncedSecondRef.current !== nextSecond) {
      lastAnnouncedSecondRef.current = nextSecond
      announce(`${nextSecond} seconds remaining.`)
    }
  }

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    if (props.active) {
      setControllerPause(controller, 'host', false)
      const scheduledStatus = statusRef.current
      const frame = window.requestAnimationFrame(() => {
        if (
          controllerRef.current !== controller ||
          rendererBrokenRef.current ||
          !propsRef.current.active
        ) {
          return
        }
        // Layout still needs a stable-frame resize after the renderer appears.
        // Only the preview reset below is unsafe once a student has started.
        controller.resize()
        if (
          statusRef.current !== scheduledStatus ||
          statusRef.current === 'running' ||
          statusRef.current === 'resolving' ||
          statusRef.current === 'paused'
        ) {
          return
        }
        controller.prepareGeneration(currentSceneRound())
        transition('ready')
        setRendererMessage('Habitat ready. Start when you are ready to hunt.')
      })
      return () => window.cancelAnimationFrame(frame)
    }
    setControllerPause(controller, 'host', true)
  }, [props.active])

  function snapshotMetrics(): void {
    setDisplayMetrics({
      manualCatches: { ...metricsRef.current.manualCatches },
      misses: metricsRef.current.misses,
      protectedEscapes: metricsRef.current.protectedEscapes,
      elapsedMs: metricsRef.current.elapsedMs,
    })
  }

  function currentSceneRound(): SceneRound {
    const current = propsRef.current
    return {
      roundId: roundIdRef.current,
      habitatId: current.habitatId,
      organisms: organismsRef.current,
      durationMs: current.durationMs,
      movementScale: current.movementScale,
      hitAreaScale: current.hitAreaScale,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      placementSeed: qaPlacementSeed ?? deriveSeed(current.roundSeed, 'placement'),
      movementSeed: deriveSeed(current.roundSeed, 'movement'),
    }
  }

  function deliverCompletion(inputMode: 'interactive' | 'observation', fallbackUsed: boolean): void {
    if (completionDeliveredRef.current) return
    completionDeliveredRef.current = true
    const current = propsRef.current
    current.onComplete({
      seed: current.roundSeed,
      manualCatches: { ...metricsRef.current.manualCatches },
      misses: metricsRef.current.misses,
      protectedEscapes: metricsRef.current.protectedEscapes,
      elapsedMs: metricsRef.current.elapsedMs,
      timingMode: current.timingMode,
      inputMode,
      fallbackUsed,
    })
  }

  function finishImmediately(inputMode: 'interactive' | 'observation', fallbackUsed: boolean): void {
    if (completionLockedRef.current || completionDeliveredRef.current) return
    completionLockedRef.current = true
    controllerRef.current?.finishRound()
    deliverCompletion(inputMode, fallbackUsed)
  }

  function beginResolving(trigger: 'manual' | 'timer'): void {
    if (completionLockedRef.current || completionDeliveredRef.current) return
    completionLockedRef.current = true
    controllerRef.current?.finishRound()
    transition('resolving')
    const caught = total(metricsRef.current.manualCatches)
    const message = trigger === 'manual'
      ? '12 of 12 caught. Calculating survivors and offspring.'
      : `You caught ${caught}. The model completes the remaining ${12 - caught} predation events.`
    setRendererMessage(message)
    announce(message)
    resolvingTimeoutRef.current = window.setTimeout(() => {
      resolvingTimeoutRef.current = null
      deliverCompletion('interactive', false)
    }, 700)
  }

  function failRenderer(message: string): void {
    // Renderer failure is a study-level condition. Latching it before any UI
    // transition prevents later generations from returning to a loading state.
    rendererBrokenRef.current = true
    rendererInitializationRef.current += 1
    clearRendererWatchdog()

    const manualCaptureCount = total(metricsRef.current.manualCatches)
    completionLockedRef.current = true
    controllerRef.current?.finishRound()
    disposeRenderer()

    if (completionDeliveredRef.current) return
    if (resolvingTimeoutRef.current !== null) {
      window.clearTimeout(resolvingTimeoutRef.current)
      resolvingTimeoutRef.current = null
    }

    if (manualCaptureCount > 0) {
      deliverCompletion('interactive', true)
      return
    }

    completionLockedRef.current = false
    const fallbackMessage = `${message} Observation mode is available.`
    setRendererMessage(fallbackMessage)
    announce(fallbackMessage)
    transition('fallback')
  }

  useEffect(() => {
    if (resolvingTimeoutRef.current !== null) {
      window.clearTimeout(resolvingTimeoutRef.current)
      resolvingTimeoutRef.current = null
    }
    completionLockedRef.current = false
    completionDeliveredRef.current = false
    handledOrganismIdsRef.current.clear()
    metricsRef.current = emptyMetrics()
    firstAcceptedCatchElapsedMsRef.current = null
    acceptedCaptureTraceRef.current = []
    setDisplayMetrics(metricsRef.current)
    remainingMsRef.current = props.durationMs
    lastVisibleSecondRef.current = Math.ceil(props.durationMs / 1000)
    lastAnnouncedSecondRef.current = null
    setRemainingMs(props.durationMs)
    if (rendererBrokenRef.current) {
      transition('fallback')
      setRendererMessage('Observation mode is active because graphics are unavailable.')
    } else if (controllerRef.current && props.active) {
      controllerRef.current.prepareGeneration(currentSceneRound())
      transition('ready')
      setRendererMessage('Habitat ready. Start when you are ready to hunt.')
    } else if (!props.forceRendererFailure) {
      transition('loading')
      setRendererMessage('Preparing habitat…')
    }
  }, [roundId, props.active, props.durationMs, props.forceRendererFailure])

  // A renderer failure happens inside an active round, so the app-level
  // stage focus effect does not run. Move focus to the native fallback heading
  // after it appears so keyboard and screen-reader users receive the new
  // study path rather than being left on a removed canvas control.
  useEffect(() => {
    if (status !== 'fallback' || !props.active) return
    fallbackHeadingRef.current?.focus({ preventScroll: true })
  }, [roundId, status, props.active])

  useEffect(() => {
    if (props.forceRendererFailure || rendererBrokenRef.current) return
    let cancelled = false
    let controller: PhaserSceneController | null = null
    let rendererReady = false
    const initializationToken = rendererInitializationRef.current + 1
    rendererInitializationRef.current = initializationToken

    const isCurrentInitialization = () =>
      !cancelled &&
      rendererInitializationRef.current === initializationToken &&
      !rendererBrokenRef.current

    const prepareRenderer = () => {
      if (
        !controller ||
        controllerRef.current !== controller ||
        !isCurrentInitialization() ||
        statusRef.current === 'running' ||
        statusRef.current === 'resolving' ||
        statusRef.current === 'paused'
      ) {
        return
      }
      clearRendererWatchdog()
      controller.prepareGeneration(currentSceneRound())
      if (!isCurrentInitialization()) return
      transition('ready')
      setRendererMessage('Habitat ready. Start when you are ready to hunt.')
    }

    const startReadinessWatchdog = () => {
      clearRendererWatchdog()
      rendererWatchdogRef.current = window.setTimeout(() => {
        if (!isCurrentInitialization()) return
        failRenderer('The habitat renderer took too long to start.')
      }, 10_000)
    }

    async function mountRenderer() {
      const host = hostRef.current
      if (!host) return
      startReadinessWatchdog()
      try {
        controller = await loadPhaserSceneController(host, {
          onReady: () => {
            rendererReady = true
            // Phaser can call this while its constructor is still returning.
            // Do not expose an enabled Start button until the controller has
            // been attached to React's lifecycle ref below.
            if (controllerRef.current === controller) prepareRenderer()
          },
          onOrganismTapped: ({ roundId: eventRoundId, organismId, morphId, elapsedMs }) => {
            if (eventRoundId !== roundIdRef.current || completionLockedRef.current) return
            if (handledOrganismIdsRef.current.has(organismId)) return
            handledOrganismIdsRef.current.add(organismId)
            const current = metricsRef.current
            const currentProps = propsRef.current
            const manualTotal = total(current.manualCatches)
            const remainingOfMorph = currentProps.counts[morphId] - current.manualCatches[morphId]
            current.elapsedMs = elapsedMs

            if (manualTotal >= 12) return
            if (remainingOfMorph <= 3) {
              current.protectedEscapes += 1
              controllerRef.current?.showEscape(organismId)
              snapshotMetrics()
              announce('Protected for comparison — enough parents must remain.')
              return
            }

            const nextCatches: Record<MorphId, number> = {
              camouflaged: current.manualCatches.camouflaged,
              conspicuous: current.manualCatches.conspicuous,
            }
            nextCatches[morphId] += 1
            current.manualCatches = nextCatches
            if (firstAcceptedCatchElapsedMsRef.current === null) {
              firstAcceptedCatchElapsedMsRef.current = elapsedMs
            }
            acceptedCaptureTraceRef.current.push({ organismId, morphId, elapsedMs })
            controllerRef.current?.confirmCapture(organismId)
            snapshotMetrics()
            announce(`Caught. ${total(nextCatches)} of 12.`)

            if (total(nextCatches) === 12) beginResolving('manual')
          },
          onMiss: ({ roundId: eventRoundId, elapsedMs }) => {
            if (eventRoundId !== roundIdRef.current || completionLockedRef.current) return
            metricsRef.current.misses += 1
            metricsRef.current.elapsedMs = elapsedMs
            snapshotMetrics()
            announce('Miss — no penalty.')
          },
          onTick: ({ roundId: eventRoundId, remainingMs: nextRemaining }) => {
            if (eventRoundId !== roundIdRef.current || completionLockedRef.current) return
            metricsRef.current.elapsedMs = propsRef.current.durationMs - nextRemaining
            updateVisibleTime(nextRemaining)
          },
          onRoundEnd: ({ roundId: eventRoundId }) => {
            if (eventRoundId !== roundIdRef.current || completionLockedRef.current) return
            metricsRef.current.elapsedMs = propsRef.current.durationMs
            updateVisibleTime(0)
            beginResolving('timer')
          },
          onError: (message) => {
            if (!isCurrentInitialization()) return
            failRenderer(message)
          },
        })
        if (!controller || !isCurrentInitialization() || !hostRef.current) {
          controller?.dispose()
          return
        }
        const initializedController = controller
        controllerRef.current = initializedController

        const visibilityHandler = () => {
          const canPause = statusRef.current === 'running' || statusRef.current === 'paused'
          if (!propsRef.current.active || !canPause) return
          if (document.hidden) {
            setControllerPause(initializedController, 'visibility', true)
            if (statusRef.current === 'running') transition('paused')
            setRendererMessage('Study paused. Resume when you are ready.')
            announce('Study paused. The timer is stopped.')
          }
        }
        document.addEventListener('visibilitychange', visibilityHandler)
        visibilityHandlerRef.current = visibilityHandler

        const blurHandler = () => {
          const canPause = statusRef.current === 'running' || statusRef.current === 'paused'
          if (!propsRef.current.active || !canPause) return
          setControllerPause(initializedController, 'blur', true)
          if (statusRef.current === 'running') transition('paused')
          setRendererMessage('Study paused. Resume when you are ready.')
          announce('Study paused. The timer is stopped.')
        }
        window.addEventListener('blur', blurHandler)
        blurHandlerRef.current = blurHandler
        if (rendererReady) prepareRenderer()
      } catch (error) {
        if (!isCurrentInitialization()) return
        failRenderer(error instanceof Error ? error.message : 'The habitat renderer could not load.')
      }
    }

    void mountRenderer()
    return () => {
      cancelled = true
      if (rendererInitializationRef.current === initializationToken) {
        rendererInitializationRef.current += 1
        clearRendererWatchdog()
      }
      if (resolvingTimeoutRef.current !== null) {
        window.clearTimeout(resolvingTimeoutRef.current)
        resolvingTimeoutRef.current = null
      }
      disposeRenderer()
    }
  }, [props.forceRendererFailure])

  function startRound(): void {
    const controller = controllerRef.current
    if (!controller || statusRef.current !== 'ready') return
    handledOrganismIdsRef.current.clear()
    metricsRef.current = emptyMetrics()
    firstAcceptedCatchElapsedMsRef.current = null
    acceptedCaptureTraceRef.current = []
    setDisplayMetrics(metricsRef.current)
    remainingMsRef.current = props.durationMs
    lastVisibleSecondRef.current = Math.ceil(props.durationMs / 1000)
    lastAnnouncedSecondRef.current = null
    setRemainingMs(props.durationMs)
    announce('Generation started. Tap whichever organisms you notice first.')
    transition('running')
    controller.startGeneration(currentSceneRound())
  }

  function resumeRound(): void {
    const controller = controllerRef.current
    if (!controller || statusRef.current !== 'paused') return
    setControllerPause(controller, 'visibility', false)
    setControllerPause(controller, 'blur', false)
    transition('running')
    setRendererMessage('Generation resumed.')
    announce('Generation resumed. The timer is running.')
  }

  if (status === 'fallback') {
    const labels = HABITAT_STUDENT_COPY[props.habitatId].morphLabels
    return (
      <section
        aria-labelledby={`renderer-fallback-${props.habitatId}`}
        className="observation-fallback"
        data-testid="dom-observation-fallback"
      >
        <p className="eyebrow">Accessible observation mode</p>
        <h3
          data-stage-heading=""
          id={`renderer-fallback-${props.habitatId}`}
          ref={fallbackHeadingRef}
          tabIndex={-1}
        >
          {props.habitatTitle} · Generation {props.generation}
        </h3>
        <div className="fallback-population" aria-label="Starting population">
          <span><i className="morph-swatch morph-swatch--camo" />{props.counts.camouflaged} {labels.camouflaged}</span>
          <span><i className="morph-swatch morph-swatch--solid" />{props.counts.conspicuous} {labels.conspicuous}</span>
        </div>
        <p>{rendererMessage}</p>
        <p>The model will complete all 12 predation events using the same visibility settings. You can continue through every science step.</p>
        <button className="primary-button" data-testid="start-generation" onClick={() => finishImmediately('observation', true)} type="button">
          Resolve this generation
        </button>
      </section>
    )
  }

  const caught = total(displayMetrics.manualCatches)
  const progress = Math.max(0, Math.min(props.durationMs, remainingMs))
  const showFirstRoundCoaching = props.habitatId === 'reef_fish' && props.generation === 1

  return (
    <section className="habitat-game" aria-labelledby="habitat-title">
      <div className="habitat-game__heading">
        <div>
          <p className="eyebrow">Predator field round</p>
          <h2 data-stage-heading="" data-testid="habitat-title" id="habitat-title" tabIndex={-1}>
            {props.habitatTitle}
          </h2>
        </div>
        <div className="round-timer" aria-label={`${Math.ceil(remainingMs / 1000)} seconds remaining`}>
          <strong>{Math.ceil(remainingMs / 1000)}s</strong>
          <span>Generation {props.generation}</span>
        </div>
      </div>
      <progress
        aria-label="Time remaining"
        className="round-time-progress"
        max={props.durationMs}
        value={progress}
      />
      <div className="habitat-canvas-wrap">
        <div
          aria-hidden={status !== 'running'}
          className={`habitat-canvas-host${status === 'running' ? ' habitat-canvas-host--active' : ''}`}
          ref={hostRef}
        />
        {status !== 'running' && (
          <div className={`habitat-start-overlay habitat-start-overlay--${status}`}>
            {status === 'ready' && showFirstRoundCoaching && (
              <div className="round-coaching" data-testid="round-coaching">
                <p className="eyebrow">How this field round works</p>
                <ol>
                  <li>Tap whichever organisms you notice first.</li>
                  <li>Caught organisms fade from the habitat.</li>
                  <li>Misses have no penalty. If time ends, the model completes the remaining predation events.</li>
                </ol>
              </div>
            )}
            <p>{rendererMessage}</p>
            {(status === 'loading' || status === 'ready') && (
              <button
                className="primary-button"
                data-testid="start-generation"
                disabled={status === 'loading'}
                onClick={startRound}
                type="button"
              >
                {status === 'loading' ? 'Loading habitat…' : `Start Generation ${props.generation}`}
              </button>
            )}
            {status === 'paused' && (
              <button
                className="primary-button"
                data-testid="resume-generation"
                onClick={resumeRound}
                type="button"
              >
                Resume
              </button>
            )}
            {status === 'resolving' && <div className="resolving-indicator" aria-hidden="true" />}
          </div>
        )}
      </div>
      <div className="round-hud" aria-label="Round progress">
        <span><strong>Caught {caught} of 12</strong></span>
        <span><strong>Misses {displayMetrics.misses}</strong> — no penalty</span>
        <span><strong>Model-protected {displayMetrics.protectedEscapes}</strong></span>
      </div>
      <p className="field-caption">Tap whichever organisms you notice first. Do not hunt for a particular pattern.</p>
    </section>
  )
}
