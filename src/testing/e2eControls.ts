export type E2eControlEnvironment = {
  readonly DEV?: boolean
  readonly VITE_INTERACTION_QA?: string
}

const UINT32_MAX = 0xffff_ffff

function defaultSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search
}

/**
 * Production classroom builds must not honor URL test controls. A deliberately
 * built QA artifact can opt in with VITE_INTERACTION_QA=1; local Vite and
 * Playwright development runs stay enabled.
 */
export function isE2eControlBuild(
  environment: E2eControlEnvironment = import.meta.env,
): boolean {
  return environment.DEV === true || environment.VITE_INTERACTION_QA === '1'
}

export function e2eControlParams(
  search = defaultSearch(),
  environment: E2eControlEnvironment = import.meta.env,
): URLSearchParams | null {
  if (!isE2eControlBuild(environment)) return null
  const params = new URLSearchParams(search)
  return params.get('e2e') === '1' ? params : null
}

/**
 * Renderer overrides require the explicit QA switch in addition to the normal
 * local E2E harness switch. This keeps ad-hoc development URLs from changing
 * the renderer unless the caller intentionally requests diagnostics.
 */
export function interactionQaParams(
  search = defaultSearch(),
  environment: E2eControlEnvironment = import.meta.env,
): URLSearchParams | null {
  const params = e2eControlParams(search, environment)
  return params?.get('qa') === '1' ? params : null
}

/** Preserve the existing diagnostics-bridge behavior in local development. */
export function diagnosticsBridgeEnabled(
  search = defaultSearch(),
  environment: E2eControlEnvironment = import.meta.env,
): boolean {
  if (!isE2eControlBuild(environment)) return false
  const params = new URLSearchParams(search)
  return params.get('qa') === '1' || params.get('e2e') === '1'
}

export function readUnsignedE2eSeed(
  params: URLSearchParams | null,
  name: string,
): number | null {
  if (!params) return null
  const raw = params.get(name)
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 && value <= UINT32_MAX ? value : null
}
