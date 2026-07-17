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
      expect(first.speedPxPerSecond).toBeGreaterThanOrEqual(26)
      expect(first.speedPxPerSecond).toBeLessThanOrEqual(46)
      expect(first.verticalAmplitude).toBeLessThanOrEqual(7)
    }
  })

  it('uses slow linear fish and landed moth profiles for reduced motion', () => {
    const fish = createMovementProfile(2, 777, 'reef_fish', 1, true)
    expect(fish.kind).toBe('fish_patrol')
    if (fish.kind === 'fish_patrol') {
      expect(fish.speedPxPerSecond).toBeGreaterThanOrEqual(13)
      expect(fish.speedPxPerSecond).toBeLessThanOrEqual(23)
      expect(fish.verticalAmplitude).toBe(0)
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

  it('assigns the same complete 20-profile bank to both morphs in a 20/20 round', () => {
    const layout = createActorLayout(round(), { width: 1180, height: 820 })
    const profiles = (morphId: 'camouflaged' | 'conspicuous') => layout
      .filter((actor) => actor.morphId === morphId)
      .map((actor) => ({
        id: actor.profileId,
        direction: actor.direction,
        movement: actor.movementProfile,
      }))
      .sort((first, second) => first.id.localeCompare(second.id))
    expect(profiles('camouflaged')).toEqual(profiles('conspicuous'))
  })

  it('keeps motion mechanically balanced across every allowed population ratio', () => {
    for (let camouflaged = 4; camouflaged <= 36; camouflaged += 1) {
      const ratioOrganisms = Array.from({ length: 40 }, (_, index) => ({
        id: `ratio-${camouflaged}-${index}`,
        morphId: index < camouflaged ? 'camouflaged' as const : 'conspicuous' as const,
      }))
      const layout = createActorLayout(round({
        organisms: ratioOrganisms,
      }), { width: 1180, height: 820 })
      const stats = (morphId: 'camouflaged' | 'conspicuous') => {
        const actors = layout.filter((actor) => actor.morphId === morphId)
        const fish = actors.map((actor) => {
          expect(actor.movementProfile.kind).toBe('fish_patrol')
          return actor.movementProfile.kind === 'fish_patrol' ? actor.movementProfile : null
        }).filter((profile): profile is NonNullable<typeof profile> => profile !== null)
        return {
          meanSpeed: fish.reduce((sum, profile) => sum + profile.speedPxPerSecond, 0) / fish.length,
          meanAmplitude: fish.reduce((sum, profile) => sum + profile.verticalAmplitude, 0) / fish.length,
          directionImbalance: Math.abs(
            actors.filter(({ direction }) => direction === 1).length -
            actors.filter(({ direction }) => direction === -1).length,
          ),
        }
      }
      const camouflage = stats('camouflaged')
      const conspicuous = stats('conspicuous')
      expect(camouflage.meanSpeed).toBeCloseTo(conspicuous.meanSpeed, 10)
      expect(camouflage.meanAmplitude).toBeCloseTo(conspicuous.meanAmplitude, 10)
      expect(camouflage.directionImbalance).toBe(conspicuous.directionImbalance)
      expect(camouflage.directionImbalance).toBeLessThanOrEqual(1)
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
