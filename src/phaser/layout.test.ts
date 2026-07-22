import { describe, expect, it } from 'vitest'
import type { LayoutRound } from './layout.ts'
import {
  createActorLayout,
  createHitRegion,
  createMovementProfile,
  fishCurveOffset,
  MAX_FISH_CURVE_OFFSET_PX,
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

  it('keeps reef placement fully morph-neutral while using deterministic stagger', () => {
    const viewport = { width: 1180, height: 820 }
    const layout = createActorLayout(round(), viewport)
    const flipped = createActorLayout(round({
      organisms: organisms.map((organism) => ({
        ...organism,
        morphId: organism.morphId === 'camouflaged' ? 'conspicuous' as const : 'camouflaged' as const,
      })),
    }), viewport)
    const placementById = new Map(layout.map((actor) => [actor.id, {
      slot: actor.slot,
      normalizedPosition: actor.normalizedPosition,
      visualBounds: actor.visualBounds,
      hitBounds: actor.hitBounds,
      patrolBounds: actor.patrolBounds,
    }]))

    for (const actor of flipped) {
      expect(placementById.get(actor.id)).toEqual({
        slot: actor.slot,
        normalizedPosition: actor.normalizedPosition,
        visualBounds: actor.visualBounds,
        hitBounds: actor.hitBounds,
        patrolBounds: actor.patrolBounds,
      })
    }
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
      expect(first.speedPxPerSecond).toBeGreaterThanOrEqual(26)
      expect(first.speedPxPerSecond).toBeLessThanOrEqual(46)
      expect(first.verticalAmplitude).toBeGreaterThanOrEqual(3)
      expect(first.verticalAmplitude).toBeLessThanOrEqual(MAX_FISH_CURVE_OFFSET_PX)
      expect(first.curvePeriodMs).toBeGreaterThanOrEqual(1_300)
      expect(first.curvePeriodMs).toBeLessThanOrEqual(2_200)
    }
  })

  it('uses slow linear fish and landed moth profiles for reduced motion', () => {
    const fish = createMovementProfile(2, 777, 'reef_fish', 1, true)
    expect(fish.kind).toBe('fish_patrol')
    if (fish.kind === 'fish_patrol') {
      expect(fish.speedPxPerSecond).toBeGreaterThanOrEqual(13)
      expect(fish.speedPxPerSecond).toBeLessThanOrEqual(23)
      expect(fish.verticalAmplitude).toBe(0)
      expect(fishCurveOffset(fish, 1_000)).toBe(0)
    }

    const moth = createMovementProfile(2, 777, 'bark_moths', 1, true)
    expect(moth.kind).toBe('moth_land_drift')
  })

  it('uses the approved reef speed, patrol span, and unchanged tap geometry by default', () => {
    const viewport = { width: 820, height: 1180 }
    const layout = createActorLayout(round(), viewport)
    for (const actor of layout) {
      expect(actor.movementProfile.kind).toBe('fish_patrol')
      if (actor.movementProfile.kind === 'fish_patrol') {
        expect(actor.movementProfile.speedPxPerSecond).toBeGreaterThanOrEqual(26)
        expect(actor.movementProfile.speedPxPerSecond).toBeLessThanOrEqual(46)
      }
      expect(actor.patrolBounds.width).toBeCloseTo(71.05, 1)
      expect(actor.hitBounds.width).toBe(72)
      expect(actor.hitBounds.height).toBe(48)
    }
  })

  it('assigns fish movement by shuffled slot rather than by morph', () => {
    const viewport = { width: 1180, height: 820 }
    const layout = createActorLayout(round(), viewport)
    const flippedMorphs = organisms.map((organism) => ({
      ...organism,
      morphId: organism.morphId === 'camouflaged' ? 'conspicuous' as const : 'camouflaged' as const,
    }))
    const flipped = createActorLayout(round({ organisms: flippedMorphs }), viewport)
    const motionById = new Map(layout.map((actor) => [actor.id, {
      slot: actor.slot,
      profileId: actor.profileId,
      direction: actor.direction,
      movementProfile: actor.movementProfile,
    }]))

    for (const actor of flipped) {
      expect(motionById.get(actor.id)).toEqual({
        slot: actor.slot,
        profileId: actor.profileId,
        direction: actor.direction,
        movementProfile: actor.movementProfile,
      })
    }
  })

  it('keeps the seeded fish field moving together without changing its speed range', () => {
    const layout = createActorLayout(round(), { width: 768, height: 1024 })
    const directions = new Set(layout.map((actor) => actor.direction))
    const speeds = new Set(layout.map((actor) => {
      expect(actor.movementProfile.kind).toBe('fish_patrol')
      return actor.movementProfile.kind === 'fish_patrol'
        ? actor.movementProfile.speedPxPerSecond
        : 0
    }))
    expect(directions.size).toBe(1)
    expect(speeds.size).toBe(1)
    for (const speed of speeds) {
      expect(speed).toBeGreaterThanOrEqual(26)
      expect(speed).toBeLessThanOrEqual(46)
    }
  })

  it('keeps all profiles morph-neutral across every allowed population ratio', () => {
    for (let camouflaged = 4; camouflaged <= 36; camouflaged += 1) {
      const ratioOrganisms = Array.from({ length: 40 }, (_, index) => ({
        id: `ratio-${camouflaged}-${index}`,
        morphId: index < camouflaged ? 'camouflaged' as const : 'conspicuous' as const,
      }))
      const layout = createActorLayout(round({
        organisms: ratioOrganisms,
      }), { width: 1180, height: 820 })
      const flipped = createActorLayout(round({
        organisms: ratioOrganisms.map((organism) => ({
          ...organism,
          morphId: organism.morphId === 'camouflaged' ? 'conspicuous' as const : 'camouflaged' as const,
        })),
      }), { width: 1180, height: 820 })
      const motionById = new Map(layout.map((actor) => [actor.id, actor.movementProfile]))
      for (const actor of flipped) {
        expect(actor.movementProfile).toEqual(motionById.get(actor.id))
      }
    }
  })

  it('gives both morphs exact speed, direction, and patrol-span distributions at every allowed ratio', () => {
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 820, height: 1180 },
      { width: 1180, height: 820 },
    ]) {
      for (const placementSeed of [1, 12_345, 98_765]) {
        for (let camouflaged = 4; camouflaged <= 36; camouflaged += 1) {
          const ratioOrganisms = Array.from({ length: 40 }, (_, index) => ({
            id: `balanced-${placementSeed}-${camouflaged}-${index}`,
            morphId: index < camouflaged ? 'camouflaged' as const : 'conspicuous' as const,
          }))
          const layout = createActorLayout(round({
            organisms: ratioOrganisms,
            placementSeed,
          }), viewport)
          const allSpeeds = new Set(layout.map((actor) => {
            expect(actor.movementProfile.kind).toBe('fish_patrol')
            return actor.movementProfile.kind === 'fish_patrol'
              ? actor.movementProfile.speedPxPerSecond
              : 0
          }))
          const allDirections = new Set(layout.map((actor) => actor.direction))
          const patrolSpanKey = (actor: (typeof layout)[number]) => (
            `${actor.patrolBounds.width.toFixed(6)}:${actor.patrolBounds.height.toFixed(6)}`
          )
          const allPatrolSpans = new Set(layout.map(patrolSpanKey))

          expect(allSpeeds.size).toBe(1)
          expect(allDirections.size).toBe(1)
          expect(allPatrolSpans.size).toBe(1)

          for (const morphId of ['camouflaged', 'conspicuous'] as const) {
            const morphActors = layout.filter((actor) => actor.morphId === morphId)
            const morphSpeeds = new Set(morphActors.map((actor) => (
              actor.movementProfile.kind === 'fish_patrol'
                ? actor.movementProfile.speedPxPerSecond
                : 0
            )))
            const morphDirections = new Set(morphActors.map((actor) => actor.direction))
            const morphPatrolSpans = new Set(morphActors.map(patrolSpanKey))
            expect(morphSpeeds).toEqual(allSpeeds)
            expect(morphDirections).toEqual(allDirections)
            expect(morphPatrolSpans).toEqual(allPatrolSpans)
          }
        }
      }
    }
  })

  it('keeps curved drift at or below ten pixels from each fish patrol centerline', () => {
    const layout = createActorLayout(round(), { width: 820, height: 1180 })
    for (const actor of layout) {
      expect(actor.movementProfile.kind).toBe('fish_patrol')
      if (actor.movementProfile.kind !== 'fish_patrol') continue
      for (let elapsedMs = 0; elapsedMs <= 12_000; elapsedMs += 37) {
        expect(Math.abs(fishCurveOffset(actor.movementProfile, elapsedMs))).toBeLessThanOrEqual(
          MAX_FISH_CURVE_OFFSET_PX,
        )
      }
    }
  })

  it('keeps corrected starting hit regions separate at every supported iPad size', () => {
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 820, height: 1180 },
      { width: 1180, height: 820 },
    ]) {
      for (const hitAreaScale of [1, 1.2]) {
        const layout = createActorLayout(round({ hitAreaScale }), viewport)
        for (let first = 0; first < layout.length; first += 1) {
          for (let second = first + 1; second < layout.length; second += 1) {
            expect(overlaps(layout[first].hitBounds, layout[second].hitBounds)).toBe(false)
          }
        }
      }
    }
  })

  it('keeps the staggered reef layout non-overlapping across replay seeds', () => {
    const viewports = [
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 820, height: 1180 },
      { width: 1180, height: 820 },
    ]
    for (let placementSeed = 1; placementSeed <= 16; placementSeed += 1) {
      for (const viewport of viewports) {
        const layout = createActorLayout(round({ placementSeed }), viewport)
        for (let first = 0; first < layout.length; first += 1) {
          for (let second = first + 1; second < layout.length; second += 1) {
            expect(overlaps(layout[first].hitBounds, layout[second].hitBounds)).toBe(false)
          }
        }
      }
    }
  })

  it('uses the Extended multiplier and removes bobbing in reduced motion', () => {
    const standard = createActorLayout(round(), { width: 820, height: 1180 })
    const extended = createActorLayout(round({
      movementScale: 0.75,
      hitAreaScale: 1.2,
    }), { width: 820, height: 1180 })
    const reduced = createActorLayout(round({
      reducedMotion: true,
    }), { width: 820, height: 1180 })
    for (const actor of standard) {
      const extendedActor = extended.find(({ id }) => id === actor.id)!
      const reducedActor = reduced.find(({ id }) => id === actor.id)!
      expect(actor.movementProfile.kind).toBe('fish_patrol')
      expect(extendedActor.movementProfile.kind).toBe('fish_patrol')
      expect(reducedActor.movementProfile.kind).toBe('fish_patrol')
      if (
        actor.movementProfile.kind === 'fish_patrol' &&
        extendedActor.movementProfile.kind === 'fish_patrol' &&
        reducedActor.movementProfile.kind === 'fish_patrol'
      ) {
        expect(extendedActor.movementProfile.speedPxPerSecond).toBeCloseTo(
          actor.movementProfile.speedPxPerSecond * 0.75,
        )
        expect(reducedActor.movementProfile.speedPxPerSecond).toBeCloseTo(
          actor.movementProfile.speedPxPerSecond * 0.5,
        )
        expect(reducedActor.movementProfile.verticalAmplitude).toBe(0)
      }
      expect(extendedActor.hitBounds.width).toBeCloseTo(86.4)
      expect(extendedActor.hitBounds.height).toBeCloseTo(57.6)
    }
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
