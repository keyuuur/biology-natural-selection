import {
  parseNaturalSelectionResult,
  serializeNaturalSelectionResult,
  type NaturalSelectionResult,
  type ResultSaver,
} from '../simulation/index.ts'

const DRAFT_KEY = 'natural-selection:v1:draft'
const RESULT_KEY = 'natural-selection:v1:last-result'

export class LocalResultSaver implements ResultSaver {
  async save(result: NaturalSelectionResult): Promise<void> {
    const serialized = serializeNaturalSelectionResult(result)
    try {
      if (result.completionState === 'complete') {
        window.localStorage.setItem(RESULT_KEY, serialized)
        window.localStorage.removeItem(DRAFT_KEY)
      } else {
        window.localStorage.setItem(DRAFT_KEY, serialized)
      }
    } catch (error) {
      throw new Error(
        `This browser could not save locally: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  loadLastResult(): NaturalSelectionResult | null {
    return this.readSafely(RESULT_KEY)
  }

  loadDraft(): NaturalSelectionResult | null {
    return this.readSafely(DRAFT_KEY)
  }

  private readSafely(key: string): NaturalSelectionResult | null {
    try {
      const serialized = window.localStorage.getItem(key)
      if (!serialized) return null
      return parseNaturalSelectionResult(serialized)
    } catch {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Gameplay remains available even when storage itself is unavailable.
      }
      return null
    }
  }
}

export const localResultSaver = new LocalResultSaver()
