import type { RandomSource } from './types.ts'

const UINT32_MAX = 0xffff_ffff

export function validateSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) {
    throw new Error('Seed must be an unsigned 32-bit integer.')
  }
}

/** Derives stable independent sub-seeds without consuming another random stream. */
export function deriveSeed(
  baseSeed: number,
  ...parts: readonly (string | number)[]
): number {
  validateSeed(baseSeed)
  let hash = (0x811c9dc5 ^ baseSeed) >>> 0
  const input = parts.map(String).join('\u001f')
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Mulberry32: compact, repeatable classroom-model randomness, not security. */
export function createSeededRandom(seed: number): RandomSource {
  validateSeed(seed)
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}
