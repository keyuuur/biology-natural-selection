import Phaser from 'phaser'
import type { HabitatId, MorphId } from '../simulation/index.ts'

export type SceneOrganism = {
  id: string
  morphId: MorphId
}

export type SceneRound = {
  roundId: string
  habitatId: HabitatId
  organisms: readonly SceneOrganism[]
  durationMs: number
  movementScale: number
  hitAreaScale: number
  reducedMotion: boolean
  placementSeed: number
  movementSeed: number
}

export type HabitatSceneEvents = {
  onOrganismTapped: (event: {
    roundId: string
    organismId: string
    morphId: MorphId
    elapsedMs: number
  }) => void
  onMiss: (event: { roundId: string; elapsedMs: number }) => void
  onTick: (event: { roundId: string; remainingMs: number }) => void
  onRoundEnd: (event: { roundId: string }) => void
}

type Actor = {
  container: Phaser.GameObjects.Container
  morphId: MorphId
  vx: number
  phase: number
  baseY: number
  habitatId: HabitatId
}

function seededUnit(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export class HabitatScene extends Phaser.Scene {
  private readonly eventsBridge: HabitatSceneEvents
  private readonly onReady: () => void
  private readonly actors = new Map<string, Actor>()
  private round: SceneRound | null = null
  private remainingMs = 0
  private lastTickBucket = -1
  private running = false
  private pausedByHost = false

  constructor(eventsBridge: HabitatSceneEvents, onReady: () => void) {
    super({ key: 'habitat' })
    this.eventsBridge = eventsBridge
    this.onReady = onReady
  }

  create(): void {
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        if (!this.running || !this.round || currentlyOver.length > 0) return
        this.eventsBridge.onMiss({
          roundId: this.round.roundId,
          elapsedMs: this.elapsedMs(),
        })
        this.flashMiss(pointer.worldX, pointer.worldY)
      },
    )
    this.onReady()
  }

  startRound(round: SceneRound): void {
    this.prepareRound(round)
    this.running = true
    this.eventsBridge.onTick({ roundId: round.roundId, remainingMs: round.durationMs })
  }

  prepareRound(round: SceneRound): void {
    this.clearActors()
    this.round = round
    this.remainingMs = round.durationMs
    this.lastTickBucket = -1
    this.running = false
    this.pausedByHost = false
    this.drawHabitat(round.habitatId)
    this.createActors(round)
  }

  finishRound(): void {
    this.running = false
  }

  confirmCapture(organismId: string): void {
    const actor = this.actors.get(organismId)
    if (!actor) return
    this.actors.delete(organismId)
    actor.container.disableInteractive()
    if (this.round?.reducedMotion) {
      actor.container.destroy(true)
      return
    }
    this.tweens.add({
      targets: actor.container,
      alpha: 0,
      scale: 0.35,
      duration: 160,
      ease: 'Quad.easeIn',
      onComplete: () => actor.container.destroy(true),
    })
  }

  showEscape(organismId: string): void {
    const actor = this.actors.get(organismId)
    if (!actor) return
    const label = this.add
      .text(actor.container.x, actor.container.y - 28, 'Escaped into cover', {
        color: '#ffffff',
        backgroundColor: '#173f3a',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(20)
    if (this.round?.reducedMotion) {
      this.time.delayedCall(500, () => label.destroy())
      return
    }
    this.tweens.add({
      targets: [actor.container, label],
      x: '+=18',
      alpha: { from: 1, to: 0.45 },
      yoyo: true,
      duration: 180,
      onComplete: () => label.destroy(),
    })
  }

  setHostPaused(paused: boolean): void {
    this.pausedByHost = paused
  }

  update(_time: number, delta: number): void {
    if (!this.round || !this.running || this.pausedByHost) return

    this.remainingMs = Math.max(0, this.remainingMs - delta)
    const bucket = Math.ceil(this.remainingMs / 250)
    if (bucket !== this.lastTickBucket) {
      this.lastTickBucket = bucket
      this.eventsBridge.onTick({
        roundId: this.round.roundId,
        remainingMs: this.remainingMs,
      })
    }

    const width = this.scale.width
    const height = this.scale.height
    for (const actor of this.actors.values()) {
      const { container } = actor
      container.x += actor.vx * delta
      if (container.x < -42) container.x = width + 42
      if (container.x > width + 42) container.x = -42
      if (!this.round.reducedMotion) {
        const amplitude = actor.habitatId === 'bark_moths' ? 3 : 7
        const divisor = actor.habitatId === 'bark_moths' ? 1_450 : 750
        container.y = Math.min(
          height - 34,
          Math.max(42, actor.baseY + Math.sin(this.time.now / divisor + actor.phase) * amplitude),
        )
      }
    }

    if (this.remainingMs <= 0) {
      const roundId = this.round.roundId
      this.running = false
      this.eventsBridge.onRoundEnd({ roundId })
    }
  }

  private elapsedMs(): number {
    if (!this.round) return 0
    return Math.max(0, Math.min(this.round.durationMs, this.round.durationMs - this.remainingMs))
  }

  private drawHabitat(habitatId: HabitatId): void {
    this.children.removeAll(true)
    const width = this.scale.width
    const height = this.scale.height
    const background = this.add.graphics().setDepth(-10)

    if (habitatId === 'reef_fish') {
      background.fillStyle(0x1a6f83, 1).fillRect(0, 0, width, height)
      background.fillStyle(0x15586a, 0.55)
      for (let y = 34; y < height; y += 58) {
        background.fillRoundedRect(0, y, width, 12, 6)
      }
      background.fillStyle(0xd9b56d, 0.85).fillRect(0, height - 54, width, 54)
      background.fillStyle(0x4c8a66, 0.75)
      for (let x = 25; x < width; x += 82) {
        background.fillRoundedRect(x, height - 96, 14, 50, 7)
        background.fillCircle(x + 7, height - 100, 15)
      }
    } else {
      background.fillStyle(0x72513a, 1).fillRect(0, 0, width, height)
      background.lineStyle(5, 0x4e3427, 0.6)
      for (let x = -20; x < width + 40; x += 54) {
        background.beginPath()
        background.moveTo(x, 0)
        background.lineTo(x + 28, height)
        background.strokePath()
      }
      background.lineStyle(2, 0xa7835f, 0.6)
      for (let y = 24; y < height; y += 44) {
        background.beginPath()
        background.moveTo(0, y)
        background.lineTo(width, y + 18)
        background.strokePath()
      }
    }
  }

  private createActors(round: SceneRound): void {
    const random = seededUnit(round.placementSeed)
    const movementRandom = seededUnit(round.movementSeed)
    const width = this.scale.width
    const height = this.scale.height
    const columns = 8
    const rows = 5
    const cellWidth = width / columns
    const usableHeight = Math.max(180, height - 88)
    const cellHeight = usableHeight / rows

    round.organisms.forEach((organism, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = cellWidth * (column + 0.5) + (random() - 0.5) * cellWidth * 0.48
      const y = 28 + cellHeight * (row + 0.5) + (random() - 0.5) * cellHeight * 0.35
      const container = this.createOrganism(round.habitatId, organism.morphId)
      container.setPosition(x, y).setDepth(5 + row)
      container
        .setSize(58 * round.hitAreaScale, 42 * round.hitAreaScale)
        .setInteractive({ useHandCursor: true })
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation()
        if (!this.running || !this.round) return
        this.eventsBridge.onOrganismTapped({
          roundId: this.round.roundId,
          organismId: organism.id,
          morphId: organism.morphId,
          elapsedMs: this.elapsedMs(),
        })
      })
      this.actors.set(organism.id, {
        container,
        morphId: organism.morphId,
        vx:
          (round.habitatId === 'bark_moths' ? 0.006 : 0.018) *
          (1 + movementRandom()) *
          round.movementScale *
          (movementRandom() > 0.5 ? 1 : -1),
        phase: movementRandom() * Math.PI * 2,
        baseY: y,
        habitatId: round.habitatId,
      })
    })
  }

  private createOrganism(habitatId: HabitatId, morphId: MorphId): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0)
    const shape = this.add.graphics()
    const camouflaged = morphId === 'camouflaged'

    if (habitatId === 'reef_fish') {
      const bodyColor = camouflaged ? 0x2f8591 : 0xf3ca52
      const patternColor = camouflaged ? 0x15586a : 0x703c79
      shape.fillStyle(bodyColor, 1).fillEllipse(0, 0, 48, 28)
      shape.fillTriangle(-22, 0, -38, -15, -38, 15)
      shape.fillStyle(patternColor, 0.95)
      if (camouflaged) {
        for (let x = -13; x <= 15; x += 9) shape.fillCircle(x, 0, 3)
      } else {
        for (let x = -14; x <= 14; x += 10) shape.fillRect(x, -13, 5, 26)
      }
      shape.fillStyle(0xffffff, 1).fillCircle(13, -5, 4)
      shape.fillStyle(0x17342f, 1).fillCircle(14, -5, 2)
    } else {
      const wingColor = camouflaged ? 0x846347 : 0xe4c8ec
      const patternColor = camouflaged ? 0x4e3427 : 0x70406d
      shape.fillStyle(wingColor, 1)
      shape.fillEllipse(-13, -2, 26, 34)
      shape.fillEllipse(13, -2, 26, 34)
      shape.fillStyle(patternColor, 0.95)
      if (camouflaged) {
        shape.fillCircle(-13, -4, 5).fillCircle(13, -4, 5)
        shape.fillCircle(-9, 8, 3).fillCircle(9, 8, 3)
      } else {
        shape.fillRect(-18, -4, 36, 7)
        shape.fillRect(-13, 7, 26, 5)
      }
      shape.fillStyle(0x29201b, 1).fillRoundedRect(-3, -16, 6, 32, 3)
    }
    container.add(shape)
    return container
  }

  private flashMiss(x: number, y: number): void {
    if (this.round?.reducedMotion) return
    const ring = this.add.circle(x, y, 10).setStrokeStyle(3, 0xffffff, 0.9).setDepth(30)
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.8,
      duration: 180,
      onComplete: () => ring.destroy(),
    })
  }

  private clearActors(): void {
    for (const actor of this.actors.values()) actor.container.destroy(true)
    this.actors.clear()
  }
}
