import Phaser from 'phaser'
import {
  HabitatScene,
  type HabitatSceneEvents,
  type PauseReason,
  type SceneDiagnostics,
  type SceneRound,
} from './HabitatScene.ts'
import type { Viewport } from './layout.ts'

export type PhaserControllerEvents = HabitatSceneEvents & {
  onError: (message: string) => void
  onReady: () => void
}

export type PhaserDiagnostics = SceneDiagnostics & {
  controllerCount: number
  createdControllerCount: number
  canvasCount: number
  animationLoopCount: number
  assetLoadCount: number
  resizeObserverCount: number
  controllerListenerCount: number
}

const lifecycleDiagnostics = {
  activeControllers: 0,
  activeAnimationLoops: 0,
  activeResizeObservers: 0,
  activeControllerListeners: 0,
  createdControllers: 0,
}

export class PhaserSceneController {
  private readonly game: Phaser.Game
  private readonly scene: HabitatScene
  private readonly host: HTMLElement
  private readonly resizeObserver: ResizeObserver
  private readonly pauseReasons = new Set<PauseReason>()
  private viewport: Viewport
  private disposed = false
  private countedInLifecycleDiagnostics = false
  private ready = false
  private pendingRound: SceneRound | null = null
  private pendingPreview: SceneRound | null = null
  private resizeFrame: number | null = null
  private readonly onError: (message: string) => void
  private readonly handleBlur = () => this.setPauseReason('blur', true)
  private readonly handleFocus = () => this.setPauseReason('blur', false)

  constructor(host: HTMLElement, events: PhaserControllerEvents) {
    this.host = host
    this.onError = events.onError
    this.viewport = {
      width: Math.max(320, host.clientWidth),
      height: Math.max(360, host.clientHeight),
    }
    this.scene = new HabitatScene(events, () => {
      this.ready = true
      if (this.pendingPreview) {
        this.scene.prepareRound(this.pendingPreview)
        this.pendingPreview = null
      }
      if (this.pendingRound) {
        const pending = this.pendingRound
        this.pendingRound = null
        this.startGeneration(pending)
      }
      this.syncSceneSleepState()
      events.onReady()
    })
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: this.viewport.width,
      height: this.viewport.height,
      backgroundColor: '#1a6f83',
      transparent: false,
      scene: [this.scene],
      input: { touch: { capture: true } },
      render: { antialias: true, roundPixels: true },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      audio: { noAudio: true },
      banner: false,
      callbacks: {
        postBoot: () => {
          const canvas = host.querySelector('canvas')
          canvas?.setAttribute(
            'aria-label',
            'Interactive predator habitat. Tap organisms in the habitat; round status is announced separately.',
          )
          canvas?.setAttribute('role', 'img')
          if (canvas instanceof HTMLCanvasElement) {
            canvas.style.touchAction = 'none'
            canvas.style.overscrollBehavior = 'contain'
            canvas.style.userSelect = 'none'
            canvas.style.webkitUserSelect = 'none'
          }
        },
      },
    })
    this.game.events.on(Phaser.Core.Events.BLUR, this.handleBlur)
    this.game.events.on(Phaser.Core.Events.FOCUS, this.handleFocus)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    lifecycleDiagnostics.createdControllers += 1
    lifecycleDiagnostics.activeControllers += 1
    lifecycleDiagnostics.activeAnimationLoops += 1
    lifecycleDiagnostics.activeResizeObservers += 1
    lifecycleDiagnostics.activeControllerListeners += 2
    this.countedInLifecycleDiagnostics = true
  }

  startGeneration(round: SceneRound): void {
    this.assertActive()
    if (!this.ready) {
      this.pendingRound = round
      return
    }
    try {
      this.scene.startRound(round)
    } catch (error) {
      this.onError(error instanceof Error ? error.message : 'The habitat renderer could not start.')
    }
  }

  prepareGeneration(round: SceneRound): void {
    this.assertActive()
    if (!this.ready) {
      this.pendingPreview = round
      return
    }
    try {
      this.scene.prepareRound(round)
    } catch (error) {
      this.onError(error instanceof Error ? error.message : 'The habitat preview could not load.')
    }
  }

  confirmCapture(organismId: string): void {
    if (!this.disposed) this.scene.confirmCapture(organismId)
  }

  showEscape(organismId: string): void {
    if (!this.disposed) this.scene.showEscape(organismId)
  }

  finishRound(): void {
    if (!this.disposed) this.scene.finishRound()
  }

  setPauseReason(reason: PauseReason, active: boolean): void {
    if (this.disposed) return
    if (active) this.pauseReasons.add(reason)
    else this.pauseReasons.delete(reason)
    this.scene.setPauseReason(reason, active)
    this.syncSceneSleepState()
  }

  pause(): void {
    this.setPauseReason('host', true)
  }

  resume(): void {
    this.setPauseReason('host', false)
  }

  resize(): void {
    if (this.disposed || this.resizeFrame !== null) return
    const width = this.host.clientWidth
    const height = this.host.clientHeight
    if (width <= 0 || height <= 0) return
    const nextWidth = Math.max(320, width)
    const nextHeight = Math.max(360, height)
    const oldViewport = this.viewport
    if (oldViewport.width === nextWidth && oldViewport.height === nextHeight) return

    this.setPauseReason('resize', true)
    this.viewport = { width: nextWidth, height: nextHeight }
    this.game.scale.resize(nextWidth, nextHeight)
    if (this.ready) {
      this.scene.resizeActors(oldViewport, { width: nextWidth, height: nextHeight })
    }
    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = null
      this.setPauseReason('resize', false)
    })
  }

  getDiagnostics(): PhaserDiagnostics {
    this.assertActive()
    const sceneDiagnostics = this.scene.getDiagnostics()
    return {
      ...sceneDiagnostics,
      controllerCount: lifecycleDiagnostics.activeControllers,
      createdControllerCount: lifecycleDiagnostics.createdControllers,
      canvasCount: this.host.querySelectorAll('canvas').length,
      animationLoopCount: lifecycleDiagnostics.activeAnimationLoops,
      assetLoadCount: 0,
      resizeObserverCount: lifecycleDiagnostics.activeResizeObservers,
      controllerListenerCount: lifecycleDiagnostics.activeControllerListeners,
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.pendingRound = null
    this.pendingPreview = null
    this.resizeObserver.disconnect()
    if (this.resizeFrame !== null) {
      window.cancelAnimationFrame(this.resizeFrame)
      this.resizeFrame = null
    }
    this.game.events.off(Phaser.Core.Events.BLUR, this.handleBlur)
    this.game.events.off(Phaser.Core.Events.FOCUS, this.handleFocus)
    this.pauseReasons.clear()
    this.game.destroy(true)
    if (this.countedInLifecycleDiagnostics) {
      lifecycleDiagnostics.activeControllers -= 1
      lifecycleDiagnostics.activeAnimationLoops -= 1
      lifecycleDiagnostics.activeResizeObservers -= 1
      lifecycleDiagnostics.activeControllerListeners -= 2
      this.countedInLifecycleDiagnostics = false
    }
  }

  private syncSceneSleepState(): void {
    if (!this.ready || this.disposed) return
    if (this.pauseReasons.size > 0) {
      if (this.game.scene.isActive('habitat')) this.game.scene.sleep('habitat')
      return
    }
    if (this.game.scene.isSleeping('habitat')) this.game.scene.wake('habitat')
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('The habitat renderer has already been disposed.')
  }
}
