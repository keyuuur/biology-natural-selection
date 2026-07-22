import type { HabitatId, MorphId } from '../simulation/index.ts'

export type Viewport = {
  width: number
  height: number
}

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export type LayoutOrganism = {
  id: string
  morphId: MorphId
}

export type LayoutRound = {
  habitatId: HabitatId
  organisms: readonly LayoutOrganism[]
  hitAreaScale: number
  reducedMotion: boolean
  placementSeed: number
  movementSeed: number
  movementScale: number
}

export type FishMovementProfile = {
  kind: 'fish_patrol'
  speedPxPerSecond: number
  verticalAmplitude: number
  phase: number
  curvePeriodMs: number
}

export type MothMovementProfile = {
  kind: 'moth_land_drift'
  landedDurationMs: number
  driftDurationMs: number
  driftCohort: number
  driftX: number
  driftY: number
}

export type ActorMovementState =
  | { kind: 'fish_patrol'; direction: -1 | 1 }
  | { kind: 'moth_landed' }
  | { kind: 'moth_drifting'; progress: number }

export type MovementProfile = FishMovementProfile | MothMovementProfile

export type ActorLayout = {
  id: string
  morphId: MorphId
  habitatId: HabitatId
  slot: number
  normalizedPosition: { x: number; y: number }
  visualBounds: Bounds
  hitBounds: Bounds
  patrolBounds: Bounds
  direction: -1 | 1
  profileId: string
  movementProfile: MovementProfile
}

export type HitRegion = {
  width: number
  height: number
}

const COLUMNS = 8
const ROWS = 5
const EDGE_X = 4
const EDGE_TOP = 28
const EDGE_BOTTOM = 60
const ACTOR_GAP = 4
export const MAX_FISH_CURVE_OFFSET_PX = 10

export function seededUnit(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function deterministicShuffle<T>(items: readonly T[], seed: number): T[] {
  const shuffled = [...items]
  const random = seededUnit(seed)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    const value = shuffled[index]
    shuffled[index] = shuffled[other]
    shuffled[other] = value
  }
  return shuffled
}

export function createHitRegion(habitatId: HabitatId, hitAreaScale = 1): HitRegion {
  if (!Number.isFinite(hitAreaScale) || hitAreaScale <= 0) {
    throw new Error('hitAreaScale must be positive.')
  }
  const base = habitatId === 'reef_fish'
    ? { width: 72, height: 48 }
    : { width: 64, height: 52 }
  return {
    width: base.width * hitAreaScale,
    height: base.height * hitAreaScale,
  }
}

export function createMovementProfile(
  slot: number,
  seed: number,
  habitatId: HabitatId,
  movementScale = 1,
  reducedMotion = false,
): MovementProfile {
  const globalRandom = seededUnit(seed)
  const mothDriftDurationMs = 700 + Math.floor(globalRandom() * 301)
  const random = seededUnit((seed ^ Math.imul(slot + 1, 0x9e3779b1)) >>> 0)

  if (habitatId === 'reef_fish') {
    const baseSpeed = 26 + random() * 20
    return {
      kind: 'fish_patrol',
      speedPxPerSecond: baseSpeed * movementScale * (reducedMotion ? 0.5 : 1),
      // The curve is deliberately modest: fish still travel mainly left/right,
      // but no longer read as perfectly straight lanes.
      verticalAmplitude: reducedMotion ? 0 : 3 + random() * 7,
      phase: random() * Math.PI * 2,
      curvePeriodMs: 1_300 + random() * 900,
    }
  }

  return {
    kind: 'moth_land_drift',
    driftDurationMs: mothDriftDurationMs,
    landedDurationMs: mothDriftDurationMs * 4,
    driftCohort: slot % 5,
    driftX: (random() > 0.5 ? 1 : -1) * (5 + random() * 8) * movementScale,
    driftY: (random() - 0.5) * 10 * movementScale,
  }
}

export function createActorLayout(round: LayoutRound, viewport: Viewport): ActorLayout[] {
  assertViewport(viewport)
  const isReef = round.habitatId === 'reef_fish'
  const hitRegion = createHitRegion(round.habitatId, round.hitAreaScale)
  const visualSize = round.habitatId === 'reef_fish'
    ? { width: 62, height: 30 }
    : { width: 52, height: 40 }
  const shuffled = deterministicShuffle(round.organisms, round.placementSeed)
  const random = seededUnit(round.placementSeed ^ 0xa511e9b3)
  const usableWidth = viewport.width - EDGE_X * 2
  const usableHeight = Math.max(1, viewport.height - EDGE_TOP - EDGE_BOTTOM)
  const cellWidth = usableWidth / COLUMNS
  const cellHeight = usableHeight / ROWS
  const motionAssignments = isReef
    ? createSlotMotionAssignments(shuffled, round)
    : new Map<string, SlotMotionAssignment>()

  return shuffled.map((organism, slot) => {
    const column = slot % COLUMNS
    const row = Math.floor(slot / COLUMNS)
    const cellX = EDGE_X + column * cellWidth
    const cellY = EDGE_TOP + row * cellHeight
    const jitterX = Math.max(0, (cellWidth - hitRegion.width - ACTOR_GAP) / 2)
    const jitterY = Math.max(0, (cellHeight - hitRegion.height - ACTOR_GAP) / 2)
    const baselineCenterX = clamp(
      cellX + cellWidth / 2 + (random() * 2 - 1) * jitterX,
      hitRegion.width / 2,
      viewport.width - hitRegion.width / 2,
    )
    const baselineCenterY = clamp(
      cellY + cellHeight / 2 + (random() * 2 - 1) * jitterY,
      hitRegion.height / 2,
      viewport.height - hitRegion.height / 2,
    )
    const correctedRandom = seededUnit(
      round.placementSeed ^ Math.imul(slot + 1, 0x27d4eb2d) ^ 0x7f4a7c15,
    )
    // The 8 x 5 cells are a safety constraint, not a visual arrangement.
    // Small, deterministic cross-cell rhythm breaks up the row/column impression
    // while every starting hit region remains inside its own safe cell.
    const horizontalStagger = (((row * 3 + column * 5) % 5) - 2) * jitterX * 0.11
    const verticalStagger = (((column * 2 + row * 3) % 5) - 2) * jitterY * 0.13
    const correctedCenterX = clamp(
      cellX + cellWidth / 2 +
        (correctedRandom() * 2 - 1) * jitterX * 0.7 + horizontalStagger,
      hitRegion.width / 2,
      viewport.width - hitRegion.width / 2,
    )
    const correctedCenterY = clamp(
      cellY + cellHeight / 2 +
        (correctedRandom() * 2 - 1) * jitterY * 0.68 + verticalStagger,
      hitRegion.height / 2,
      viewport.height - hitRegion.height / 2,
    )
    const centerX = isReef ? correctedCenterX : baselineCenterX
    const centerY = isReef ? correctedCenterY : baselineCenterY
    const motionAssignment = motionAssignments.get(organism.id)
    const direction: -1 | 1 = motionAssignment?.direction ?? (
      seededUnit(round.movementSeed ^ Math.imul(slot + 1, 0x85ebca6b))() > 0.5 ? 1 : -1
    )
    const horizontalInset = Math.max(hitRegion.width / 2, ACTOR_GAP / 2)
    const verticalInset = Math.max(hitRegion.height / 2, ACTOR_GAP / 2)
    const verticalTop = cellY + verticalInset
    const verticalBottom = cellY + cellHeight - verticalInset
    const patrolBounds = isReef
      ? createWidePatrolBounds(centerX, cellWidth, hitRegion, viewport, verticalTop, verticalBottom)
      : boundsFromEdges(
          cellX + horizontalInset,
          verticalTop,
          cellX + cellWidth - horizontalInset,
          verticalBottom,
        )
    const movementProfile = isReef && motionAssignment
      ? motionAssignment.profile
      : createMovementProfile(
          slot,
          round.movementSeed,
          round.habitatId,
          round.movementScale,
          round.reducedMotion,
        )

    return {
      id: organism.id,
      morphId: organism.morphId,
      habitatId: round.habitatId,
      slot,
      normalizedPosition: { x: centerX / viewport.width, y: centerY / viewport.height },
      visualBounds: centeredBounds(centerX, centerY, visualSize.width, visualSize.height),
      hitBounds: centeredBounds(centerX, centerY, hitRegion.width, hitRegion.height),
      patrolBounds,
      direction,
      profileId: motionAssignment?.profileId ?? `slot-${slot}`,
      movementProfile,
    }
  })
}

export function fishCurveOffset(
  profile: FishMovementProfile,
  movementElapsedMs: number,
): number {
  const amplitude = Math.min(MAX_FISH_CURVE_OFFSET_PX, Math.abs(profile.verticalAmplitude))
  if (amplitude === 0) return 0
  return Math.sin(movementElapsedMs / profile.curvePeriodMs + profile.phase) * amplitude
}

type SlotMotionAssignment = {
  profileId: string
  direction: -1 | 1
  profile: FishMovementProfile
}

function createSlotMotionAssignments(
  organisms: readonly LayoutOrganism[],
  round: LayoutRound,
): Map<string, SlotMotionAssignment> {
  const assignments = new Map<string, SlotMotionAssignment>()
  const streamRandom = seededUnit(round.movementSeed ^ 0xc2b2ae35)
  const streamDirection: -1 | 1 = streamRandom() > 0.5 ? 1 : -1
  const streamSpeed = 26 + streamRandom() * 20
  // Every fish begins in one seeded, same-speed/same-direction field stream.
  // This keeps the traffic solver calm while making the modeled inherited
  // morph exactly neutral: any allowed morph count receives the same assigned
  // speed, direction, and patrol-span distribution. Per-slot curve phase and
  // amplitude still prevent the field from reading as rigid horizontal lanes.

  // Motion comes from the shuffled display slot alone. Morph is intentionally
  // absent here, so neither pattern receives a hidden movement advantage.
  organisms.forEach((organism, slot) => {
    const random = seededUnit(round.movementSeed ^ Math.imul(slot + 1, 0x9e3779b1))
    assignments.set(organism.id, {
      profileId: `slot-${slot + 1}`,
      direction: streamDirection,
      profile: {
        kind: 'fish_patrol',
        speedPxPerSecond: streamSpeed * round.movementScale * (round.reducedMotion ? 0.5 : 1),
        verticalAmplitude: round.reducedMotion ? 0 : 3 + random() * 7,
        phase: random() * Math.PI * 2,
        curvePeriodMs: 1_300 + random() * 900,
      },
    })
  })
  return assignments
}

function createWidePatrolBounds(
  centerX: number,
  cellWidth: number,
  hitRegion: HitRegion,
  viewport: Viewport,
  top: number,
  bottom: number,
): Bounds {
  const requestedSpan = clamp(cellWidth * 0.7, 64, 104)
  const minimumCenter = hitRegion.width / 2
  const maximumCenter = viewport.width - hitRegion.width / 2
  const availableSpan = Math.max(0, maximumCenter - minimumCenter)
  const span = Math.min(requestedSpan, availableSpan)
  const left = clamp(centerX - span / 2, minimumCenter, maximumCenter - span)
  return boundsFromEdges(left, top, left + span, bottom)
}

export function remapActorLayout(
  layout: readonly ActorLayout[],
  oldViewport: Viewport,
  newViewport: Viewport,
): ActorLayout[] {
  assertViewport(oldViewport)
  assertViewport(newViewport)
  const scaleX = newViewport.width / oldViewport.width
  const scaleY = newViewport.height / oldViewport.height

  return layout.map((actor) => {
    const hitWidth = actor.hitBounds.width
    const hitHeight = actor.hitBounds.height
    const centerX = clamp(
      actor.normalizedPosition.x * newViewport.width,
      hitWidth / 2,
      newViewport.width - hitWidth / 2,
    )
    const centerY = clamp(
      actor.normalizedPosition.y * newViewport.height,
      hitHeight / 2,
      newViewport.height - hitHeight / 2,
    )
    const visualCenter = centerOf(actor.visualBounds)
    const hitCenter = centerOf(actor.hitBounds)
    const visualOffsetX = (visualCenter.x - hitCenter.x) * scaleX
    const visualOffsetY = (visualCenter.y - hitCenter.y) * scaleY

    return {
      ...actor,
      normalizedPosition: { x: centerX / newViewport.width, y: centerY / newViewport.height },
      hitBounds: centeredBounds(centerX, centerY, hitWidth, hitHeight),
      visualBounds: centeredBounds(
        centerX + visualOffsetX,
        centerY + visualOffsetY,
        actor.visualBounds.width,
        actor.visualBounds.height,
      ),
      patrolBounds: clampPatrolBounds(
        {
          x: actor.patrolBounds.x * scaleX,
          y: actor.patrolBounds.y * scaleY,
          width: Math.max(0, actor.patrolBounds.width * scaleX),
          height: Math.max(0, actor.patrolBounds.height * scaleY),
        },
        hitWidth,
        hitHeight,
        newViewport,
      ),
    }
  })
}

function centeredBounds(x: number, y: number, width: number, height: number): Bounds {
  return { x: x - width / 2, y: y - height / 2, width, height }
}

function boundsFromEdges(left: number, top: number, right: number, bottom: number): Bounds {
  if (right < left || bottom < top) {
    const x = (left + right) / 2
    const y = (top + bottom) / 2
    return { x, y, width: 0, height: 0 }
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function centerOf(bounds: Bounds): { x: number; y: number } {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

function clampPatrolBounds(
  bounds: Bounds,
  hitWidth: number,
  hitHeight: number,
  viewport: Viewport,
): Bounds {
  const minX = hitWidth / 2
  const maxX = viewport.width - hitWidth / 2
  const minY = hitHeight / 2
  const maxY = viewport.height - hitHeight / 2
  const left = clamp(bounds.x, minX, maxX)
  const right = clamp(bounds.x + bounds.width, left, maxX)
  const top = clamp(bounds.y, minY, maxY)
  const bottom = clamp(bounds.y + bounds.height, top, maxY)
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}

function assertViewport(viewport: Viewport): void {
  if (!Number.isFinite(viewport.width) || viewport.width <= 0) {
    throw new Error('viewport.width must be positive.')
  }
  if (!Number.isFinite(viewport.height) || viewport.height <= 0) {
    throw new Error('viewport.height must be positive.')
  }
}
