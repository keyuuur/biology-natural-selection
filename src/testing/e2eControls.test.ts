import { describe, expect, it } from 'vitest'
import {
  diagnosticsBridgeEnabled,
  e2eControlParams,
  facilitatorQaPanelEnabled,
  interactionQaParams,
  isE2eControlBuild,
  readUnsignedE2eSeed,
} from './e2eControls.ts'

describe('local E2E control gates', () => {
  it('keeps development and explicitly built non-public E2E artifacts enabled', () => {
    expect(isE2eControlBuild({ DEV: true })).toBe(true)
    const e2eBuild = { DEV: false, VITE_E2E_CONTROLS: '1' }
    expect(isE2eControlBuild(e2eBuild)).toBe(true)
    expect(e2eControlParams('?e2e=1&e2eRoundMs=100', e2eBuild)?.get('e2eRoundMs')).toBe('100')
  })

  it('ignores all E2E URL controls in a normal production build', () => {
    const production = { DEV: false, VITE_INTERACTION_QA: undefined }
    expect(e2eControlParams('?e2e=1&e2eRoundMs=100&e2eSeed=101', production)).toBeNull()
    expect(interactionQaParams('?e2e=1&qa=1&e2ePlacementSeed=101', production)).toBeNull()
    expect(diagnosticsBridgeEnabled('?e2e=1&qa=1', production)).toBe(false)
    expect(facilitatorQaPanelEnabled('?qa=1', production)).toBe(false)
  })

  it('shows the facilitator panel only for an explicitly requested QA URL', () => {
    const qaBuild = { DEV: false, VITE_INTERACTION_QA: '1' }
    expect(isE2eControlBuild(qaBuild)).toBe(false)
    expect(e2eControlParams('?e2e=1&e2eRoundMs=100&e2eRenderer=fail', qaBuild)).toBeNull()
    expect(interactionQaParams('?e2e=1&qa=1&e2ePlacementSeed=101', qaBuild)).toBeNull()
    expect(diagnosticsBridgeEnabled('?qa=1', qaBuild)).toBe(false)
    expect(facilitatorQaPanelEnabled('', qaBuild)).toBe(false)
    expect(facilitatorQaPanelEnabled('?qa=1', qaBuild)).toBe(true)
    expect(facilitatorQaPanelEnabled('?e2e=1', { DEV: true })).toBe(false)
    expect(facilitatorQaPanelEnabled('?qa=1', { DEV: true })).toBe(true)
  })

  it('requires both E2E and QA switches for renderer overrides', () => {
    const development = { DEV: true }
    expect(interactionQaParams('?e2e=1&qa=1&e2ePlacementSeed=101', development)?.get('e2ePlacementSeed'))
      .toBe('101')
    expect(interactionQaParams('?e2e=1&e2ePlacementSeed=101', development)).toBeNull()
    expect(interactionQaParams('?qa=1&e2ePlacementSeed=101', development)).toBeNull()
  })

  it('accepts only unsigned 32-bit renderer seed overrides', () => {
    const params = interactionQaParams('?e2e=1&qa=1&e2ePlacementSeed=101', { DEV: true })
    expect(readUnsignedE2eSeed(params, 'e2ePlacementSeed')).toBe(101)
    expect(readUnsignedE2eSeed(new URLSearchParams('e2ePlacementSeed=-1'), 'e2ePlacementSeed')).toBeNull()
    expect(readUnsignedE2eSeed(new URLSearchParams('e2ePlacementSeed=4294967296'), 'e2ePlacementSeed')).toBeNull()
    expect(readUnsignedE2eSeed(new URLSearchParams('e2ePlacementSeed=1.5'), 'e2ePlacementSeed')).toBeNull()
  })
})
