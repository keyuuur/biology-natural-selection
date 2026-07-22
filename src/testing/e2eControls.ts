export type E2eControlEnvironment = {
  readonly DEV?: boolean
  readonly VITE_E2E_CONTROLS?: string
  readonly VITE_INTERACTION_QA?: string
}

const UINT32_MAX = 0xffff_ffff

function defaultSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search
}

/**
 * Production classroom and facilitator-preview builds must not honor URL test
 * controls. Local Vite/Playwright development runs stay enabled. An explicit
 * VITE_E2E_CONTROLS build is reserved for non-public automation only.
 */
export function isE2eControlBuild(
  environment: E2eControlEnvironment = import.meta.env,
): boolean {
  return environment.DEV === true || environment.VITE_E2E_CONTROLS === '1'
}

/** A facilitator preview can expose aggregate diagnostics without test hooks. */
function isFacilitatorQaBuild(environment: E2eControlEnvironment): boolean {
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

/**
 * The raw test bridge is available only to local/explicit E2E builds. A public
 * facilitator preview uses the in-page aggregate panel instead, so `?qa=1`
 * never exposes actor locations, morphs, seeds, or test hooks to students.
 */
export function diagnosticsBridgeEnabled(
  search = defaultSearch(),
  environment: E2eControlEnvironment = import.meta.env,
): boolean {
  if (!isE2eControlBuild(environment)) return false
  const params = new URLSearchParams(search)
  return params.get('qa') === '1'
}

/**
 * The facilitator panel is intentionally narrower than the internal bridge:
 * a QA-capable build and an explicit `?qa=1` URL are both required. Local
 * E2E runs may use `?e2e=1` without exposing extra classroom-facing chrome.
 */
export function facilitatorQaPanelEnabled(
  search = defaultSearch(),
  environment: E2eControlEnvironment = import.meta.env,
): boolean {
  if (!isFacilitatorQaBuild(environment)) return false
  return new URLSearchParams(search).get('qa') === '1'
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
