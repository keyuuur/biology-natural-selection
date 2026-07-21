import { expect, test } from '@playwright/test'
import {
  findBlankCanvasPoint,
  qaSnapshot,
  startGenerationByTouch,
  tapActor,
} from './interaction-support'
import {
  chooseTiming,
  completeCer,
  completeMisconceptions,
  finishCurrentHabitat,
  playHabitat,
  selectRequiredEvidence,
  submitPrediction,
  testUrl,
} from './support'

const RESULT_KEY = 'natural-selection:v2:last-result'

async function finishStudyFromEvidence(page: Parameters<typeof chooseTiming>[0]) {
  await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()
  await selectRequiredEvidence(page)
  await completeMisconceptions(page, 'correct')
  await completeCer(page)
  await expect(page.getByTestId('results-screen')).toBeVisible()
}

async function finishFallbackStudy(page: Parameters<typeof chooseTiming>[0]) {
  await playHabitat(page)
  await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
  await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()
  await submitPrediction(page, 'bark_moths')
  await expect(page.getByTestId('dom-observation-fallback')).toBeVisible()
  await playHabitat(page)
  await finishStudyFromEvidence(page)
}

test.describe('S1 result and renderer-failure remediation', () => {
  test('keeps fractional tap accuracy exact through Results and local-only storage', async ({ page }) => {
    await page.goto(testUrl({
      seed: 's1-fractional-accuracy',
      qa: true,
      roundMs: 3_000,
    }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')
    await startGenerationByTouch(page)

    await tapActor(page)
    for (let miss = 0; miss < 2; miss += 1) {
      const blank = await findBlankCanvasPoint(page)
      await page.touchscreen.tap(blank.x, blank.y)
      await expect.poll(async () => (await qaSnapshot(page)).misses).toBe(miss + 1)
    }
    await expect.poll(async () => (await qaSnapshot(page)).manualCatches).toBe(1)
    await expect(page.getByTestId('generation-summary')).toHaveAttribute('data-generation', '1')

    await page.getByTestId('continue-generation').click()
    await finishCurrentHabitat(page, 1)
    await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
    await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()
    await submitPrediction(page, 'bark_moths')
    await playHabitat(page)
    await finishStudyFromEvidence(page)

    await expect(page.getByText('33%', { exact: true })).toBeVisible()
    const stored = await page.evaluate((resultKey) => {
      const value = window.localStorage.getItem(resultKey)
      return value ? JSON.parse(value) : null
    }, RESULT_KEY)
    expect(stored).toMatchObject({
      predatorPerformance: {
        manualCaptures: 1,
        misses: 2,
      },
    })
    expect(stored.predatorPerformance.accuracyPercent).toBeCloseTo(100 / 3, 12)
    expect(stored.habitats.reef_fish.generations).toHaveLength(3)
    expect(stored.habitats.bark_moths.generations).toHaveLength(3)
  })

  test('real lazy-import failure latches observation fallback through all six generations and replay @webkit', async ({ page }) => {
    let dynamicImportRequests = 0
    await page.route(/\/src\/phaser\/PhaserSceneController\.ts(?:\?.*)?$/, async (route) => {
      dynamicImportRequests += 1
      await route.abort('failed')
    })

    await page.goto(testUrl({ seed: 's1-import-failure', roundMs: 100 }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')
    await expect(page.getByTestId('dom-observation-fallback')).toBeVisible()
    await finishFallbackStudy(page)

    // Chromium makes one module request here; WebKit may retry a failed module
    // fetch internally. The component suite proves the application invokes its
    // loader once per failed study, while this browser check proves the real
    // lazy-import catch path is reached.
    expect(dynamicImportRequests).toBeGreaterThanOrEqual(1)
    await expect(page.getByTestId('predator-score-unavailable')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    const stored = await page.evaluate((resultKey) => JSON.parse(window.localStorage.getItem(resultKey) ?? '{}'), RESULT_KEY)
    for (const habitatId of ['reef_fish', 'bark_moths']) {
      expect(stored.habitats[habitatId].generations).toHaveLength(3)
      for (const generation of stored.habitats[habitatId].generations) {
        expect(generation).toMatchObject({
          inputMode: 'observation',
          fallbackUsed: true,
          manualCatches: { camouflaged: 0, conspicuous: 0 },
        })
      }
    }

    await page.getByRole('button', { name: /replay|start a new study/i }).click()
    await expect(page.getByTestId('mission-screen')).toBeVisible()
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')
    await expect(page.getByTestId('dom-observation-fallback')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('constructor-stage failure cleans partial renderer resources and preserves the science path', async ({ page }) => {
    await page.addInitScript(() => {
      class ThrowingResizeObserver {
        observe() {
          throw new Error('Injected ResizeObserver observe failure')
        }

        disconnect() {}
      }

      Object.defineProperty(window, 'ResizeObserver', {
        configurable: true,
        value: ThrowingResizeObserver,
      })
    })

    await page.goto(testUrl({ seed: 's1-construction-failure', roundMs: 100 }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')
    await expect(page.getByTestId('dom-observation-fallback')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await finishFallbackStudy(page)
    await expect(page.getByTestId('predator-score-unavailable')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})
