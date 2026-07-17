export type FishTrafficState = {
  id: string
  row: number
  x: number
  y: number
  direction: -1 | 1
  speedPxPerSecond: number
  hitWidth: number
  hitHeight: number
  patrolLeft: number
  patrolRight: number
  collisionCooldownMs?: number
  collisionTurnCount?: number
  continuousBlockedMs?: number
}

export type FishTrafficResult = FishTrafficState & {
  boundaryTurn: boolean
  collisionTurn: boolean
  collisionBlocked: boolean
  distancePx: number
  collisionCooldownMs: number
}

const SAFETY_GAP = 4
const COLLISION_TURN_COOLDOWN_MS = 450
const MAX_TRAFFIC_STEP_MS = 50

export function advanceFishTraffic(
  states: readonly FishTrafficState[],
  deltaMs: number,
): FishTrafficResult[] {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('deltaMs must be non-negative.')
  const stepCount = Math.max(1, Math.ceil(deltaMs / MAX_TRAFFIC_STEP_MS))
  const stepMs = deltaMs / stepCount
  let current = states.map((state) => ({ ...state }))
  const accumulated = new Map(states.map((state) => [state.id, {
    boundaryTurn: false,
    collisionTurn: false,
    collisionBlocked: false,
    distancePx: 0,
  }]))

  for (let step = 0; step < stepCount; step += 1) {
    const results = advanceFishTrafficStep(current, stepMs)
    current = results.map((result) => {
      const total = accumulated.get(result.id)!
      total.boundaryTurn ||= result.boundaryTurn
      total.collisionTurn ||= result.collisionTurn
      total.collisionBlocked ||= result.collisionBlocked
      total.distancePx += result.distancePx
      return {
        ...result,
        collisionTurnCount: (result.collisionTurnCount ?? 0) + (result.collisionTurn ? 1 : 0),
        continuousBlockedMs: result.collisionBlocked
          ? (result.continuousBlockedMs ?? 0) + stepMs
          : 0,
      }
    })
  }

  return current.map((result) => ({
    ...result,
    ...accumulated.get(result.id)!,
    collisionCooldownMs: result.collisionCooldownMs ?? 0,
  }))
}

function advanceFishTrafficStep(
  states: readonly FishTrafficState[],
  deltaMs: number,
): FishTrafficResult[] {
  const results = new Map<string, FishTrafficResult>()
  const originals = new Map(states.map((state) => [state.id, state]))
  const rows = new Map<number, FishTrafficState[]>()
  for (const state of states) {
    const lane = rows.get(state.row) ?? []
    lane.push(state)
    rows.set(state.row, lane)
  }

  for (const lane of rows.values()) {
    const ordered = [...lane].sort((first, second) => first.x - second.x || first.id.localeCompare(second.id))
    for (const state of ordered) {
      const proposed = reflectAtBounds(
        state.x + state.direction * state.speedPxPerSecond * (deltaMs / 1000),
        state.direction,
        state.patrolLeft,
        state.patrolRight,
      )
      results.set(state.id, {
        ...state,
        x: proposed.x,
        direction: proposed.direction,
        boundaryTurn: proposed.turned,
        collisionTurn: false,
        collisionBlocked: false,
        distancePx: Math.abs(proposed.x - state.x),
        collisionCooldownMs: Math.max(0, (state.collisionCooldownMs ?? 0) - deltaMs),
      })
    }

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const left = results.get(ordered[index]!.id)!
      const right = results.get(ordered[index + 1]!.id)!
      if (!overlaps(left, right)) continue

      const originalLeft = originals.get(left.id)!
      const originalRight = originals.get(right.id)!
      const headOn = left.direction === 1 && right.direction === -1
      if (headOn) {
        const leftTurns = left.collisionTurnCount ?? 0
        const rightTurns = right.collisionTurnCount ?? 0
        const preferred = leftTurns !== rightTurns
          ? leftTurns < rightTurns ? left : right
          : left.id.localeCompare(right.id) <= 0 ? left : right
        const alternative = preferred.id === left.id ? right : left
        const turning = preferred.collisionCooldownMs <= 0
          ? preferred
          : alternative.collisionCooldownMs <= 0
            ? alternative
            : null
        left.x = originalLeft.x
        right.x = originalRight.x
        left.distancePx = 0
        right.distancePx = 0
        left.collisionBlocked = true
        right.collisionBlocked = true
        if (turning) {
          turning.direction = turning.direction === 1 ? -1 : 1
          turning.collisionTurn = true
          turning.collisionCooldownMs = COLLISION_TURN_COOLDOWN_MS
        }
        continue
      }

      const trailing = left.direction === 1 && right.direction === 1
        ? left
        : left.direction === -1 && right.direction === -1
          ? right
          : left.id.localeCompare(right.id) <= 0 ? left : right
      const originalTrailing = originals.get(trailing.id)!
      trailing.x = originalTrailing.x
      trailing.distancePx = 0
      trailing.collisionBlocked = true
      if ((trailing.continuousBlockedMs ?? 0) >= 100 && trailing.collisionCooldownMs <= 0) {
        trailing.direction = trailing.direction === 1 ? -1 : 1
        trailing.collisionTurn = true
        trailing.collisionCooldownMs = COLLISION_TURN_COOLDOWN_MS
      }
    }

    // Large frame deltas or a three-fish squeeze must still end in a safe state.
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const left = results.get(ordered[index]!.id)!
      const right = results.get(ordered[index + 1]!.id)!
      if (!overlaps(left, right)) continue
      for (const fish of [left, right]) {
        fish.x = originals.get(fish.id)!.x
        fish.distancePx = 0
        fish.collisionBlocked = true
      }
    }
  }

  return states.map((state) => results.get(state.id) ?? {
    ...state,
    boundaryTurn: false,
    collisionTurn: false,
    collisionBlocked: false,
    distancePx: 0,
    collisionCooldownMs: Math.max(0, (state.collisionCooldownMs ?? 0) - deltaMs),
  })
}

function reflectAtBounds(
  proposedX: number,
  direction: -1 | 1,
  left: number,
  right: number,
): { x: number; direction: -1 | 1; turned: boolean } {
  if (right < left) throw new Error('patrolRight must be greater than or equal to patrolLeft.')
  if (left === right) return { x: left, direction, turned: proposedX !== left }
  let x = proposedX
  let nextDirection = direction
  let turned = false
  for (let guard = 0; guard < 8 && (x < left || x > right); guard += 1) {
    turned = true
    if (x > right) {
      x = right - (x - right)
      nextDirection = -1
    } else if (x < left) {
      x = left + (left - x)
      nextDirection = 1
    }
  }
  return {
    x: Math.min(right, Math.max(left, x)),
    direction: nextDirection,
    turned,
  }
}

function overlaps(first: FishTrafficState, second: FishTrafficState): boolean {
  return Math.abs(first.x - second.x) < (first.hitWidth + second.hitWidth) / 2 + SAFETY_GAP &&
    Math.abs(first.y - second.y) < (first.hitHeight + second.hitHeight) / 2 + SAFETY_GAP
}
