import { expect, test } from '@playwright/test'
import {
  clearFocusAndCapture,
  expectNoEligibleActorOverlap,
  expectOneRenderer,
  findBlankCanvasPoint,
  qaSnapshot,
  startGenerationByTouch,
  tapActor,
  tapActors,
  waitForQaState,
} from './interaction-support'
import {
  LANDSCAPE,
  PORTRAIT,
  chooseTiming,
  completeCer,
  completeMisconceptions,
  playHabitat,
  selectRequiredEvidence,
  submitPrediction,
  testUrl,
} from './support'

async function openInteractiveRound(
  page: Parameters<typeof chooseTiming>[0],
  options: {
    seed: string
    mode?: 'Standard' | 'Extended'
    roundMs?: number
  },
) {
  await page.goto(testUrl({
    seed: options.seed,
    qa: true,
    // Browser screenshots and diagnostic polling are intentionally much slower
    // than a student's taps. A long test-only clock prevents automation work
    // from being mistaken for a production timer failure.
    roundMs: options.roundMs ?? 120_000,
  }))
  await chooseTiming(page, options.mode ?? 'Standard')
  await submitPrediction(page, 'reef_fish')
  await expect(page.getByTestId('start-generation')).toBeEnabled({ timeout: 30_000 })
  const ready = await waitForQaState(page, 'ready')
  expectOneRenderer(ready)
}

test.describe('Natural Selection direct-touch interaction polish', () => {
  test('12 real touch catches finish early with no modeled captures @webkit', async ({ page }, testInfo) => {
    await openInteractiveRound(page, { seed: 'touch-manual-success' })
    const initial = await startGenerationByTouch(page)
    expect(initial.actors).toHaveLength(40)
    expect(Math.min(...initial.actors.map(({ assignedSpeedPxPerSecond }) => assignedSpeedPxPerSecond))).toBeGreaterThanOrEqual(26)
    expect(Math.max(...initial.actors.map(({ assignedSpeedPxPerSecond }) => assignedSpeedPxPerSecond))).toBeLessThanOrEqual(46)
    expect(Math.min(...initial.actors.map(({ patrolSpanPx }) => patrolSpanPx))).toBeGreaterThanOrEqual(64)
    expect(initial.actors.every(({ hitBounds }) => hitBounds.width === 72 && hitBounds.height === 48)).toBe(true)
    expectNoEligibleActorOverlap(initial)

    await tapActors(page, 3)
    const blankPoint = await findBlankCanvasPoint(page)
    await page.touchscreen.tap(blankPoint.x, blankPoint.y)
    await expect(page.getByText(/misses\s*1.*no penalty/i)).toBeVisible()
    await clearFocusAndCapture(page, testInfo, 'interaction-active-catches-and-miss-portrait')
    await page.setViewportSize(LANDSCAPE)
    await expect.poll(async () => (await qaSnapshot(page)).pauseReasons).not.toContain('resize')
    await page.waitForTimeout(200)
    expectNoEligibleActorOverlap(await qaSnapshot(page))
    await clearFocusAndCapture(page, testInfo, 'interaction-active-catches-and-miss-landscape')
    await page.setViewportSize(PORTRAIT)
    await expect.poll(async () => (await qaSnapshot(page)).pauseReasons).not.toContain('resize')
    await page.waitForTimeout(200)

    await tapActors(page, 8)
    const beforeFinal = await qaSnapshot(page)
    expect(beforeFinal.actorCount).toBe(29)
    await tapActor(page)
    await expect(
      page.locator('.habitat-start-overlay').getByText(
        /12 of 12 caught.*calculating survivors and offspring/i,
      ),
    ).toBeVisible()
    await clearFocusAndCapture(page, testInfo, 'interaction-manual-resolving-portrait')

    const summary = page.getByTestId('generation-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText(/12 by you/i)
    await expect(summary).toContainText(/0 modeled/i)
    const resolved = await qaSnapshot(page)
    expect(resolved.duplicateRoundEndCount).toBe(0)
    expect(resolved.latestFeedbackLatencyMs).not.toBeNull()
    expect(resolved.latestFeedbackLatencyMs!).toBeGreaterThanOrEqual(0)
    expect(resolved.latestFeedbackLatencyMs!).toBeLessThanOrEqual(100)
  })

  test('captures the resolving overlay in landscape @screenshots', async ({ page }, testInfo) => {
    test.skip(
      process.env.CAPTURE_INTERACTION_SCREENSHOTS !== '1',
      'Set CAPTURE_INTERACTION_SCREENSHOTS=1 to refresh the landscape resolving artifact.',
    )
    await page.setViewportSize(LANDSCAPE)
    await openInteractiveRound(page, { seed: 'touch-landscape-resolving' })
    await startGenerationByTouch(page)
    await tapActors(page, 12)
    await expect(
      page.locator('.habitat-start-overlay').getByText(
        /12 of 12 caught.*calculating survivors and offspring/i,
      ),
    ).toBeVisible()
    await clearFocusAndCapture(page, testInfo, 'interaction-manual-resolving-landscape')
  })

  test('targeting camouflage reverses the evidence and exposes the parent floor', async ({ page }) => {
    await openInteractiveRound(page, { seed: 'touch-student-agency' })
    await startGenerationByTouch(page)
    await tapActors(page, 12, 'camouflaged')

    const firstSummary = page.getByTestId('generation-summary')
    await expect(firstSummary).toBeVisible()
    await expect(firstSummary).toContainText(/12 by you/i)
    await expect(firstSummary).toContainText(/8 of 20 survived/i)
    await expect(firstSummary).toContainText(/11 mottled.*29 solid/i)

    await page.getByTestId('continue-generation').click()
    await startGenerationByTouch(page)
    const secondStart = await qaSnapshot(page)
    expect(secondStart.actors.filter(({ morphId }) => morphId === 'camouflaged')).toHaveLength(11)

    await tapActors(page, 8, 'camouflaged')
    const protectedTarget = (await qaSnapshot(page)).actors.find(
      ({ morphId, locked }) => morphId === 'camouflaged' && !locked,
    )
    expect(protectedTarget).toBeTruthy()
    await page.touchscreen.tap(protectedTarget!.center.x, protectedTarget!.center.y)
    await expect(page.getByText(/model-protected\s*1/i)).toBeVisible()
    await expect(page.getByText(/protected for comparison.*enough parents must remain/i)).toHaveCount(1)

    const protectedSnapshot = await qaSnapshot(page)
    expect(
      protectedSnapshot.actors.find(({ id }) => id === protectedTarget!.id)?.locked,
    ).toBe(true)
    await page.touchscreen.tap(protectedTarget!.center.x, protectedTarget!.center.y)
    await expect(page.getByText(/model-protected\s*1/i)).toBeVisible()
    expect((await qaSnapshot(page)).actorCount).toBe(32)
  })

  test('miss, rapid repeat, extended hit areas, and rotation remain reliable @webkit', async ({ page }) => {
    await openInteractiveRound(page, {
      seed: 'touch-extended-rotation',
      mode: 'Extended',
    })
    const running = await startGenerationByTouch(page)
    const firstBounds = running.actors[0].hitBounds
    expect(firstBounds.width).toBeCloseTo(72 * 1.2, 1)
    expect(firstBounds.height).toBeCloseTo(48 * 1.2, 1)

    const blankPoint = await findBlankCanvasPoint(page)
    await page.touchscreen.tap(blankPoint.x, blankPoint.y)
    await expect(page.getByText(/misses\s*1.*no penalty/i)).toBeVisible()

    const target = (await qaSnapshot(page)).actors[0]
    await Promise.all([
      page.touchscreen.tap(target.center.x, target.center.y),
      page.touchscreen.tap(target.center.x, target.center.y),
    ])
    await expect.poll(async () => (await qaSnapshot(page)).actorCount).toBeLessThan(40)
    const afterRapidTaps = await qaSnapshot(page)
    expect(afterRapidTaps.actors.some(({ id }) => id === target.id)).toBe(false)
    expect(afterRapidTaps.manualCatches).toBe(1)
    await expect(page.getByText(/caught\s*1 of 12/i)).toBeVisible()

    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      PORTRAIT,
      LANDSCAPE,
    ]) {
      await page.setViewportSize(viewport)
      await expect(page.locator('canvas')).toHaveCount(1)
      await expect.poll(async () => {
        const snapshot = await qaSnapshot(page)
        const box = await page.locator('canvas').boundingBox()
        if (!box || snapshot.pauseReasons.includes('resize')) return false
        const tolerance = 2
        return snapshot.actors.every((actor) =>
          actor.hitBounds.x >= box.x - tolerance &&
          actor.hitBounds.x + actor.hitBounds.width <= box.x + box.width + tolerance &&
          actor.hitBounds.y >= box.y - tolerance &&
          actor.hitBounds.y + actor.hitBounds.height <= box.y + box.height + tolerance,
        )
      }, { message: `waiting for the ${viewport.width}x${viewport.height} habitat remap` }).toBe(true)
      const afterRotation = await qaSnapshot(page)
      expectOneRenderer(afterRotation)
      const canvasBox = await page.locator('canvas').boundingBox()
      expect(canvasBox).not.toBeNull()
      for (const actor of afterRotation.actors) {
        const tolerance = 2
        expect(actor.hitBounds.x).toBeGreaterThanOrEqual(canvasBox!.x - tolerance)
        expect(actor.hitBounds.x + actor.hitBounds.width).toBeLessThanOrEqual(
          canvasBox!.x + canvasBox!.width + tolerance,
        )
        expect(actor.hitBounds.y).toBeGreaterThanOrEqual(canvasBox!.y - tolerance)
        expect(actor.hitBounds.y + actor.hitBounds.height).toBeLessThanOrEqual(
          canvasBox!.y + canvasBox!.height + tolerance,
        )
      }
    }
    const edgeTarget = (await qaSnapshot(page)).actors.find(({ locked }) => !locked)
    expect(edgeTarget).toBeTruthy()
    await page.touchscreen.tap(
      edgeTarget!.hitBounds.x + edgeTarget!.hitBounds.width * 0.08,
      edgeTarget!.center.y,
    )
    await expect.poll(async () =>
      (await qaSnapshot(page)).actors.some(({ id }) => id === edgeTarget!.id),
    ).toBe(false)
    await expect(page.getByText(/caught\s*2 of 12/i)).toBeVisible()
  })

  test('visibility pause freezes the round until the student resumes', async ({ page }) => {
    await openInteractiveRound(page, { seed: 'touch-pause-resume' })
    await startGenerationByTouch(page)

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const paused = await waitForQaState(page, 'paused')
    expect(paused.pauseReasons).toEqual(expect.arrayContaining(['blur', 'visibility']))
    const pausedRemaining = paused.remainingMs
    await page.waitForTimeout(600)
    expect(Math.abs((await qaSnapshot(page)).remainingMs - pausedRemaining)).toBeLessThan(20)

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect((await qaSnapshot(page)).roundState).toBe('paused')
    const resume = page.getByTestId('resume-generation')
    await expect(resume).toBeVisible()
    await resume.click()
    const resumed = await waitForQaState(page, 'running')
    expect(resumed.pauseReasons).not.toContain('blur')
    expect(resumed.pauseReasons).not.toContain('visibility')
    await expect.poll(async () => (await qaSnapshot(page)).remainingMs).toBeLessThan(pausedRemaining)
  })

  test('reduced motion keeps the live renderer tappable with static vertical motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openInteractiveRound(page, { seed: 'touch-reduced-motion' })
    const snapshot = await startGenerationByTouch(page)
    expectOneRenderer(snapshot)
    expect(snapshot.reducedMotion).toBe(true)
    const initialY = new Map(snapshot.actors.map((actor) => [actor.id, actor.center.y]))
    await page.waitForTimeout(350)
    const afterMovement = await qaSnapshot(page)
    for (const actor of snapshot.actors) {
      if (actor.velocity) expect(actor.velocity.y).toBe(0)
    }
    for (const actor of afterMovement.actors) {
      expect(actor.center.y).toBeCloseTo(initialY.get(actor.id)!, 4)
    }
    expect(afterMovement.tweenCount).toBe(0)
    await tapActor(page)
    await expect(page.getByText(/caught\s*1 of 12/i)).toBeVisible()
    expect((await qaSnapshot(page)).roundState).toBe('running')
  })

  test('bark moths remain tappable in the live renderer', async ({ page }) => {
    await page.goto(testUrl({ seed: 'touch-bark-moths', qa: true, roundMs: 350 }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')

    for (const generation of [1, 2, 3]) {
      await waitForQaState(page, 'ready')
      await startGenerationByTouch(page)
      await expect(page.getByTestId('generation-summary')).toHaveAttribute(
        'data-generation',
        String(generation),
      )
      if (generation < 3) await page.getByTestId('continue-generation').click()
    }

    await page.getByTestId('primary-action').click()
    await page.getByTestId('primary-action').click()
    await submitPrediction(page, 'bark_moths')
    const ready = await waitForQaState(page, 'ready')
    expectOneRenderer(ready)
    expect(ready.actors).toHaveLength(40)
    await startGenerationByTouch(page)
    await tapActor(page)
    await expect(page.getByText(/caught\s*1 of 12/i)).toBeVisible()
  })

  test('one renderer survives three generation transitions without duplicate completion', async ({ page }) => {
    await page.goto(testUrl({ seed: 'touch-cleanup', qa: true, roundMs: 350 }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')

    let baselineListeners: number | null = null
    for (const generation of [1, 2, 3]) {
      const ready = await waitForQaState(page, 'ready')
      expectOneRenderer(ready)
      expect(ready.actorCount).toBe(40)
      baselineListeners ??= ready.listenerCount
      expect(ready.listenerCount).toBe(baselineListeners)

      await startGenerationByTouch(page)
      await expect(page.getByTestId('generation-summary')).toHaveAttribute(
        'data-generation',
        String(generation),
      )
      const ended = await qaSnapshot(page)
      expect(ended.controllerCount).toBe(1)
      expect(ended.canvasCount).toBe(1)
      expect(ended.duplicateRoundEndCount).toBe(0)
      expect(ended.tweenCount).toBe(0)

      if (generation < 3) await page.getByTestId('continue-generation').click()
    }

    await page.setViewportSize(PORTRAIT)
    await expect(page.locator('canvas')).toHaveCount(1)
  })

  test('60-second full-density renderer sample stays measurable @soak', async ({ page }) => {
    test.skip(process.env.RUN_INTERACTION_SOAK !== '1', 'Set RUN_INTERACTION_SOAK=1 for the long renderer sample.')
    await openInteractiveRound(page, {
      seed: 'touch-performance-soak',
      roundMs: 60_000,
    })
    await startGenerationByTouch(page)
    await page.waitForTimeout(60_000)
    await expect(page.getByTestId('generation-summary')).toBeVisible()
    const metrics = (await qaSnapshot(page)).frameMetrics
    expect(metrics.averageFps).toBeGreaterThanOrEqual(30)
    expect(metrics.p95FrameTimeMs).toBeLessThanOrEqual(50)
  })

  test('three accelerated studies leave one active renderer without progressive slowdown @soak', async ({ page }) => {
    test.skip(process.env.RUN_INTERACTION_SOAK !== '1', 'Set RUN_INTERACTION_SOAK=1 for the lifecycle soak.')
    test.setTimeout(300_000)
    await page.goto(testUrl({ seed: 'touch-three-study-soak', qa: true, roundMs: 100 }))

    let baselineListeners: number | null = null
    const averageFps: number[] = []
    for (let study = 1; study <= 3; study += 1) {
      await chooseTiming(page, 'Standard')
      await submitPrediction(page, 'reef_fish')
      await playHabitat(page)
      await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
      await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()
      await submitPrediction(page, 'bark_moths')
      await playHabitat(page)
      await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()
      await selectRequiredEvidence(page)
      await completeMisconceptions(page, 'correct')
      await completeCer(page)
      await expect(page.getByTestId('results-screen')).toBeVisible()

      const completed = await qaSnapshot(page)
      expectOneRenderer(completed)
      expect(completed.actorCount).toBe(40)
      baselineListeners ??= completed.listenerCount
      expect(completed.listenerCount).toBe(baselineListeners)
      expect(completed.tweenCount).toBe(0)
      expect(completed.duplicateRoundEndCount).toBe(0)
      expect(completed.frameMetrics.p95FrameTimeMs).toBeLessThanOrEqual(50)
      averageFps.push(completed.frameMetrics.averageFps)

      if (study < 3) {
        await page.getByRole('button', { name: /replay|start a new study/i }).click()
        await expect(page.getByTestId('mission-screen')).toBeVisible()
      }
    }

    expect(averageFps[2]).toBeGreaterThanOrEqual(averageFps[0] * 0.9)
  })
})
