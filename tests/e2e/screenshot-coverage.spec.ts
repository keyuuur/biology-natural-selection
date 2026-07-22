import { expect, test } from '@playwright/test'
import {
  captureReleasePair,
  chooseTiming,
  playHabitat,
  submitPrediction,
  testUrl,
} from './support'
import { startGenerationByTouch } from './interaction-support'

/**
 * These are deliberately untagged: the WebKit project is reserved for tests
 * explicitly marked @webkit, while the canonical screenshot set is captured
 * once in Chromium at the shared portrait and landscape dimensions.
 */
test.describe('Release screenshot coverage', () => {
  test('captures an active reef predator round in both orientations', async ({ page }, testInfo) => {
    await page.goto(testUrl({
      seed: 'screenshot-active-reef',
      // This release artifact must show the student-facing Standard clock, not
      // the shared accelerated 350 ms browser-test clock.
      roundMs: 25_000,
    }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')
    await page.getByTestId('start-generation').click()

    await expect(page.getByTestId('habitat-title')).toContainText(/reef|fish/i)
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect(page.getByText(/caught\s*0 of 12/i)).toBeVisible()
    await expect(page.locator('.round-timer strong')).not.toHaveText('0s')
    await expect(page.locator('.habitat-start-overlay')).toHaveCount(0)
    // Phaser fields use a viewport capture. On this Windows setup, a full-page
    // canvas capture can interrupt the renderer's clock and delay teardown.
    await captureReleasePair(page, testInfo, '02-reef-gameplay', { fullPage: false })
  })

  test('captures an active bark-moth predator round with the real Standard clock', async ({ page }, testInfo) => {
    const seed = 'screenshot-active-moths'
    await page.goto(testUrl({
      seed,
      // Use the ordinary accelerated browser clock only to reach the second
      // habitat. The screenshot itself is taken after resuming this same
      // saved study with the real Standard clock below.
      roundMs: 350,
    }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')
    await playHabitat(page)

    await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
    await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()

    await expect.poll(() => page.evaluate(() =>
      window.localStorage.getItem('natural-selection:v2:session-draft') !== null,
    )).toBe(true)
    await page.goto(testUrl({ seed, qa: true, roundMs: 25_000 }))
    const recovery = page.getByTestId('draft-recovery')
    await expect(recovery).toBeVisible()
    await recovery.getByRole('button', { name: /resume study/i }).click()

    await submitPrediction(page, 'bark_moths')
    await startGenerationByTouch(page)

    await expect(page.getByTestId('habitat-title')).toContainText(/bark|moth/i)
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect(page.getByText(/caught\s*0 of 12/i)).toBeVisible()
    await expect(page.locator('.round-timer strong')).not.toHaveText('0s')
    await expect(page.locator('.habitat-start-overlay')).toHaveCount(0)
    await captureReleasePair(page, testInfo, '04-moth-gameplay', { fullPage: false })
    // Explicitly unmount the live Phaser scene before the browser context
    // closes. This keeps a screenshot-only active round from extending the
    // test through teardown on slower CI or classroom hardware.
    await page.goto('about:blank')
  })

  test('captures the student-selected Observation study in both orientations', async ({ page }, testInfo) => {
    await page.goto(testUrl({ seed: 'screenshot-observation-study' }))
    await page.getByTestId('study-route-observation').check()
    await page.getByRole('button', { name: /begin observation study/i }).click()
    await submitPrediction(page, 'reef_fish')

    await expect(page.getByTestId('dom-observation-study')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await captureReleasePair(page, testInfo, '07-observation-study')
  })

  test('captures the renderer-failure Observation fallback in both orientations', async ({ page }, testInfo) => {
    await page.goto(testUrl({
      seed: 'screenshot-renderer-fallback',
      failRenderer: true,
    }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')

    await expect(page.getByTestId('dom-observation-fallback')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await captureReleasePair(page, testInfo, '08-renderer-fallback')
  })
})
