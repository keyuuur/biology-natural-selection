import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { GenerationResult, TraitCounts } from '../simulation/index.ts'
import { ThreeSceneController } from '../three/ThreeSceneController.ts'
import { PopulationFallback } from './PopulationFallback.tsx'

type FieldSceneProps = {
  counts: TraitCounts
  generation: number
}

export type FieldSceneHandle = {
  playGeneration: (result: GenerationResult) => Promise<void>
}

export const FieldScene = forwardRef<FieldSceneHandle, FieldSceneProps>(
  function FieldScene({ counts, generation }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const controllerRef = useRef<ThreeSceneController | null>(null)
    const latestPopulation = useRef({ counts, generation })
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [phaseMessage, setPhaseMessage] = useState<string | null>(null)

    latestPopulation.current = { counts, generation }

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      try {
        const controller = new ThreeSceneController(container, {
          onReady: () => {
            setIsReady(true)
            const current = latestPopulation.current
            controller.updatePopulation(current.counts, current.generation)
          },
          onError: (message) => setError(message),
          onPhaseChange: (message) => setPhaseMessage(message),
        })
        controllerRef.current = controller
      } catch (sceneError) {
        setError(sceneError instanceof Error ? sceneError.message : String(sceneError))
      }

      return () => {
        controllerRef.current?.dispose()
        controllerRef.current = null
      }
    }, [])

    useEffect(() => {
      if (isReady) controllerRef.current?.updatePopulation(counts, generation)
    }, [counts, generation, isReady])

    useEffect(() => {
      if (!error) return
      controllerRef.current?.dispose()
      controllerRef.current = null
    }, [error])

    useImperativeHandle(
      ref,
      () => ({
        async playGeneration(result) {
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          if (!controllerRef.current || error) return
          await controllerRef.current.playGeneration(result, reduceMotion)
        },
      }),
      [error],
    )

    if (error) {
      return (
        <div className="field-scene field-scene--fallback">
          <PopulationFallback counts={counts} generation={generation} />
          <p className="scene-error" role="status">
            3D note: {error}
          </p>
        </div>
      )
    }

    return (
      <div className="field-scene">
        <div className="field-canvas-host" ref={containerRef} />
        {!isReady && <div className="scene-loading">Preparing the deer habitat…</div>}
        {phaseMessage && <div className="scene-phase">{phaseMessage}</div>}
        <div className="scene-key" aria-hidden="true">
          <span><i className="key-ring key-ring--higher" />» Higher-speed</span>
          <span><i className="key-ring key-ring--lower" />• Lower-speed</span>
        </div>
      </div>
    )
  },
)
