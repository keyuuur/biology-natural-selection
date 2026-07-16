import type { GameSession, DraftLoadResult, SessionDraftEnvelope } from '../game/sessionTypes.ts'
import { SESSION_DRAFT_SCHEMA_VERSION } from '../game/sessionTypes.ts'
import {
  parseNaturalSelectionResult,
  serializeNaturalSelectionResult,
  type NaturalSelectionResult,
} from '../simulation/index.ts'

const DRAFT_KEY = 'natural-selection:v2:session-draft'
const RESULT_KEY = 'natural-selection:v2:last-result'

function isGameSession(value: unknown): value is GameSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const stages = new Set([
    'mission', 'timing', 'habitat_intro', 'prediction', 'round',
    'generation_review', 'habitat_summary', 'evidence', 'checks', 'cer', 'results',
  ])
  const timingValid =
    record.selectedTimingMode === null ||
    record.selectedTimingMode === 'standard' ||
    record.selectedTimingMode === 'extended'
  const habitatValid =
    record.currentHabitatId === 'reef_fish' || record.currentHabitatId === 'bark_moths'
  const habitats = record.habitats as Record<string, unknown> | null

  function validProgress(habitatId: 'reef_fish' | 'bark_moths'): boolean {
    const progress = habitats?.[habitatId]
    if (typeof progress !== 'object' || progress === null || Array.isArray(progress)) return false
    const simulation = (progress as Record<string, unknown>).simulation
    if (typeof simulation !== 'object' || simulation === null || Array.isArray(simulation)) return false
    const state = simulation as Record<string, unknown>
    const counts = state.counts as Record<string, unknown> | null
    const generation = state.generation
    return (
      state.habitatId === habitatId &&
      Number.isInteger(generation) &&
      Number(generation) >= 0 &&
      Number(generation) <= 3 &&
      typeof counts === 'object' &&
      counts !== null &&
      Number.isInteger(counts.camouflaged) &&
      Number.isInteger(counts.conspicuous) &&
      Number(counts.camouflaged) + Number(counts.conspicuous) === 40 &&
      Array.isArray(state.history) &&
      state.history.length === generation
    )
  }

  return (
    typeof record.sessionId === 'string' &&
    Number.isInteger(record.seed) &&
    Number(record.seed) >= 0 &&
    Number(record.seed) <= 0xffff_ffff &&
    typeof record.startedAt === 'string' && !Number.isNaN(Date.parse(record.startedAt)) &&
    typeof record.stage === 'string' && stages.has(record.stage) &&
    timingValid && habitatValid &&
    validProgress('reef_fish') && validProgress('bark_moths') &&
    typeof record.predictions === 'object' &&
    record.predictions !== null &&
    typeof record.evidence === 'object' && record.evidence !== null &&
    Array.isArray(record.misconceptionChecks) &&
    Number.isInteger(record.currentCheckIndex) &&
    typeof record.cer === 'object' && record.cer !== null &&
    typeof record.performance === 'object' && record.performance !== null
  )
}

function forcedFailure(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.get('e2e') === '1' && params.get('e2eStorage') === 'fail'
}

export class LocalResultSaver {
  saveDraft(session: GameSession): void {
    const envelope: SessionDraftEnvelope = {
      schemaVersion: SESSION_DRAFT_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      session: { ...session, completedResult: null },
    }
    this.write(DRAFT_KEY, JSON.stringify(envelope))
  }

  loadDraft(): DraftLoadResult {
    try {
      const serialized = this.read(DRAFT_KEY)
      if (!serialized) return { status: 'none' }
      const parsed = JSON.parse(serialized) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('The saved study is not a valid object.')
      }
      const envelope = parsed as Record<string, unknown>
      if (envelope.schemaVersion !== SESSION_DRAFT_SCHEMA_VERSION) {
        throw new Error('The saved study uses an older format.')
      }
      if (typeof envelope.savedAt !== 'string' || Number.isNaN(Date.parse(envelope.savedAt))) {
        throw new Error('The saved study is missing a valid timestamp.')
      }
      if (!isGameSession(envelope.session)) {
        throw new Error('The saved study is incomplete.')
      }
      return {
        status: 'valid',
        draft: {
          schemaVersion: SESSION_DRAFT_SCHEMA_VERSION,
          savedAt: envelope.savedAt,
          session: envelope.session,
        },
      }
    } catch (error) {
      try {
        window.localStorage.removeItem(DRAFT_KEY)
      } catch {
        // The game still starts from a fresh in-memory session.
      }
      if (forcedFailure()) {
        return {
          status: 'unavailable',
          message: 'Local storage is unavailable. This study can continue but cannot be resumed.',
        }
      }
      return {
        status: 'discarded',
        message: error instanceof Error ? error.message : 'The saved study could not be restored.',
      }
    }
  }

  clearDraft(): void {
    try {
      if (forcedFailure()) throw new Error('Storage failure requested for testing.')
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      // Clearing a draft is best-effort and must never block a new study.
    }
  }

  saveResult(result: NaturalSelectionResult): void {
    this.write(RESULT_KEY, serializeNaturalSelectionResult(result))
    this.clearDraft()
  }

  loadLastResult(): NaturalSelectionResult | null {
    try {
      const serialized = this.read(RESULT_KEY)
      return serialized ? parseNaturalSelectionResult(serialized) : null
    } catch {
      return null
    }
  }

  private write(key: string, value: string): void {
    try {
      if (forcedFailure()) throw new Error('Storage failure requested for testing.')
      window.localStorage.setItem(key, value)
    } catch (error) {
      throw new Error(
        `This browser could not save locally: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private read(key: string): string | null {
    if (forcedFailure()) throw new Error('Storage failure requested for testing.')
    return window.localStorage.getItem(key)
  }
}

export const localResultSaver = new LocalResultSaver()
