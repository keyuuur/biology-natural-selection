import Phaser from 'phaser'
import type { HabitatId, MorphId } from '../simulation/index.ts'
import {
  createActorLayout,
  remapActorLayout,
  seededUnit,
  type ActorLayout,
  type ActorMovementState,
  type Bounds,
  type Viewport,
} from './layout.ts'
import { advanceFishTraffic } from './fishTraffic.ts'

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
  patrolBounds: Bounds
  movementState: ActorMovementState
  landed: boolean
  velocity: { x: number; y: number }
  eligible: boolean
  locked: boolean
  slot: number
  profileId: string
  assignedSpeedPxPerSecond: number
  patrolSpanPx: number
  distanceTraveledPx: number
  boundaryTurns: number
  collisionTurns: number
  blockedMs: number
  maxContinuousBlockedMs: number
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
    maxFrameTimeMs: number
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
  distanceTraveledPx: number
  boundaryTurns: number
  collisionTurns: number
  blockedMs: number
  continuousBlockedMs: number
  maxContinuousBlockedMs: number
  collisionCooldownMs: number
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
        maxFrameTimeMs: this.frameSamples.length > 0 ? Math.max(...this.frameSamples) : 0,
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

    if (this.round.habitatId === 'reef_fish') {
      this.updateMotionFishActors(delta)
    } else {
      for (const actor of this.actors.values()) this.updateActor(actor, delta)
    }
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
      const artRandom = seededUnit(0x51f15e)
      background.fillStyle(0x10596a, 1).fillRect(0, 0, width, height)
      const waterBands = [0x0e5365, 0x125f70, 0x176878, 0x1b7180, 0x206f7b]
      for (let band = 0; band < waterBands.length; band += 1) {
        const top = (height * band) / waterBands.length
        background.fillStyle(waterBands[band], 0.38)
          .fillRect(0, top, width, height / waterBands.length + 2)
      }
      for (let patch = 0; patch < 24; patch += 1) {
        const x = artRandom() * width
        const y = artRandom() * height * 0.78
        const radiusX = 42 + artRandom() * 120
        const radiusY = 18 + artRandom() * 54
        background.fillStyle(patch % 2 === 0 ? 0x0d4c5f : 0x2c7c82, 0.1 + artRandom() * 0.08)
          .fillEllipse(x, y, radiusX, radiusY)
      }
      background.lineStyle(2, 0xb8e0dc, 0.1)
      for (let shaft = 0; shaft < 16; shaft += 1) {
        const x = artRandom() * width
        const y = artRandom() * height * 0.55
        const length = 32 + artRandom() * 88
        background.beginPath().moveTo(x, y).lineTo(x + length, y + 8 + artRandom() * 18).strokePath()
      }
      for (let mark = 0; mark < 104; mark += 1) {
        const x = artRandom() * width
        const y = 22 + artRandom() * Math.max(1, height - 118)
        const length = 6 + artRandom() * 17
        background.lineStyle(1 + artRandom(), mark % 3 === 0 ? 0xd4c184 : 0x70aeb0, 0.08 + artRandom() * 0.08)
        background.beginPath().moveTo(x, y).lineTo(x + length, y + (artRandom() - 0.5) * 5).strokePath()
      }
      const seabedTop = height - 64
      background.fillStyle(0x8f8664, 0.92).fillRect(0, seabedTop, width, height - seabedTop)
      background.fillStyle(0x566f62, 0.46)
      for (let rock = 0; rock < 18; rock += 1) {
        const x = artRandom() * width
        const y = seabedTop + 10 + artRandom() * 48
        background.fillEllipse(x, y, 18 + artRandom() * 48, 8 + artRandom() * 20)
      }
      for (let plant = 0; plant < 13; plant += 1) {
        const x = 12 + artRandom() * (width - 24)
        const plantHeight = 24 + artRandom() * 54
        const color = plant % 3 === 0 ? 0x64516f : plant % 2 === 0 ? 0x386f68 : 0x4e7e6c
        background.lineStyle(5 + artRandom() * 4, color, 0.34)
        background.beginPath().moveTo(x, height).lineTo(x + (artRandom() - 0.5) * 18, height - plantHeight).strokePath()
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
        distanceTraveledPx: 0,
        boundaryTurns: 0,
        collisionTurns: 0,
        blockedMs: 0,
        continuousBlockedMs: 0,
        maxContinuousBlockedMs: 0,
        collisionCooldownMs: 0,
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

  private createOrganism(
    habitatId: HabitatId,
    morphId: MorphId,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0)
    const shape = this.add.graphics()
    const camouflaged = morphId === 'camouflaged'

    if (habitatId === 'reef_fish') {
      const bodyColor = camouflaged
        ? 0x28717c
        : 0xd5ad4f
      const patternColor = camouflaged
        ? 0x15586a
        : 0x68456f
      shape.fillStyle(bodyColor, 1).fillEllipse(0, 0, 48, 28)
      shape.fillTriangle(-22, 0, -38, -15, -38, 15)
      shape.fillStyle(patternColor, 0.95)
      if (camouflaged) {
        const patches = [
          [-14, -5, 4], [-7, 5, 3], [1, -4, 4], [8, 5, 3], [15, -2, 4],
          [-12, 7, 2], [5, 8, 2],
        ] as const
        for (const [x, y, radius] of patches) shape.fillCircle(x, y, radius)
      } else {
        for (let x = -14; x <= 14; x += 10) shape.fillRect(x, -13, 5, 26)
      }
      shape.fillStyle(camouflaged ? 0x123e49 : 0x5f4b1e, 0.95).fillCircle(14, -5, 2.5)
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

  private updateMotionFishActors(delta: number): void {
    const activeActors = [...this.actors.values()].filter((actor) => !actor.locked)
    const states = activeActors.flatMap((actor) => {
      const profile = actor.layout.movementProfile
      if (profile.kind !== 'fish_patrol') return []
      const patrolTop = actor.layout.patrolBounds.y
      const patrolBottom = patrolTop + actor.layout.patrolBounds.height
      const nextY = clamp(
        actor.baseY + Math.sin(this.movementElapsedMs / 750 + profile.phase) * profile.verticalAmplitude,
        patrolTop,
        patrolBottom,
      )
      return [{
        id: actor.layout.id,
        row: Math.floor(actor.layout.slot / 8),
        x: actor.container.x,
        y: nextY,
        direction: actor.direction,
        speedPxPerSecond: profile.speedPxPerSecond,
        hitWidth: actor.layout.hitBounds.width,
        hitHeight: actor.layout.hitBounds.height,
        patrolLeft: actor.layout.patrolBounds.x,
        patrolRight: actor.layout.patrolBounds.x + actor.layout.patrolBounds.width,
        collisionCooldownMs: actor.collisionCooldownMs,
        collisionTurnCount: actor.collisionTurns,
        continuousBlockedMs: actor.continuousBlockedMs,
      }]
    })
    const results = advanceFishTraffic(states, delta)
    const resultById = new Map(results.map((result) => [result.id, result]))

    for (const actor of this.actors.values()) {
      const result = resultById.get(actor.layout.id)
      if (!result || actor.locked) {
        actor.velocity = { x: 0, y: 0 }
        continue
      }
      const beforeX = actor.container.x
      const beforeY = actor.container.y
      actor.container.setPosition(result.x, result.y)
      actor.direction = result.direction
      actor.collisionCooldownMs = result.collisionCooldownMs
      actor.container.scaleX = actor.direction
      actor.movementState = { kind: 'fish_patrol', direction: actor.direction }
      actor.velocity = {
        x: (actor.container.x - beforeX) / Math.max(delta / 1000, 0.001),
        y: (actor.container.y - beforeY) / Math.max(delta / 1000, 0.001),
      }
      actor.distanceTraveledPx += Math.hypot(actor.container.x - beforeX, actor.container.y - beforeY)
      if (result.boundaryTurn) actor.boundaryTurns += 1
      if (result.collisionTurn) actor.collisionTurns += 1
      if (result.collisionBlocked) {
        actor.blockedMs += delta
        actor.continuousBlockedMs += delta
        actor.maxContinuousBlockedMs = Math.max(
          actor.maxContinuousBlockedMs,
          actor.continuousBlockedMs,
        )
      } else {
        actor.continuousBlockedMs = 0
      }
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
      patrolBounds: actor.layout.patrolBounds,
      movementState: actor.movementState,
      landed: actor.movementState.kind === 'moth_landed',
      velocity: actor.velocity,
      eligible: !actor.locked && Boolean(actor.container.input?.enabled),
      locked: actor.locked,
      slot: actor.layout.slot,
      profileId: actor.layout.profileId,
      assignedSpeedPxPerSecond: actor.layout.movementProfile.kind === 'fish_patrol'
        ? actor.layout.movementProfile.speedPxPerSecond
        : 0,
      patrolSpanPx: actor.layout.patrolBounds.width,
      distanceTraveledPx: actor.distanceTraveledPx,
      boundaryTurns: actor.boundaryTurns,
      collisionTurns: actor.collisionTurns,
      blockedMs: actor.blockedMs,
      maxContinuousBlockedMs: actor.maxContinuousBlockedMs,
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
