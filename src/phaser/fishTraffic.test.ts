import { describe, expect, it } from 'vitest'
import { advanceFishTraffic, type FishTrafficState } from './fishTraffic.ts'

function fish(overrides: Partial<FishTrafficState>): FishTrafficState {
  return {
    id: 'fish',
    row: 0,
    x: 100,
    y: 100,
    direction: 1,
    speedPxPerSecond: 40,
    hitWidth: 72,
    hitHeight: 48,
    patrolLeft: 60,
    patrolRight: 160,
    ...overrides,
  }
}

describe('fish traffic solver', () => {
  it('is deterministic and reflects overshoot at patrol boundaries', () => {
    const state = fish({ x: 158 })
    const first = advanceFishTraffic([state], 100)
    expect(advanceFishTraffic([state], 100)).toEqual(first)
    expect(first[0]?.x).toBeCloseTo(158)
    expect(first[0]?.direction).toBe(-1)
    expect(first[0]?.boundaryTurn).toBe(true)
  })

  it('reverses only one fish in a head-on conflict and applies a cooldown', () => {
    const states = [
      fish({ id: 'left', x: 100, direction: 1, patrolLeft: 70, patrolRight: 180 }),
      fish({ id: 'right', x: 180, direction: -1, patrolLeft: 100, patrolRight: 210 }),
    ]
    const next = advanceFishTraffic(states, 100)
    expect(next.filter((state) => state.collisionTurn)).toHaveLength(1)
    expect(next.every((state) => state.collisionBlocked)).toBe(true)
    expect(Math.abs((next[1]?.x ?? 0) - (next[0]?.x ?? 0))).toBeGreaterThanOrEqual(76)

    const repeated = advanceFishTraffic(next, 16)
    expect(repeated.filter((state) => state.collisionTurn)).toHaveLength(0)
  })

  it('holds the trailing fish without reversing it in a same-direction conflict', () => {
    const next = advanceFishTraffic([
      fish({ id: 'trailing', x: 100, direction: 1, speedPxPerSecond: 40 }),
      fish({ id: 'leading', x: 176, direction: 1, speedPxPerSecond: 20 }),
    ], 50)
    const trailing = next.find(({ id }) => id === 'trailing')!
    expect(trailing.x).toBe(100)
    expect(trailing.direction).toBe(1)
    expect(trailing.collisionBlocked).toBe(true)
    expect(trailing.collisionTurn).toBe(false)
  })

  it('keeps separate rows mechanically independent', () => {
    const next = advanceFishTraffic([
      fish({ id: 'row-0', row: 0, x: 100 }),
      fish({ id: 'row-1', row: 1, x: 100 }),
    ], 100)
    expect(next.every((state) => state.x > 100)).toBe(true)
  })

  it('keeps a dense lane non-overlapping during a deterministic 12-second run', () => {
    let states = Array.from({ length: 5 }, (_, index) => fish({
      id: `fish-${index}`,
      x: 80 + index * 82,
      direction: index % 2 === 0 ? 1 : -1,
      speedPxPerSecond: 26 + index * 5,
      patrolLeft: Math.max(40, 30 + index * 82),
      patrolRight: 130 + index * 82,
    }))
    let turns = 0
    for (let frame = 0; frame < 720; frame += 1) {
      const next = advanceFishTraffic(states, 1000 / 60)
      turns += next.filter(({ collisionTurn }) => collisionTurn).length
      const ordered = [...next].sort((first, second) => first.x - second.x)
      for (let index = 0; index < ordered.length - 1; index += 1) {
        expect(ordered[index + 1]!.x - ordered[index]!.x).toBeGreaterThanOrEqual(76)
      }
      states = next
    }
    expect(turns).toBeLessThanOrEqual(40)
  })

  it('falls back to the previous safe positions for a large frame delta', () => {
    const next = advanceFishTraffic([
      fish({ id: 'left', x: 100, direction: 1, patrolLeft: 40, patrolRight: 240 }),
      fish({ id: 'right', x: 180, direction: -1, patrolLeft: 40, patrolRight: 240 }),
    ], 1_500)
    expect(Math.abs(next[1]!.x - next[0]!.x)).toBeGreaterThanOrEqual(76)
  })

  it('substeps a dense lane through a large frame delta without overtaking or overlap', () => {
    const next = advanceFishTraffic(
      Array.from({ length: 5 }, (_, index) => fish({
        id: `dense-${index}`,
        x: 80 + index * 82,
        direction: index % 2 === 0 ? 1 : -1,
        speedPxPerSecond: 26 + index * 5,
        patrolLeft: Math.max(40, 30 + index * 82),
        patrolRight: 130 + index * 82,
      })),
      1_500,
    )
    const ordered = [...next].sort((first, second) => first.x - second.x)
    for (let index = 0; index < ordered.length - 1; index += 1) {
      expect(ordered[index + 1]!.x - ordered[index]!.x).toBeGreaterThanOrEqual(76)
    }
    expect(ordered.map(({ id }) => id)).toEqual([
      'dense-0',
      'dense-1',
      'dense-2',
      'dense-3',
      'dense-4',
    ])
  })
})
