import { expect, test } from '@playwright/test'
import {
  LANDSCAPE,
  PORTRAIT,
  captureReleasePair,
  chooseTiming,
  completeCer,
  completeMisconceptions,
  finishCurrentHabitat,
  playGeneration,
  playHabitat,
  selectRequiredEvidence,
  submitPrediction,
  testUrl,
} from './support'

test.describe('Natural Selection Predator–Camouflage study', () => {
  test('Standard mode completes both habitats and keeps science results separate', async ({ page }, testInfo) => {
    await page.goto(testUrl({ seed: 'standard-complete' }))
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/natural selection/i)
    await captureReleasePair(page, testInfo, '01-mission')

    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')
    await expect(page.getByTestId('habitat-title')).toContainText(/reef|fish/i)
    await expect(page.getByTestId('start-generation')).toBeEnabled()
    await captureReleasePair(page, testInfo, '02-reef-gameplay')
    await playHabitat(page)

    await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
    await expect(page.getByTestId('population-graph-reef_fish')).toBeVisible()
    await expect(page.getByTestId('population-table-reef_fish')).toBeVisible()
    await captureReleasePair(page, testInfo, '03-generation-evidence')
    await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()

    await submitPrediction(page, 'bark_moths')
    await expect(page.getByTestId('habitat-title')).toContainText(/bark|moth/i)
    await expect(page.getByTestId('start-generation')).toBeEnabled()
    await captureReleasePair(page, testInfo, '04-moth-gameplay')
    await playHabitat(page)
    await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()

    await selectRequiredEvidence(page)
    await completeMisconceptions(page, 'correct')
    await expect(page.getByTestId('cer-screen')).toBeVisible()
    await captureReleasePair(page, testInfo, '05-cer')
    await completeCer(page)

    await expect(page.getByTestId('results-screen')).toBeVisible()
    await expect(page.getByRole('heading', { name: /predator performance/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /science study/i })).toBeVisible()
    await expect(page.getByTestId('science-completion')).toContainText(/complete/i)
    await captureReleasePair(page, testInfo, '06-results')
  })

  test('Extended mode retains first attempts and resumes after refresh and rotation', async ({ page }) => {
    await page.goto(testUrl({ seed: 'extended-resume' }))
    await chooseTiming(page, 'Extended')
    await submitPrediction(page, 'reef_fish')

    await playGeneration(page, 1)
    await page.reload()
    const recovery = page.getByTestId('draft-recovery')
    await expect(recovery).toBeVisible()
    await recovery.getByRole('button', { name: /resume study/i }).click()
    await expect(page.getByTestId('generation-summary')).toHaveAttribute('data-generation', '1')

    await page.setViewportSize(LANDSCAPE)
    await expect(page.locator('canvas')).toHaveCount(1)
    await page.getByTestId('continue-generation').click()
    await finishCurrentHabitat(page, 1)
    await page.setViewportSize(PORTRAIT)
    await expect(page.locator('canvas')).toHaveCount(1)

    await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
    await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()
    await submitPrediction(page, 'bark_moths')
    await playHabitat(page)
    await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()
    await selectRequiredEvidence(page)
    await completeMisconceptions(page, 'incorrect')
    await completeCer(page)

    await expect(page.getByTestId('timing-mode-result')).toContainText(/extended/i)
    await expect(page.getByTestId('first-attempt-score')).toContainText(/0\s*(of|\/)\s*4/i)
    await expect(page.locator('canvas')).toHaveCount(1)
  })

  test('renderer and storage failures preserve the observation flow and replay with a new seed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(testUrl({
      seed: 'fallback-initial',
      failRenderer: true,
      failStorage: true,
    }))
    const initialSeed = await page.getByTestId('app-shell').getAttribute('data-session-seed')

    await chooseTiming(page, 'Standard')
    await expect(page.getByRole('alert')).toContainText(/observation|renderer|graphics/i)
    await submitPrediction(page, 'reef_fish')
    await expect(page.getByTestId('dom-observation-fallback')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await playHabitat(page)
    await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
    await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()
    await submitPrediction(page, 'bark_moths')
    await playHabitat(page)
    await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()
    await selectRequiredEvidence(page)
    await completeMisconceptions(page, 'correct')
    await completeCer(page)

    await expect(page.getByTestId('predator-score-unavailable')).toContainText(/not available|observation/i)
    await expect(page.getByRole('alert')).toContainText(/could not save|not saved|storage/i)
    await page.getByRole('button', { name: /replay|start a new study/i }).click()
    await expect(page.getByTestId('mission-screen')).toBeVisible()

    const replaySeed = await page.getByTestId('app-shell').getAttribute('data-session-seed')
    expect(initialSeed).toBeTruthy()
    expect(replaySeed).toBeTruthy()
    expect(replaySeed).not.toBe(initialSeed)
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})
