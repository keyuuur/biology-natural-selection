import { describe, expect, it } from 'vitest'
import { createSeededRandom, deriveSeed } from './seededRandom.ts'

describe('seeded random helpers', () => {
  it('repeats streams and derives purpose-specific sub-seeds', () => {
    const first = createSeededRandom(123)
    const second = createSeededRandom(123)
    expect([first(), first(), first()]).toEqual([second(), second(), second()])

    const placement = deriveSeed(123, 'reef_fish', 1, 'placement')
    const automatic = deriveSeed(123, 'reef_fish', 1, 'automatic-predation')
    expect(placement).not.toBe(automatic)
    expect(deriveSeed(123, 'reef_fish', 1, 'placement')).toBe(placement)
  })

  it('rejects seeds outside the unsigned 32-bit range', () => {
    expect(() => createSeededRandom(-1)).toThrow('unsigned 32-bit')
    expect(() => deriveSeed(0x1_0000_0000, 'bad')).toThrow('unsigned 32-bit')
  })
})
