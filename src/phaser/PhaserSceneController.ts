import Phaser from 'phaser'
import { HabitatScene, type HabitatSceneEvents, type SceneRound } from './HabitatScene.ts'

export type PhaserControllerEvents = HabitatSceneEvents & {
  onError: (message: string) => void
  onReady: () => void
}

export class PhaserSceneController {
  private readonly game: Phaser.Game
  private readonly scene: HabitatScene
  private disposed = false
  private ready = false
  private pendingRound: SceneRound | null = null
  private pendingPreview: SceneRound | null = null
  private readonly onError: (message: string) => void

  constructor(host: HTMLElement, events: PhaserControllerEvents) {
    this.onError = events.onError
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
      events.onReady()
    })
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: Math.max(320, host.clientWidth),
      height: Math.max(360, host.clientHeight),
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
          canvas?.setAttribute('aria-label', 'Interactive predator habitat')
          canvas?.setAttribute('role', 'application')
        },
      },
    })
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.pause())
    this.game.events.on(Phaser.Core.Events.FOCUS, () => this.resume())
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

  pause(): void {
    if (!this.disposed) this.scene.setHostPaused(true)
  }

  resume(): void {
    if (!this.disposed) this.scene.setHostPaused(false)
  }

  resize(): void {
    if (this.disposed) return
    const parent = this.game.canvas.parentElement
    if (!parent) return
    this.game.scale.resize(Math.max(320, parent.clientWidth), Math.max(360, parent.clientHeight))
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.pendingRound = null
    this.pendingPreview = null
    this.game.destroy(true)
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('The habitat renderer has already been disposed.')
  }
}
