import { describe, expect, it } from 'vitest'
import type { LayoutRound } from './layout.ts'
import {
  createActorLayout,
  createHitRegion,
  createMovementProfile,
  remapActorLayout,
} from './layout.ts'

const organisms = Array.from({ length: 40 }, (_, index) => ({
  id: `organism-${index}`,
  morphId: index < 20 ? 'camouflaged' as const : 'conspicuous' as const,
}))

function round(overrides: Partial<LayoutRound> = {}): LayoutRound {
  return {
    habitatId: 'reef_fish',
    organisms,
    hitAreaScale: 1,
    reducedMotion: false,
    placementSeed: 12345,
    movementSeed: 98765,
    movementScale: 1,
    ...overrides,
  }
}

describe('Phaser actor layout', () => {
  it('is reproducible for one seed and changes for another seed', () => {
    const viewport = { width: 768, height: 1024 }
    const first = createActorLayout(round(), viewport)
    expect(createActorLayout(round(), viewport)).toEqual(first)

    const next = createActorLayout(round({ placementSeed: 12346 }), viewport)
    expect(next.map((actor) => actor.id)).not.toEqual(first.map((actor) => actor.id))
    expect(next).toHaveLength(40)
  })

  it('shuffles morphs instead of placing them in morph-first regions', () => {
    const layout = createActorLayout(round(), { width: 768, height: 1024 })
    const transitions = layout.slice(1).filter((actor, index) => actor.morphId !== layout[index].morphId)
    expect(transitions.length).toBeGreaterThan(5)
    expect(layout.slice(0, 8).map((actor) => actor.morphId)).toContain('camouflaged')
    expect(layout.slice(0, 8).map((actor) => actor.morphId)).toContain('conspicuous')
  })

  it('uses exact habitat hit regions and the timing scale', () => {
    expect(createHitRegion('reef_fish')).toEqual({ width: 72, height: 48 })
    expect(createHitRegion('bark_moths')).toEqual({ width: 64, height: 52 })
    expect(createHitRegion('reef_fish', 1.2).width).toBeCloseTo(86.4)
    expect(createHitRegion('reef_fish', 1.2).height).toBeCloseTo(57.6)
    expect(createHitRegion('bark_moths', 1.2).width).toBeCloseTo(76.8)
    expect(createHitRegion('bark_moths', 1.2).height).toBeCloseTo(62.4)
  })

  it('keeps starting hit regions separate at supported iPad sizes', () => {
    const layout = createActorLayout(round({ hitAreaScale: 1.2 }), { width: 768, height: 1024 })
    for (let first = 0; first < layout.length; first += 1) {
      for (let second = first + 1; second < layout.length; second += 1) {
        expect(overlaps(layout[first].hitBounds, layout[second].hitBounds)).toBe(false)
      }
    }
  })

  it('keeps every visible organism inside its hit region', () => {
    for (const habitatId of ['reef_fish', 'bark_moths'] as const) {
      const layout = createActorLayout(round({ habitatId }), { width: 768, height: 1024 })
      for (const actor of layout) {
        expect(actor.visualBounds.x).toBeGreaterThanOrEqual(actor.hitBounds.x)
        expect(actor.visualBounds.y).toBeGreaterThanOrEqual(actor.hitBounds.y)
        expect(actor.visualBounds.x + actor.visualBounds.width).toBeLessThanOrEqual(
          actor.hitBounds.x + actor.hitBounds.width,
        )
        expect(actor.visualBounds.y + actor.visualBounds.height).toBeLessThanOrEqual(
          actor.hitBounds.y + actor.hitBounds.height,
        )
      }
    }
  })

  it('assigns a movement profile by slot and seed, independent of morph', () => {
    const first = createMovementProfile(7, 444, 'reef_fish')
    const repeated = createMovementProfile(7, 444, 'reef_fish')
    expect(repeated).toEqual(first)
    expect(first.kind).toBe('fish_patrol')
    if (first.kind === 'fish_patrol') {
      expect(first.speedPxPerSecond).toBeGreaterThanOrEqual(18)
      expect(first.speedPxPerSecond).toBeLessThanOrEqual(36)
      expect(first.verticalAmplitude).toBeLessThanOrEqual(7)
    }
  })

  it('uses slow linear fish and landed moth profiles for reduced motion', () => {
    const fish = createMovementProfile(2, 777, 'reef_fish', 1, true)
    expect(fish.kind).toBe('fish_patrol')
    if (fish.kind === 'fish_patrol') {
      expect(fish.speedPxPerSecond).toBeGreaterThanOrEqual(9)
      expect(fish.speedPxPerSecond).toBeLessThanOrEqual(18)
      expect(fish.verticalAmplitude).toBe(0)
    }

    const moth = createMovementProfile(2, 777, 'bark_moths', 1, true)
    expect(moth.kind).toBe('moth_land_drift')
  })

  it('remaps normalized positions inside a rotated viewport without changing IDs', () => {
    const original = createActorLayout(round(), { width: 768, height: 1024 })
    const remapped = remapActorLayout(
      original,
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
    )
    expect(remapped.map((actor) => actor.id)).toEqual(original.map((actor) => actor.id))
    for (const actor of remapped) {
      expect(actor.hitBounds.x).toBeGreaterThanOrEqual(0)
      expect(actor.hitBounds.y).toBeGreaterThanOrEqual(0)
      expect(actor.hitBounds.x + actor.hitBounds.width).toBeLessThanOrEqual(1024)
      expect(actor.hitBounds.y + actor.hitBounds.height).toBeLessThanOrEqual(768)
      expect(actor.patrolBounds.x).toBeGreaterThanOrEqual(actor.hitBounds.width / 2)
      expect(actor.patrolBounds.x + actor.patrolBounds.width).toBeLessThanOrEqual(
        1024 - actor.hitBounds.width / 2,
      )
      expect(actor.patrolBounds.y).toBeGreaterThanOrEqual(actor.hitBounds.height / 2)
      expect(actor.patrolBounds.y + actor.patrolBounds.height).toBeLessThanOrEqual(
        768 - actor.hitBounds.height / 2,
      )
    }
  })
})

function overlaps(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
}
