import { describe, expect, it } from 'vitest'
import {
  CER_REQUIRED_VOCABULARY,
  HABITAT_STUDENT_COPY,
  MODEL_SAFEGUARD_DISCLOSURES,
  createCerClaimChoices,
  createMisconceptionQuestions,
  formatGenerationPopulationEvidence,
  formatRateBasedGenerationEvidence,
  summarizeMorphOutcome,
  type GenerationEvidenceInput,
  type HabitatOutcome,
} from './index.ts'

const reefIncrease: HabitatOutcome = {
  habitatId: 'reef_fish',
  startingCounts: { camouflaged: 20, conspicuous: 20 },
  endingCounts: { camouflaged: 30, conspicuous: 10 },
}

const mothDecrease: HabitatOutcome = {
  habitatId: 'bark_moths',
  startingCounts: { camouflaged: 20, conspicuous: 20 },
  endingCounts: { camouflaged: 12, conspicuous: 28 },
}

describe('student learning copy', () => {
  it('describes inherited physical patterns rather than need-driven camouflage', () => {
    expect(HABITAT_STUDENT_COPY.reef_fish.inheritedTrait).toBe(
      'body color and pattern',
    )
    expect(HABITAT_STUDENT_COPY.bark_moths.inheritedTrait).toBe(
      'wing color and pattern',
    )
    expect(HABITAT_STUDENT_COPY.reef_fish.predatorDirections).toContain(
      'notice first',
    )
  })

  it('discloses fixed population, representation floor, and automatic modeling', () => {
    expect(MODEL_SAFEGUARD_DISCLOSURES.fixedPopulation).toContain(
      'Real population sizes',
    )
    expect(MODEL_SAFEGUARD_DISCLOSURES.comparisonFloor).toContain(
      'variation can disappear',
    )
    expect(MODEL_SAFEGUARD_DISCLOSURES.automaticCompletion).toContain(
      'do not add predator points',
    )
  })
})

describe('outcome-aware assessment', () => {
  it('uses the actual direction and percentages in the population-change question', () => {
    const question = createMisconceptionQuestions([
      reefIncrease,
      mothDecrease,
    ])[1]
    expect(question.prompt).toContain('increased from 50% to 75%')
    expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
    expect(question.choices.find((choice) => choice.isCorrect)?.text).toContain(
      'survived predation and reproduced',
    )
  })

  it('creates an honest no-change explanation', () => {
    const unchanged: HabitatOutcome = {
      ...reefIncrease,
      endingCounts: { camouflaged: 20, conspicuous: 20 },
    }
    const question = createMisconceptionQuestions([unchanged])[1]
    expect(question.prompt).toContain('same 50%')
    expect(question.choices.find((choice) => choice.isCorrect)?.text).toContain(
      'similar overall survival and reproduction',
    )
  })

  it('returns exactly four checks with immediate feedback for every choice', () => {
    const questions = createMisconceptionQuestions([
      reefIncrease,
      mothDecrease,
    ])
    expect(questions).toHaveLength(4)
    for (const question of questions) {
      expect(question.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
      expect(question.choices.every((choice) => choice.feedback.length > 20)).toBe(
        true,
      )
    }
  })

  it('generates a supported mixed-outcome CER claim without forcing camouflage to win', () => {
    const claims = createCerClaimChoices([reefIncrease, mothDecrease])
    expect(claims.filter((claim) => claim.isSupported)).toHaveLength(1)
    expect(claims.find((claim) => claim.isSupported)?.text).toContain(
      'different percentage changes',
    )
  })

  it('summarizes increase, decrease, and exact percentage values', () => {
    expect(summarizeMorphOutcome(reefIncrease)).toMatchObject({
      trend: 'increase',
      startPercent: 50,
      endPercent: 75,
    })
    expect(summarizeMorphOutcome(mothDecrease).trend).toBe('decrease')
  })
})

describe('evidence sentence helpers', () => {
  const evidence: GenerationEvidenceInput = {
    habitatId: 'reef_fish',
    generation: 2,
    startingCounts: { camouflaged: 24, conspicuous: 16 },
    manualCatches: { camouflaged: 2, conspicuous: 5 },
    automaticCatches: { camouflaged: 2, conspicuous: 3 },
    protectedEscapes: 1,
    survivorCounts: { camouflaged: 20, conspicuous: 8 },
    offspringCounts: { camouflaged: 29, conspicuous: 11 },
  }

  it('reports both count and percentage for graph evidence', () => {
    expect(
      formatGenerationPopulationEvidence('reef_fish', 3, {
        camouflaged: 29,
        conspicuous: 11,
      }),
    ).toContain('29 of 40 (72.5%)')
  })

  it('compares survival rates and distinguishes manual from modeled captures', () => {
    const sentence = formatRateBasedGenerationEvidence(evidence)
    expect(sentence).toContain('20 of 24')
    expect(sentence).toContain('(83.3%)')
    expect(sentence).toContain('8 of 16')
    expect(sentence).toContain('(50%)')
    expect(sentence).toContain('7 of 12 captures came from your taps')
    expect(sentence).toContain('model completed 5')
    expect(sentence).toContain('classroom model protected 1 additional tap for comparison')
  })

  it('does not mention protected escapes when the adapter does not provide them', () => {
    const { protectedEscapes: _protectedEscapes, ...withoutProtectedEscapes } =
      evidence
    expect(formatRateBasedGenerationEvidence(withoutProtectedEscapes)).not.toContain(
      'protected',
    )
  })

  it('rejects evidence whose captures and survivors do not reconcile', () => {
    expect(() =>
      formatRateBasedGenerationEvidence({
        ...evidence,
        survivorCounts: { camouflaged: 19, conspicuous: 9 },
      }),
    ).toThrow(/reconcile/)
  })
})

describe('CER scaffold', () => {
  it('requires the classroom causal vocabulary', () => {
    expect(CER_REQUIRED_VOCABULARY).toEqual([
      'inherited variation',
      'environmental pressure',
      'survive',
      'reproduce',
      'offspring',
      'percentage of the population',
    ])
  })
})
