import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CerClaimChoice } from '../learning/index.ts'
import { CER_FIELD_REPORT_FORM_ID, CerScreen } from './CerScreen.tsx'

const claims: readonly CerClaimChoice[] = [
  {
    id: 'supported',
    text: 'The inherited pattern changed in the population across generations.',
    isSupported: true,
    feedback: 'This matches the data.',
  },
  {
    id: 'unsupported',
    text: 'Every individual changed its own pattern.',
    isSupported: false,
    feedback: 'Individuals did not change their inherited pattern.',
  },
]

const evidenceItems = [
  { id: 'reef-g0', label: 'Reef fish, Generation 0', text: '20 camouflaged and 20 conspicuous fish.' },
  { id: 'reef-g3', label: 'Reef fish, Generation 3', text: 'Later fish population percentages.' },
  { id: 'moth-g0', label: 'Bark moths, Generation 0', text: '20 camouflaged and 20 conspicuous moths.' },
  { id: 'moth-g3', label: 'Bark moths, Generation 3', text: 'Later moth population percentages.' },
  { id: 'comparison', label: 'Survival and reproduction comparison', text: 'Survivors produced offspring.' },
] as const

afterEach(cleanup)

let originalVisualViewport: PropertyDescriptor | undefined

beforeEach(() => {
  originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
})

afterEach(() => {
  if (originalVisualViewport) {
    Object.defineProperty(window, 'visualViewport', originalVisualViewport)
  } else {
    Reflect.deleteProperty(window, 'visualViewport')
  }
})

type MockVisualViewport = EventTarget & { width: number; height: number }

function installVisualViewport(width = 820, height = 1_000): MockVisualViewport {
  const viewport = new EventTarget() as MockVisualViewport
  viewport.width = width
  viewport.height = height
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  })
  return viewport
}

describe('CerScreen', () => {
  it('keeps the five evidence observations labeled and exposes an external form target', () => {
    render(
      <CerScreen
        claims={claims}
        evidenceItems={evidenceItems}
        initialDraft={{ claimId: null, reasoning: '' }}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('cer-evidence-bank').querySelectorAll('li')).toHaveLength(5)
    expect(screen.getByText('Reef fish, Generation 0')).toBeTruthy()
    expect(screen.getByText('Survival and reproduction comparison')).toBeTruthy()
    expect(document.getElementById(CER_FIELD_REPORT_FORM_ID)?.tagName).toBe('FORM')
    expect(screen.getByText('Three steps to complete your field report').parentElement?.querySelectorAll('li')).toHaveLength(3)
  })

  it('keeps the 40-character reasoning gate when an external dock reads its state', () => {
    const onComplete = vi.fn()
    let lastDockState: { canComplete: boolean; reasoningLength: number } | null = null
    render(
      <CerScreen
        claims={claims}
        evidenceItems={evidenceItems}
        initialDraft={{ claimId: null, reasoning: '' }}
        onComplete={onComplete}
        renderActionDock={(state) => {
          lastDockState = state
          return <span data-testid="dock-state">{state.canComplete ? 'ready' : 'not-ready'}</span>
        }}
      />,
    )

    fireEvent.click(screen.getByTestId('cer-claim-population-change'))
    fireEvent.change(screen.getByTestId('cer-reasoning'), {
      target: { value: 'Inherited variation affected survival and reproduction across generations.' },
    })

    expect(screen.getByTestId('dock-state').textContent).toBe('ready')
    expect(lastDockState).toMatchObject({ canComplete: true })
    fireEvent.submit(document.getElementById(CER_FIELD_REPORT_FORM_ID)!)
    expect(onComplete).toHaveBeenCalledWith({
      claimId: 'supported',
      reasoning: 'Inherited variation affected survival and reproduction across generations.',
    })
  })

  it('swaps the dock for one in-flow submit action when the visual viewport shrinks', () => {
    const viewport = installVisualViewport()
    const onComplete = vi.fn()
    render(
      <CerScreen
        claims={claims}
        evidenceItems={evidenceItems}
        initialDraft={{ claimId: null, reasoning: '' }}
        onComplete={onComplete}
        renderActionDock={() => <button data-testid="cer-dock">Complete the field report</button>}
      />,
    )

    expect(screen.getByTestId('cer-dock')).toBeTruthy()
    expect(screen.queryByTestId('primary-action')).toBeNull()
    expect(screen.queryByTestId('cer-keyboard-submit')).toBeNull()

    fireEvent.click(screen.getByTestId('cer-claim-population-change'))
    fireEvent.change(screen.getByTestId('cer-reasoning'), {
      target: { value: 'Inherited variation affected survival and reproduction across generations.' },
    })
    act(() => {
      viewport.height = 760
      viewport.dispatchEvent(new Event('resize'))
    })

    expect(screen.queryByTestId('cer-dock')).toBeNull()
    const keyboardSubmit = screen.getByTestId('cer-keyboard-submit')
    expect((keyboardSubmit as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(keyboardSubmit)
    expect(onComplete).toHaveBeenCalledWith({
      claimId: 'supported',
      reasoning: 'Inherited variation affected survival and reproduction across generations.',
    })
  })
})
