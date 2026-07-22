import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhaserControllerEvents, PhaserSceneController } from '../phaser/PhaserSceneController.ts'
import { diagnosticsWithClientCoordinates } from '../phaser/diagnosticsCoordinates.ts'
import { loadPhaserSceneController } from '../phaser/loadPhaserSceneController.ts'
import type { HabitatId, PlayerRoundMetrics } from '../simulation/index.ts'
import { HabitatGame } from './HabitatGame.tsx'

vi.mock('../phaser/loadPhaserSceneController.ts', () => ({
  loadPhaserSceneController: vi.fn(),
}))

const loadController = vi.mocked(loadPhaserSceneController)

type RoundSpec = {
  habitatId: HabitatId
  generation: number
  seed: number
}

const studyRounds: readonly RoundSpec[] = [
  { habitatId: 'reef_fish', generation: 1, seed: 11 },
  { habitatId: 'reef_fish', generation: 2, seed: 12 },
  { habitatId: 'reef_fish', generation: 3, seed: 13 },
  { habitatId: 'bark_moths', generation: 1, seed: 21 },
  { habitatId: 'bark_moths', generation: 2, seed: 22 },
  { habitatId: 'bark_moths', generation: 3, seed: 23 },
]

function countsFor(habitatId: HabitatId) {
  return habitatId === 'reef_fish'
    ? { camouflaged: 20, conspicuous: 20 }
    : { camouflaged: 20, conspicuous: 20 }
}

function roundProps(round: RoundSpec, onComplete: (metrics: PlayerRoundMetrics) => void) {
  return {
    active: true,
    habitatId: round.habitatId,
    habitatTitle: round.habitatId === 'reef_fish' ? 'Reef fish study' : 'Bark moth study',
    generation: round.generation,
    counts: countsFor(round.habitatId),
    roundSeed: round.seed,
    timingMode: 'standard' as const,
    durationMs: 25_000,
    movementScale: 1,
    hitAreaScale: 1,
    onComplete,
  }
}

function fakeController(): PhaserSceneController {
  return {
    prepareGeneration: vi.fn(),
    startGeneration: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    resize: vi.fn(),
    confirmCapture: vi.fn(),
    showEscape: vi.fn(),
    finishRound: vi.fn(),
    dispose: vi.fn(),
  } as unknown as PhaserSceneController
}

async function completeFallbackStudy(
  rerender: (ui: ReactNode) => void,
  onComplete: (metrics: PlayerRoundMetrics) => void,
  rounds: readonly RoundSpec[] = studyRounds,
): Promise<void> {
  for (const round of rounds) {
    rerender(<HabitatGame {...roundProps(round, onComplete)} />)
    await screen.findByTestId('dom-observation-fallback')
    fireEvent.click(screen.getByTestId('start-generation'))
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
  window.history.replaceState({}, '', '/')
})

describe('HabitatGame QA coordinate diagnostics', () => {
  it('keeps visual, hit, and patrol bounds in the same CSS coordinate space', () => {
    const canvas = {
      width: 400,
      height: 200,
      getBoundingClientRect: () => ({
        bottom: 150,
        height: 100,
        left: 100,
        right: 300,
        top: 50,
        width: 200,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLCanvasElement

    const result = diagnosticsWithClientCoordinates({
      actors: [{
        center: { x: 80, y: 60 },
        hitBounds: { x: 44, y: 36, width: 72, height: 48 },
        visualBounds: { x: 49, y: 45, width: 62, height: 30 },
        patrolBounds: { x: 30, y: 30, width: 120, height: 70 },
      }],
    }, canvas) as {
      actors: Array<Record<string, { x: number; y: number; width?: number; height?: number }>>
    }

    const actor = result.actors[0]!
    expect(actor.center).toEqual({ x: 140, y: 80 })
    expect(actor.hitBounds).toEqual({ x: 122, y: 68, width: 36, height: 24 })
    expect(actor.visualBounds).toEqual({ x: 124.5, y: 72.5, width: 31, height: 15 })
    expect(actor.patrolBounds).toEqual({ x: 115, y: 65, width: 60, height: 35 })
    expect(actor.canvasVisualBounds).toEqual({ x: 49, y: 45, width: 62, height: 30 })
  })
})

describe('HabitatGame facilitator diagnostics', () => {
  it('stays absent without the explicit QA query', async () => {
    const controller = fakeController()
    let events: PhaserControllerEvents | null = null
    loadController.mockImplementation(async (_host, nextEvents) => {
      events = nextEvents
      return controller
    })

    render(<HabitatGame {...roundProps(studyRounds[0], vi.fn())} />)
    await waitFor(() => expect(events).not.toBeNull())
    act(() => events?.onReady())

    expect(screen.queryByTestId('facilitator-qa-panel')).toBeNull()
  })

  it('shows a query-gated aggregate without changing round metrics when reset', async () => {
    window.history.replaceState({}, '', '?qa=1')
    const controller = fakeController()
    const diagnosticsController = controller as unknown as {
      getDiagnostics: () => Record<string, unknown>
    }
    diagnosticsController.getDiagnostics = () => ({
      controllerCount: 1,
      canvasCount: 1,
      actorCount: 40,
      duplicateRoundEndCount: 0,
      pauseReasons: [],
      frameMetrics: { averageFps: 60, p95FrameTimeMs: 17, framesOver50Ms: 0 },
    })
    let events: PhaserControllerEvents | null = null
    loadController.mockImplementation(async (_host, nextEvents) => {
      events = nextEvents
      return controller
    })

    render(<HabitatGame {...roundProps(studyRounds[0], vi.fn())} />)
    await waitFor(() => expect(events).not.toBeNull())
    act(() => events?.onReady())
    fireEvent.click(await screen.findByTestId('start-generation'))

    act(() => events?.onOrganismTapped({
      roundId: 'reef_fish:g1:s11',
      organismId: 'reef_fish:g1:s11:camouflaged:0',
      morphId: 'camouflaged',
      elapsedMs: 100,
    }))
    act(() => events?.onFeedbackLatency({
      roundId: 'reef_fish:g1:s11',
      outcome: 'caught',
      latencyMs: 12,
    }))
    act(() => events?.onMiss({ roundId: 'reef_fish:g1:s11', elapsedMs: 180 }))
    act(() => events?.onFeedbackLatency({
      roundId: 'reef_fish:g1:s11',
      outcome: 'miss',
      latencyMs: 16,
    }))

    expect(screen.getByTestId('facilitator-qa-panel').hasAttribute('open')).toBe(false)
    expect(screen.getByTestId('qa-caught-count').textContent).toContain('1')
    expect(screen.getByTestId('qa-miss-count').textContent).toContain('1')
    expect(screen.getByTestId('qa-latency-count').textContent).toContain('2')
    const roundHud = screen.getByLabelText('Round progress')
    expect(roundHud.textContent).toMatch(/caught\s*1 of 12/i)
    expect(roundHud.textContent).toMatch(/misses\s*1.*no penalty/i)

    fireEvent.click(screen.getByTestId('qa-reset'))

    expect(screen.getByTestId('qa-caught-count').textContent).toContain('0')
    expect(screen.getByTestId('qa-miss-count').textContent).toContain('0')
    expect(screen.getByTestId('qa-latency-count').textContent).toContain('0')
    expect(roundHud.textContent).toMatch(/caught\s*1 of 12/i)
    expect(roundHud.textContent).toMatch(/misses\s*1.*no penalty/i)
  })
})

describe('HabitatGame renderer recovery', () => {
  it.each([
    { round: studyRounds[0], camouflagedLabel: 'reef-matched pattern', conspicuousLabel: 'high-contrast pattern' },
    { round: studyRounds[3], camouflagedLabel: 'mottled bark pattern', conspicuousLabel: 'solid light pattern' },
  ])('uses the correct habitat labels in the renderer fallback', async ({ round, camouflagedLabel, conspicuousLabel }) => {
    loadController.mockRejectedValue(new Error('The renderer failed.'))
    render(<HabitatGame {...roundProps(round, vi.fn())} />)

    const fallback = await screen.findByTestId('dom-observation-fallback')
    expect(fallback.textContent).toContain(`20 ${camouflagedLabel}`)
    expect(fallback.textContent).toContain(`20 ${conspicuousLabel}`)
  })

  it('moves focus to the renderer fallback heading when graphics cannot load', async () => {
    loadController.mockRejectedValue(new Error('The renderer failed.'))
    render(<HabitatGame {...roundProps(studyRounds[0], vi.fn())} />)

    const fallback = await screen.findByTestId('dom-observation-fallback')
    const heading = within(fallback).getByRole('heading', { name: /reef fish study.*generation 1/i })
    await waitFor(() => expect(document.activeElement).toBe(heading))
    expect(heading.getAttribute('data-stage-heading')).toBe('')
    expect(heading.getAttribute('tabindex')).toBe('-1')
  })

  it.each([
    ['lazy import rejection', 'The Phaser module could not load.'],
    ['controller construction rejection', 'The Phaser controller could not start.'],
  ])('latches %s for a complete study and retries only after replay', async (_label, message) => {
    loadController.mockRejectedValue(new Error(message))
    const onComplete = vi.fn<(metrics: PlayerRoundMetrics) => void>()
    const view = render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)

    await completeFallbackStudy(view.rerender, onComplete)

    expect(loadController).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(6)
    for (const [metrics] of onComplete.mock.calls) {
      expect(metrics).toMatchObject({
        inputMode: 'observation',
        fallbackUsed: true,
        manualCatches: { camouflaged: 0, conspicuous: 0 },
      })
    }
    expect(document.querySelectorAll('.habitat-canvas-host canvas')).toHaveLength(0)

    view.unmount()
    render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)
    await screen.findByTestId('dom-observation-fallback')
    expect(loadController).toHaveBeenCalledTimes(2)
  })

  it('allows one fresh renderer attempt after a transient startup failure and replay', async () => {
    const recoveredController = fakeController()
    let recoveredEvents: PhaserControllerEvents | null = null
    loadController
      .mockRejectedValueOnce(new Error('The renderer failed before replay.'))
      .mockImplementationOnce(async (host, events) => {
        recoveredEvents = events
        host.append(document.createElement('canvas'))
        return recoveredController
      })
    const onComplete = vi.fn<(metrics: PlayerRoundMetrics) => void>()
    const firstStudy = render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)

    await screen.findByTestId('dom-observation-fallback')
    firstStudy.unmount()

    const replayStudy = render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)
    await waitFor(() => expect(recoveredEvents).not.toBeNull())
    await act(async () => {
      await Promise.resolve()
    })
    act(() => recoveredEvents?.onReady())

    await screen.findByTestId('start-generation')
    expect(loadController).toHaveBeenCalledTimes(2)
    expect(document.querySelectorAll('.habitat-canvas-host canvas')).toHaveLength(1)

    replayStudy.unmount()
    expect(recoveredController.dispose).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('.habitat-canvas-host canvas')).toHaveLength(0)
  })

  it('does not publish a startable round until a synchronously ready controller attaches', async () => {
    const controller = fakeController()
    loadController.mockImplementation(async (_host, events) => {
      // This mirrors Phaser announcing scene readiness during construction,
      // before the loader resolves the controller to HabitatGame.
      events.onReady()
      return controller
    })
    const onComplete = vi.fn<(metrics: PlayerRoundMetrics) => void>()
    render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)

    const start = await screen.findByTestId('start-generation')
    fireEvent.click(start)

    expect(controller.prepareGeneration).toHaveBeenCalledTimes(1)
    expect(controller.startGeneration).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('start-generation')).toBeNull()
  })

  it('latches a runtime renderer error, clears the controller, and avoids duplicate completion', async () => {
    let events: PhaserControllerEvents | null = null
    const controller = fakeController()
    loadController.mockImplementation(async (host, nextEvents) => {
      events = nextEvents
      host.append(document.createElement('canvas'))
      return controller
    })
    const onComplete = vi.fn<(metrics: PlayerRoundMetrics) => void>()
    const view = render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)

    await waitFor(() => expect(events).not.toBeNull())
    await act(async () => {
      await Promise.resolve()
    })
    act(() => events?.onReady())
    fireEvent.click(await screen.findByTestId('start-generation'))
    act(() =>
      events?.onOrganismTapped({
        roundId: 'reef_fish:g1:s11',
        organismId: 'reef_fish:g1:s11:camouflaged:0',
        morphId: 'camouflaged',
        elapsedMs: 100,
      }),
    )
    act(() => events?.onError('The renderer stopped.'))
    act(() => events?.onRoundEnd({ roundId: 'reef_fish:g1:s11' }))
    act(() => events?.onError('The renderer stopped again.'))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      inputMode: 'interactive',
      fallbackUsed: true,
      manualCatches: { camouflaged: 1, conspicuous: 0 },
    }))
    expect(controller.dispose).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('.habitat-canvas-host canvas')).toHaveLength(0)

    await completeFallbackStudy(view.rerender, onComplete, studyRounds.slice(1))
    expect(loadController).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(6)
    expect(document.querySelectorAll('.habitat-canvas-host canvas')).toHaveLength(0)
  })

  it('uses the readiness watchdog when a controller never becomes ready', async () => {
    vi.useFakeTimers()
    const controller = fakeController()
    loadController.mockResolvedValue(controller)
    const onComplete = vi.fn<(metrics: PlayerRoundMetrics) => void>()
    const view = render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)

    await act(async () => {
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })

    expect(screen.getByTestId('dom-observation-fallback')).not.toBeNull()
    expect(controller.dispose).toHaveBeenCalledTimes(1)
    // Focusing the fallback heading may leave one environment-level focus
    // task queued in JSDOM; flush it before asserting that the renderer itself
    // left no timers behind.
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
    await completeFallbackStudy(view.rerender, onComplete)
    expect(loadController).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(6)
  })

  it('does not let a delayed active-renderer frame reset a started round', async () => {
    const scheduledFrames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      scheduledFrames.push(callback)
      return scheduledFrames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})

    let events: PhaserControllerEvents | null = null
    const controller = fakeController()
    loadController.mockImplementation(async (_host, nextEvents) => {
      events = nextEvents
      return controller
    })
    const onComplete = vi.fn<(metrics: PlayerRoundMetrics) => void>()
    const view = render(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)

    await waitFor(() => expect(events).not.toBeNull())
    await act(async () => {
      await Promise.resolve()
    })
    act(() => events?.onReady())
    await screen.findByTestId('start-generation')

    view.rerender(<HabitatGame {...roundProps(studyRounds[0], onComplete)} active={false} />)
    view.rerender(<HabitatGame {...roundProps(studyRounds[0], onComplete)} />)
    expect(scheduledFrames).toHaveLength(1)
    const preparedBeforeStart = vi.mocked(controller.prepareGeneration).mock.calls.length

    fireEvent.click(screen.getByTestId('start-generation'))
    act(() => scheduledFrames[0]?.(0))
    act(() => events?.onReady())

    expect(controller.prepareGeneration).toHaveBeenCalledTimes(preparedBeforeStart)
    expect(screen.queryByTestId('start-generation')).toBeNull()
  })
})
