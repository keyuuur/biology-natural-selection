import { expect, type Page, type TestInfo } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const interactionScreenshotDirectory = path.resolve(
  process.cwd(),
  'test-results',
  'interaction-screenshots',
)

const stableScreenshotNames: Record<string, string> = {
  'interaction-active-catches-and-miss-portrait': '01-active-play-portrait.png',
  'interaction-active-catches-and-miss-landscape': '02-active-play-landscape.png',
  'interaction-manual-resolving-portrait': '03-resolving-overlay-portrait.png',
  'interaction-manual-resolving-landscape': '04-resolving-overlay-landscape.png',
}

export type QaActorTarget = {
  id: string
  morphId: 'camouflaged' | 'conspicuous'
  center: { x: number; y: number }
  hitBounds: { x: number; y: number; width: number; height: number }
  velocity?: { x: number; y: number }
  landed?: boolean
  locked?: boolean
  profileId: string
  assignedSpeedPxPerSecond: number
  patrolSpanPx: number
  maxContinuousBlockedMs: number
}

export type InteractionQaSnapshot = {
  roundState: 'loading' | 'ready' | 'running' | 'paused' | 'resolving' | 'fallback'
  actors: QaActorTarget[]
  controllerCount: number
  createdControllerCount: number
  canvasCount: number
  documentCanvasCount: number
  animationLoopCount: number
  resizeObserverCount: number
  controllerListenerCount: number
  actorCount: number
  tweenCount: number
  timerCount: number
  listenerCount: number
  pauseReasons: string[]
  reducedMotion: boolean
  remainingMs: number
  latestFeedbackLatencyMs: number | null
  frameMetrics: {
    averageFps: number
    medianFrameTimeMs: number
    p95FrameTimeMs: number
    framesOver50Ms: number
    sampledFrames: number
  }
  duplicateRoundEndCount: number
  manualCatches: number
  misses: number
  protectedAttempts: number
}

type QaWindow = Window & {
  __NS_INTERACTION_QA__?: {
    snapshot(): InteractionQaSnapshot
  }
}

export async function qaSnapshot(page: Page): Promise<InteractionQaSnapshot> {
  return page.evaluate(() => {
    const bridge = (window as QaWindow).__NS_INTERACTION_QA__
    if (!bridge) throw new Error('The interaction QA bridge is unavailable.')
    return bridge.snapshot()
  })
}

export async function waitForQaState(
  page: Page,
  state: InteractionQaSnapshot['roundState'],
) {
  await expect
    .poll(async () => page.evaluate(() => {
      const bridge = (window as QaWindow).__NS_INTERACTION_QA__
      return bridge?.snapshot().roundState ?? null
    }), {
      message: `waiting for QA round state ${state}`,
    })
    .toBe(state)
  return qaSnapshot(page)
}

export async function startGenerationByTouch(page: Page) {
  const start = page.getByTestId('start-generation')
  await expect(start).toBeEnabled()
  const box = await start.boundingBox()
  expect(box, 'Start button must have a touchable box.').not.toBeNull()
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2)
  return waitForQaState(page, 'running')
}

export async function tapActor(
  page: Page,
  options: { morphId?: QaActorTarget['morphId']; id?: string } = {},
) {
  const before = await qaSnapshot(page)
  const actor = before.actors.find(
    (candidate) =>
      !candidate.locked &&
      (!options.morphId || candidate.morphId === options.morphId) &&
      (!options.id || candidate.id === options.id),
  )
  expect(actor, `No tappable actor matched ${JSON.stringify(options)}.`).toBeTruthy()

  await page.touchscreen.tap(actor!.center.x, actor!.center.y)
  await expect
    .poll(async () => {
      const after = await qaSnapshot(page)
      return after.roundState === 'resolving' || !after.actors.some(({ id }) => id === actor!.id)
    }, { message: `waiting for ${actor!.id} to be captured` })
    .toBe(true)
  return actor!
}

export async function tapActors(
  page: Page,
  count: number,
  morphId?: QaActorTarget['morphId'],
) {
  const tapped: QaActorTarget[] = []
  for (let index = 0; index < count; index += 1) {
    tapped.push(await tapActor(page, { morphId }))
  }
  return tapped
}

export async function findBlankCanvasPoint(page: Page) {
  const canvas = page.locator('canvas')
  const box = await canvas.boundingBox()
  expect(box, 'Canvas must have a visible box.').not.toBeNull()
  const { actors } = await qaSnapshot(page)
  const containsActor = (x: number, y: number) =>
    actors.some(({ hitBounds }) =>
      x >= hitBounds.x &&
      x <= hitBounds.x + hitBounds.width &&
      y >= hitBounds.y &&
      y <= hitBounds.y + hitBounds.height,
    )

  for (let row = 1; row < 20; row += 1) {
    for (let column = 1; column < 20; column += 1) {
      const x = box!.x + (box!.width * column) / 20
      const y = box!.y + (box!.height * row) / 20
      if (!containsActor(x, y)) return { x, y }
    }
  }
  throw new Error('No blank canvas point was available for the miss test.')
}

export async function clearFocusAndCapture(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await mkdir(interactionScreenshotDirectory, { recursive: true })
  const filename = stableScreenshotNames[name] ?? `${name}.png`
  const screenshotPath = path.join(interactionScreenshotDirectory, filename)
  await page.screenshot({ path: screenshotPath, fullPage: false })
  await testInfo.attach(`${name}.png`, { path: screenshotPath, contentType: 'image/png' })
}

export function expectOneRenderer(snapshot: InteractionQaSnapshot) {
  expect(snapshot.controllerCount).toBe(1)
  expect(snapshot.canvasCount).toBe(1)
  expect(snapshot.documentCanvasCount).toBe(1)
  expect(snapshot.animationLoopCount).toBe(1)
  expect(snapshot.resizeObserverCount).toBe(1)
  expect(snapshot.controllerListenerCount).toBe(2)
  expect(snapshot.actorCount).toBe(snapshot.actors.length)
  expect(snapshot.duplicateRoundEndCount).toBe(0)
}

export function expectNoEligibleActorOverlap(snapshot: InteractionQaSnapshot) {
  const eligible = snapshot.actors.filter(({ locked }) => !locked)
  for (let first = 0; first < eligible.length; first += 1) {
    for (let second = first + 1; second < eligible.length; second += 1) {
      const one = eligible[first]!.hitBounds
      const two = eligible[second]!.hitBounds
      const overlaps = one.x < two.x + two.width &&
        one.x + one.width > two.x &&
        one.y < two.y + two.height &&
        one.y + one.height > two.y
      expect(overlaps, `${eligible[first]!.id} overlaps ${eligible[second]!.id}`).toBe(false)
    }
  }
}
