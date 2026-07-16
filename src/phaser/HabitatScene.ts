import Phaser from 'phaser'
import type { HabitatId, MorphId } from '../simulation/index.ts'
import {
  createActorLayout,
  remapActorLayout,
  type ActorLayout,
  type ActorMovementState,
  type Bounds,
  type Viewport,
} from './layout.ts'

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

export type PauseReason = 'host' | 'visibility' | 'blur' | 'resize'
export type RoundInteractionState =
  | 'loading'
  | 'ready'
  | 'running'
  | 'paused'
  | 'resolving'
  | 'fallback'

export type ActorDiagnostic = {
  id: string
  morphId: MorphId
  center: { x: number; y: number; coordinateSpace: 'canvas' }
  hitBounds: Bounds
  visualBounds: Bounds
  movementState: ActorMovementState
  landed: boolean
  velocity: { x: number; y: number }
  eligible: boolean
  locked: boolean
}

export type SceneDiagnostics = {
  roundState: RoundInteractionState
  roundId: string | null
  remainingMs: number
  reducedMotion: boolean
  actors: ActorDiagnostic[]
  pauseReasons: PauseReason[]
  actorCount: number
  tweenCount: number
  timerCount: number
  listenerCount: number
  latestFeedbackLatencyMs: number | null
  frameMetrics: {
    averageFps: number
    medianFrameTimeMs: number
    p95FrameTimeMs: number
    framesOver50Ms: number
    sampledFrames: number
  }
  duplicateRoundEndCount: number
}

type Actor = {
  container: Phaser.GameObjects.Container
  layout: ActorLayout
  direction: -1 | 1
  baseX: number
  baseY: number
  locked: boolean
  movementState: ActorMovementState
  velocity: { x: number; y: number }
}

const MAX_FRAME_SAMPLES = 3_600

export class HabitatScene extends Phaser.Scene {
  private readonly eventsBridge: HabitatSceneEvents
  private readonly onReady: () => void
  private readonly actors = new Map<string, Actor>()
  private readonly pauseReasons = new Set<PauseReason>()
  private readonly feedbackTimers = new Set<Phaser.Time.TimerEvent>()
  private readonly pendingTapStartedAt = new Map<string, number>()
  private readonly backgroundObjects: Phaser.GameObjects.GameObject[] = []
  private readonly frameSamples: number[] = []
  private round: SceneRound | null = null
  private remainingMs = 0
  private lastTickSecond = -1
  private running = false
  private roundEndEmitted = false
  private duplicateRoundEndCount = 0
  private movementElapsedMs = 0
  private roundState: RoundInteractionState = 'loading'
  private stateBeforePause: 'ready' | 'running' = 'ready'
  private latestFeedbackLatencyMs: number | null = null
  private inputHandlerInstalled = false

  constructor(eventsBridge: HabitatSceneEvents, onReady: () => void) {
    super({ key: 'habitat' })
    this.eventsBridge = eventsBridge
    this.onReady = onReady
  }

  create(): void {
    this.input.topOnly = true
    if (!this.inputHandlerInstalled) {
      this.input.on('pointerdown', this.handleBackgroundPointer, this)
      this.inputHandlerInstalled = true
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this)
    this.roundState = 'ready'
    this.onReady()
  }

  startRound(round: SceneRound): void {
    this.prepareRound(round)
    this.running = true
    this.roundState = this.pauseReasons.size > 0 ? 'paused' : 'running'
    this.stateBeforePause = 'running'
    this.eventsBridge.onTick({ roundId: round.roundId, remainingMs: round.durationMs })
  }

  prepareRound(round: SceneRound): void {
    this.clearRoundObjects()
    this.round = round
    this.remainingMs = round.durationMs
    this.lastTickSecond = -1
    this.running = false
    this.roundEndEmitted = false
    this.movementElapsedMs = 0
    this.latestFeedbackLatencyMs = null
    this.drawHabitat(round.habitatId)
    this.createActors(round)
    this.stateBeforePause = 'ready'
    this.roundState = this.pauseReasons.size > 0 ? 'paused' : 'ready'
  }

  finishRound(): void {
    this.running = false
    this.roundState = 'resolving'
  }

  confirmCapture(organismId: string): void {
    const actor = this.actors.get(organismId)
    if (!actor) return
    this.actors.delete(organismId)
    actor.locked = true
    actor.container.disableInteractive()

    const outline = this.add
      .rectangle(
        actor.container.x,
        actor.container.y,
        actor.layout.hitBounds.width,
        actor.layout.hitBounds.height,
      )
      .setStrokeStyle(3, 0xffffff, 1)
      .setDepth(29)
    const label = this.feedbackLabel(actor.container.x, actor.container.y - 31, 'Caught')
    this.recordFeedbackLatency(organismId)

    if (this.round?.reducedMotion) {
      actor.container.destroy(true)
      this.destroyAfter([outline, label], 160)
      return
    }
    this.tweens.add({
      targets: actor.container,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeIn',
      onComplete: () => actor.container.destroy(true),
    })
    this.destroyAfter([outline, label], 160)
  }

  showEscape(organismId: string): void {
    const actor = this.actors.get(organismId)
    if (!actor) return
    actor.locked = true
    actor.movementState = actor.layout.habitatId === 'bark_moths'
      ? { kind: 'moth_landed' }
      : { kind: 'fish_patrol', direction: actor.direction }
    const label = this.feedbackLabel(
      actor.container.x,
      actor.container.y - 31,
      'Protected for comparison — enough parents must remain',
    )
    this.recordFeedbackLatency(organismId)
    this.destroyAfter([label], 2_000)
  }

  setPauseReason(reason: PauseReason, active: boolean): void {
    if (active) {
      if (this.pauseReasons.size === 0 && (this.roundState === 'ready' || this.roundState === 'running')) {
        this.stateBeforePause = this.roundState
      }
      this.pauseReasons.add(reason)
      if (this.roundState !== 'loading' && this.roundState !== 'resolving') this.roundState = 'paused'
      return
    }

    this.pauseReasons.delete(reason)
    if (this.pauseReasons.size === 0 && this.roundState === 'paused') {
      this.roundState = this.stateBeforePause
    }
  }

  setHostPaused(paused: boolean): void {
    this.setPauseReason('host', paused)
  }

  resizeActors(oldViewport: Viewport, newViewport: Viewport): void {
    if (!this.round) return
    const currentLayouts = [...this.actors.values()].map((actor) => {
      const hitWidth = actor.layout.hitBounds.width
      const hitHeight = actor.layout.hitBounds.height
      return {
        ...actor.layout,
        normalizedPosition: {
          x: actor.container.x / oldViewport.width,
          y: actor.container.y / oldViewport.height,
        },
        hitBounds: centeredBounds(actor.container.x, actor.container.y, hitWidth, hitHeight),
        visualBounds: centeredBounds(
          actor.container.x,
          actor.container.y,
          actor.layout.visualBounds.width,
          actor.layout.visualBounds.height,
        ),
      }
    })
    const remapped = remapActorLayout(currentLayouts, oldViewport, newViewport)
    for (const layout of remapped) {
      const actor = this.actors.get(layout.id)
      if (!actor) continue
      actor.layout = layout
      actor.baseX = layout.hitBounds.x + layout.hitBounds.width / 2
      actor.baseY = layout.hitBounds.y + layout.hitBounds.height / 2
      actor.container.setPosition(actor.baseX, actor.baseY)
    }
    this.drawHabitat(this.round.habitatId)
  }

  getDiagnostics(): SceneDiagnostics {
    const sortedSamples = [...this.frameSamples].sort((first, second) => first - second)
    const averageFrameTime = this.frameSamples.length > 0
      ? this.frameSamples.reduce((sum, value) => sum + value, 0) / this.frameSamples.length
      : 0
    let listenerCount = this.inputHandlerInstalled ? this.input.listenerCount('pointerdown') : 0
    for (const actor of this.actors.values()) listenerCount += actor.container.listenerCount('pointerdown')

    return {
      roundState: this.roundState,
      roundId: this.round?.roundId ?? null,
      remainingMs: this.remainingMs,
      reducedMotion: this.round?.reducedMotion ?? false,
      actors: [...this.actors.values()].map((actor) => this.actorDiagnostic(actor)),
      pauseReasons: [...this.pauseReasons].sort(),
      actorCount: this.actors.size,
      tweenCount: this.tweens?.getTweens().length ?? 0,
      timerCount: this.feedbackTimers.size,
      listenerCount,
      latestFeedbackLatencyMs: this.latestFeedbackLatencyMs,
      frameMetrics: {
        averageFps: averageFrameTime > 0 ? 1000 / averageFrameTime : 0,
        medianFrameTimeMs: percentile(sortedSamples, 0.5),
        p95FrameTimeMs: percentile(sortedSamples, 0.95),
        framesOver50Ms: this.frameSamples.filter((sample) => sample > 50).length,
        sampledFrames: this.frameSamples.length,
      },
      duplicateRoundEndCount: this.duplicateRoundEndCount,
    }
  }

  update(_time: number, delta: number): void {
    if (!this.round || !this.running || this.pauseReasons.size > 0) return
    this.captureFrameSample(delta)
    this.remainingMs = Math.max(0, this.remainingMs - delta)
    this.movementElapsedMs += delta
    const second = Math.ceil(this.remainingMs / 1000)
    if (second !== this.lastTickSecond) {
      this.lastTickSecond = second
      this.eventsBridge.onTick({ roundId: this.round.roundId, remainingMs: this.remainingMs })
    }

    for (const actor of this.actors.values()) this.updateActor(actor, delta)

    if (this.remainingMs <= 0) this.emitRoundEnd()
  }

  private readonly handleBackgroundPointer = (
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
  ): void => {
    if (!this.running || !this.round || this.pauseReasons.size > 0 || currentlyOver.length > 0) return
    const startedAt = performance.now()
    this.eventsBridge.onMiss({ roundId: this.round.roundId, elapsedMs: this.elapsedMs() })
    this.flashMiss(pointer.worldX, pointer.worldY)
    this.latestFeedbackLatencyMs = Math.max(0, performance.now() - startedAt)
  }

  private readonly handleShutdown = (): void => {
    if (this.inputHandlerInstalled) {
      this.input.off('pointerdown', this.handleBackgroundPointer, this)
      this.inputHandlerInstalled = false
    }
    this.clearRoundObjects()
    this.pauseReasons.clear()
    this.round = null
    this.roundState = 'loading'
  }

  private elapsedMs(): number {
    if (!this.round) return 0
    return Math.max(0, Math.min(this.round.durationMs, this.round.durationMs - this.remainingMs))
  }

  private drawHabitat(habitatId: HabitatId): void {
    for (const object of this.backgroundObjects) object.destroy()
    this.backgroundObjects.length = 0
    const width = this.scale.width
    const height = this.scale.height
    const background = this.add.graphics().setDepth(-10)
    this.backgroundObjects.push(background)

    if (habitatId === 'reef_fish') {
      background.fillStyle(0x1a6f83, 1).fillRect(0, 0, width, height)
      background.fillStyle(0x15586a, 0.55)
      for (let y = 34; y < height; y += 58) background.fillRoundedRect(0, y, width, 12, 6)
      background.fillStyle(0xd9b56d, 0.85).fillRect(0, height - 54, width, 54)
      background.fillStyle(0x4c8a66, 0.75)
      for (let x = 25; x < width; x += 82) {
        background.fillRoundedRect(x, height - 96, 14, 50, 7)
        background.fillCircle(x + 7, height - 100, 15)
      }
      return
    }

    background.fillStyle(0x72513a, 1).fillRect(0, 0, width, height)
    background.lineStyle(5, 0x4e3427, 0.6)
    for (let x = -20; x < width + 40; x += 54) {
      background.beginPath().moveTo(x, 0).lineTo(x + 28, height).strokePath()
    }
    background.lineStyle(2, 0xa7835f, 0.6)
    for (let y = 24; y < height; y += 44) {
      background.beginPath().moveTo(0, y).lineTo(width, y + 18).strokePath()
    }
  }

  private createActors(round: SceneRound): void {
    const layouts = createActorLayout(round, { width: this.scale.width, height: this.scale.height })
    for (const layout of layouts) {
      const centerX = layout.hitBounds.x + layout.hitBounds.width / 2
      const centerY = layout.hitBounds.y + layout.hitBounds.height / 2
      const container = this.createOrganism(round.habitatId, layout.morphId)
      container.setPosition(centerX, centerY).setDepth(5 + Math.floor(layout.slot / 8))
      container.setSize(layout.hitBounds.width, layout.hitBounds.height)
      container.setInteractive(
        new Phaser.Geom.Rectangle(
          0,
          0,
          layout.hitBounds.width,
          layout.hitBounds.height,
        ),
        Phaser.Geom.Rectangle.Contains,
      )
      const actor: Actor = {
        container,
        layout,
        direction: layout.direction,
        baseX: centerX,
        baseY: centerY,
        locked: false,
        movementState: layout.habitatId === 'reef_fish'
          ? { kind: 'fish_patrol', direction: layout.direction }
          : { kind: 'moth_landed' },
        velocity: { x: 0, y: 0 },
      }
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation()
        if (!this.running || !this.round || this.pauseReasons.size > 0 || actor.locked) return
        actor.locked = true
        this.pendingTapStartedAt.set(layout.id, performance.now())
        this.eventsBridge.onOrganismTapped({
          roundId: this.round.roundId,
          organismId: layout.id,
          morphId: layout.morphId,
          elapsedMs: this.elapsedMs(),
        })
      })
      this.actors.set(layout.id, actor)
    }
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

  private updateActor(actor: Actor, delta: number): void {
    if (!this.round || actor.locked) {
      actor.velocity = { x: 0, y: 0 }
      return
    }
    const profile = actor.layout.movementProfile
    if (profile.kind === 'fish_patrol') {
      const beforeX = actor.container.x
      const beforeY = actor.container.y
      const left = actor.layout.patrolBounds.x
      const right = left + actor.layout.patrolBounds.width
      actor.container.x += actor.direction * profile.speedPxPerSecond * (delta / 1000)
      if (actor.container.x <= left || actor.container.x >= right) {
        actor.container.x = Math.min(right, Math.max(left, actor.container.x))
        actor.direction = actor.direction === 1 ? -1 : 1
      }
      actor.container.scaleX = actor.direction
      const patrolTop = actor.layout.patrolBounds.y
      const patrolBottom = patrolTop + actor.layout.patrolBounds.height
      actor.container.y = clamp(
        actor.baseY + Math.sin(this.movementElapsedMs / 750 + profile.phase) * profile.verticalAmplitude,
        patrolTop,
        patrolBottom,
      )
      actor.movementState = { kind: 'fish_patrol', direction: actor.direction }
      actor.velocity = {
        x: (actor.container.x - beforeX) / Math.max(delta / 1000, 0.001),
        y: (actor.container.y - beforeY) / Math.max(delta / 1000, 0.001),
      }
      return
    }

    if (this.round.reducedMotion) {
      actor.container.setPosition(actor.baseX, actor.baseY)
      actor.movementState = { kind: 'moth_landed' }
      actor.velocity = { x: 0, y: 0 }
      return
    }
    const cohortWindow = profile.driftDurationMs
    const activeCohort = Math.floor(this.movementElapsedMs / cohortWindow) % 5
    const progress = (this.movementElapsedMs % cohortWindow) / cohortWindow
    if (activeCohort !== profile.driftCohort) {
      actor.container.setPosition(actor.baseX, actor.baseY)
      actor.movementState = { kind: 'moth_landed' }
      actor.velocity = { x: 0, y: 0 }
      return
    }
    const beforeX = actor.container.x
    const beforeY = actor.container.y
    const drift = Math.sin(progress * Math.PI)
    const patrolLeft = actor.layout.patrolBounds.x
    const patrolRight = patrolLeft + actor.layout.patrolBounds.width
    const patrolTop = actor.layout.patrolBounds.y
    const patrolBottom = patrolTop + actor.layout.patrolBounds.height
    actor.container.x = clamp(actor.baseX + profile.driftX * drift, patrolLeft, patrolRight)
    actor.container.y = clamp(actor.baseY + profile.driftY * drift, patrolTop, patrolBottom)
    actor.movementState = { kind: 'moth_drifting', progress }
    actor.velocity = {
      x: (actor.container.x - beforeX) / Math.max(delta / 1000, 0.001),
      y: (actor.container.y - beforeY) / Math.max(delta / 1000, 0.001),
    }
  }

  private flashMiss(x: number, y: number): void {
    const ring = this.add.circle(x, y, 13).setStrokeStyle(3, 0xffffff, 1).setDepth(30)
    const label = this.feedbackLabel(x, y - 30, 'Miss — no penalty')
    this.destroyAfter([ring, label], 300)
  }

  private feedbackLabel(x: number, y: number, message: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, message, {
        color: '#ffffff',
        backgroundColor: '#173f3a',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 7, y: 4 },
        align: 'center',
        wordWrap: { width: Math.max(180, this.scale.width - 24) },
      })
      .setOrigin(0.5)
      .setDepth(30)
  }

  private destroyAfter(objects: Phaser.GameObjects.GameObject[], delayMs: number): void {
    let timer: Phaser.Time.TimerEvent
    timer = this.time.delayedCall(delayMs, () => {
      for (const object of objects) object.destroy()
      this.feedbackTimers.delete(timer)
    })
    this.feedbackTimers.add(timer)
  }

  private recordFeedbackLatency(organismId: string): void {
    const startedAt = this.pendingTapStartedAt.get(organismId)
    if (startedAt !== undefined) {
      this.latestFeedbackLatencyMs = Math.max(0, performance.now() - startedAt)
      this.pendingTapStartedAt.delete(organismId)
    }
  }

  private emitRoundEnd(): void {
    if (!this.round) return
    if (this.roundEndEmitted) {
      this.duplicateRoundEndCount += 1
      return
    }
    this.roundEndEmitted = true
    this.running = false
    this.roundState = 'resolving'
    this.eventsBridge.onRoundEnd({ roundId: this.round.roundId })
  }

  private actorDiagnostic(actor: Actor): ActorDiagnostic {
    const x = actor.container.x
    const y = actor.container.y
    return {
      id: actor.layout.id,
      morphId: actor.layout.morphId,
      center: { x, y, coordinateSpace: 'canvas' },
      hitBounds: centeredBounds(x, y, actor.layout.hitBounds.width, actor.layout.hitBounds.height),
      visualBounds: centeredBounds(x, y, actor.layout.visualBounds.width, actor.layout.visualBounds.height),
      movementState: actor.movementState,
      landed: actor.movementState.kind === 'moth_landed',
      velocity: actor.velocity,
      eligible: !actor.locked && Boolean(actor.container.input?.enabled),
      locked: actor.locked,
    }
  }

  private captureFrameSample(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return
    this.frameSamples.push(delta)
    if (this.frameSamples.length > MAX_FRAME_SAMPLES) this.frameSamples.shift()
  }

  private clearRoundObjects(): void {
    this.tweens?.killAll()
    this.time?.removeAllEvents()
    this.feedbackTimers.clear()
    this.pendingTapStartedAt.clear()
    this.actors.clear()
    this.backgroundObjects.length = 0
    this.children?.removeAll(true)
  }
}

function centeredBounds(x: number, y: number, width: number, height: number): Bounds {
  return { x: x - width / 2, y: y - height / 2, width, height }
}

function percentile(sortedValues: readonly number[], fraction: number): number {
  if (sortedValues.length === 0) return 0
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * fraction) - 1))
  return sortedValues[index]
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}
