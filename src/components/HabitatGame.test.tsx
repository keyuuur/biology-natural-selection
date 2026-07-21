import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhaserControllerEvents, PhaserSceneController } from '../phaser/PhaserSceneController.ts'
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
})

describe('HabitatGame renderer recovery', () => {
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
