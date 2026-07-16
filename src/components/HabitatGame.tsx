import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  HabitatId,
  MorphCounts,
  MorphId,
  PlayerRoundMetrics,
  SelectedTimingMode,
} from '../simulation/index.ts'
import { deriveSeed } from '../simulation/index.ts'
import type { PhaserSceneController } from '../phaser/PhaserSceneController.ts'
import type { SceneOrganism } from '../phaser/HabitatScene.ts'
import type { SceneRound } from '../phaser/HabitatScene.ts'

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
  onComplete: (metrics: PlayerRoundMetrics) => void
}

type RoundStatus = 'loading' | 'ready' | 'running' | 'fallback'

type MutableMetrics = {
  manualCatches: MorphCounts
  misses: number
  protectedEscapes: number
  elapsedMs: number
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

export function HabitatGame(props: HabitatGameProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<PhaserSceneController | null>(null)
  const rendererBrokenRef = useRef(props.forceRendererFailure ?? false)
  const finishedRef = useRef(false)
  const metricsRef = useRef<MutableMetrics>(emptyMetrics())
  const propsRef = useRef(props)
  propsRef.current = props

  const roundId = `${props.habitatId}:g${props.generation}:s${props.roundSeed}`
  const organisms = useMemo(
    () => makeOrganisms(props.counts, roundId),
    [props.counts, roundId],
  )
  const organismsRef = useRef(organisms)
  organismsRef.current = organisms
  const roundIdRef = useRef(roundId)
  roundIdRef.current = roundId

  const [status, setStatus] = useState<RoundStatus>(
    props.forceRendererFailure ? 'fallback' : 'loading',
  )
  const [remainingMs, setRemainingMs] = useState(props.durationMs)
  const [displayMetrics, setDisplayMetrics] = useState<MutableMetrics>(metricsRef.current)
  const [rendererMessage, setRendererMessage] = useState(
    props.forceRendererFailure
      ? 'Observation mode is active because graphics are unavailable.'
      : 'Preparing habitat…',
  )

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    if (props.active) {
      controller.resume()
      const frame = window.requestAnimationFrame(() => {
        controller.resize()
        controller.prepareGeneration(currentSceneRound())
        setStatus('ready')
        setRendererMessage('Habitat ready. Start when you are ready to hunt.')
      })
      return () => window.cancelAnimationFrame(frame)
    }
    controller.pause()
  }, [props.active])

  function snapshotMetrics() {
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
      placementSeed: deriveSeed(current.roundSeed, 'placement'),
      movementSeed: deriveSeed(current.roundSeed, 'movement'),
    }
  }

  function finish(inputMode: 'interactive' | 'observation', fallbackUsed: boolean) {
    if (finishedRef.current) return
    finishedRef.current = true
    controllerRef.current?.finishRound()
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

  useEffect(() => {
    finishedRef.current = false
    metricsRef.current = emptyMetrics()
    setDisplayMetrics(metricsRef.current)
    setRemainingMs(props.durationMs)
    if (rendererBrokenRef.current) {
      setStatus('fallback')
      setRendererMessage('Observation mode is active because graphics are unavailable.')
    } else if (controllerRef.current && props.active) {
      controllerRef.current.prepareGeneration(currentSceneRound())
      setStatus('ready')
      setRendererMessage('Habitat ready. Start when you are ready to hunt.')
    } else if (!props.forceRendererFailure) {
      setStatus('loading')
      setRendererMessage('Preparing habitat…')
    }
  }, [roundId, props.active, props.durationMs, props.forceRendererFailure])

  useEffect(() => {
    if (props.forceRendererFailure) return
    let cancelled = false
    let visibilityHandler: (() => void) | null = null

    async function mountRenderer() {
      const host = hostRef.current
      if (!host) return
      try {
        const module = await import('../phaser/PhaserSceneController.ts')
        if (cancelled || !hostRef.current) return
        const controller = new module.PhaserSceneController(hostRef.current, {
          onReady: () => {
            controllerRef.current?.prepareGeneration(currentSceneRound())
            setStatus('ready')
            setRendererMessage('Habitat ready. Start when you are ready to hunt.')
          },
          onOrganismTapped: ({ roundId: eventRoundId, organismId, morphId, elapsedMs }) => {
            if (eventRoundId !== roundIdRef.current || finishedRef.current) return
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
              return
            }

            const nextCatches: Record<MorphId, number> = {
              camouflaged: current.manualCatches.camouflaged,
              conspicuous: current.manualCatches.conspicuous,
            }
            nextCatches[morphId] += 1
            current.manualCatches = nextCatches
            controllerRef.current?.confirmCapture(organismId)
            snapshotMetrics()

            if (total(nextCatches) === 12) finish('interactive', false)
          },
          onMiss: ({ roundId: eventRoundId, elapsedMs }) => {
            if (eventRoundId !== roundIdRef.current || finishedRef.current) return
            metricsRef.current.misses += 1
            metricsRef.current.elapsedMs = elapsedMs
            snapshotMetrics()
          },
          onTick: ({ roundId: eventRoundId, remainingMs: nextRemaining }) => {
            if (eventRoundId !== roundIdRef.current || finishedRef.current) return
            metricsRef.current.elapsedMs = propsRef.current.durationMs - nextRemaining
            setRemainingMs(nextRemaining)
          },
          onRoundEnd: ({ roundId: eventRoundId }) => {
            if (eventRoundId !== roundIdRef.current) return
            metricsRef.current.elapsedMs = propsRef.current.durationMs
            finish('interactive', false)
          },
          onError: (message) => {
            if (finishedRef.current) return
            rendererBrokenRef.current = true
            controllerRef.current?.finishRound()
            if (total(metricsRef.current.manualCatches) > 0) {
              finish('interactive', true)
            } else {
              setRendererMessage(`${message} Observation mode will finish this generation.`)
              setStatus('fallback')
            }
          },
        })
        controllerRef.current = controller
        visibilityHandler = () => {
          if (document.hidden) controller.pause()
          else controller.resume()
        }
        document.addEventListener('visibilitychange', visibilityHandler)
      } catch (error) {
        if (cancelled) return
        setRendererMessage(
          `${error instanceof Error ? error.message : 'The habitat renderer could not load.'} Observation mode is available.`,
        )
        setStatus('fallback')
      }
    }

    void mountRenderer()
    return () => {
      cancelled = true
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
      controllerRef.current?.dispose()
      controllerRef.current = null
    }
  }, [props.forceRendererFailure])

  function startRound() {
    const controller = controllerRef.current
    if (!controller || status !== 'ready') return
    metricsRef.current = emptyMetrics()
    setDisplayMetrics(metricsRef.current)
    setRemainingMs(props.durationMs)
    setStatus('running')
    controller.startGeneration(currentSceneRound())
  }

  if (status === 'fallback') {
    return (
      <section className="observation-fallback" data-testid="dom-observation-fallback">
        <p className="eyebrow">Accessible observation mode</p>
        <h3>{props.habitatTitle} · Generation {props.generation}</h3>
        <div className="fallback-population" aria-label="Starting population">
          <span><i className="morph-swatch morph-swatch--camo" />{props.counts.camouflaged} mottled</span>
          <span><i className="morph-swatch morph-swatch--solid" />{props.counts.conspicuous} solid</span>
        </div>
        <p>{rendererMessage}</p>
        <p>The model will complete all 12 predation events using the same visibility settings. You can continue through every science step.</p>
        <button className="primary-button" data-testid="start-generation" onClick={() => finish('observation', true)} type="button">
          Resolve this generation
        </button>
      </section>
    )
  }

  return (
    <section className="habitat-game" aria-labelledby="habitat-title">
      <div className="habitat-game__heading">
        <div>
          <p className="eyebrow">Predator field round</p>
          <h2 data-testid="habitat-title" id="habitat-title">{props.habitatTitle}</h2>
        </div>
        <div className="round-timer" aria-live="polite">
          <strong>{Math.ceil(remainingMs / 1000)}s</strong>
          <span>Generation {props.generation}</span>
        </div>
      </div>
      <div className="habitat-canvas-wrap">
        <div className="habitat-canvas-host" ref={hostRef} />
        {status !== 'running' && (
          <div className="habitat-start-overlay">
            <p>{rendererMessage}</p>
            <button
              className="primary-button"
              data-testid="start-generation"
              disabled={status === 'loading'}
              onClick={startRound}
              type="button"
            >
              {status === 'loading' ? 'Loading habitat…' : `Start Generation ${props.generation}`}
            </button>
          </div>
        )}
      </div>
      <div className="round-hud" aria-label="Round performance">
        <span><strong>{total(displayMetrics.manualCatches)}</strong> manual catches</span>
        <span><strong>{displayMetrics.misses}</strong> misses</span>
        <span><strong>{displayMetrics.protectedEscapes}</strong> escaped into cover</span>
        <span><strong>{Math.max(0, 12 - total(displayMetrics.manualCatches))}</strong> model events remaining</span>
      </div>
      <p className="field-caption">Tap whichever organisms you notice first. Do not hunt for a particular pattern.</p>
    </section>
  )
}
