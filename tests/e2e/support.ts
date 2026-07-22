import { expect, type Page, type TestInfo } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

export const PORTRAIT = { width: 820, height: 1180 }
export const LANDSCAPE = { width: 1180, height: 820 }

const releaseScreenshotDirectory = path.resolve(
  process.cwd(),
  'test-results',
  'release-screenshots',
)

export function testUrl(options: {
  seed: string
  failRenderer?: boolean
  failStorage?: boolean
  qa?: boolean
  roundMs?: number
  placementSeed?: number
}) {
  const query = new URLSearchParams({
    e2e: '1',
    e2eRoundMs: String(options.roundMs ?? 350),
    e2eSeed: options.seed,
  })

  if (options.failRenderer) query.set('e2eRenderer', 'fail')
  if (options.failStorage) query.set('e2eStorage', 'fail')
  if (options.qa) query.set('qa', '1')
  if (options.placementSeed !== undefined) query.set('e2ePlacementSeed', String(options.placementSeed))
  return `/?${query.toString()}`
}

export async function expectResponsive(page: Page) {
  const sizes = await page.locator('html').evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1)

  const primaryAction = page.getByTestId('primary-action')
  if (await primaryAction.isVisible().catch(() => false)) {
    const box = await primaryAction.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56)
  }
}

async function expectStageDockUsable(page: Page, testId: string) {
  const action = page.getByTestId(testId)
  await expect(action).toBeVisible()
  const box = await action.boundingBox()
  expect(box?.height ?? 0, `${testId} must remain a 56px touch target.`).toBeGreaterThanOrEqual(56)
  await expectResponsive(page)
}

export async function captureReleasePair(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options: { fullPage?: boolean } = {},
) {
  await mkdir(releaseScreenshotDirectory, { recursive: true })

  for (const [orientation, viewport] of [
    ['portrait', PORTRAIT],
    ['landscape', LANDSCAPE],
  ] as const) {
    await page.setViewportSize(viewport)
    await expectResponsive(page)
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    })
    const skipLink = page.locator('.skip-link')
    await skipLink.evaluate((element) => {
      const htmlElement = element as HTMLElement
      element.setAttribute('data-screenshot-hidden', 'true')
      htmlElement.style.visibility = 'hidden'
    })
    const filename = `${name}-${orientation}.png`
    const screenshotPath = path.join(releaseScreenshotDirectory, filename)
    await page.screenshot({ path: screenshotPath, fullPage: options.fullPage ?? true })
    await skipLink.evaluate((element) => {
      const htmlElement = element as HTMLElement
      element.removeAttribute('data-screenshot-hidden')
      htmlElement.style.removeProperty('visibility')
    })
    await testInfo.attach(filename, {
      path: screenshotPath,
      contentType: 'image/png',
    })
  }
}

export async function chooseTiming(page: Page, mode: 'Standard' | 'Extended') {
  await page.getByTestId('study-route-predator').check()
  await page.getByRole('radio', { name: new RegExp(mode, 'i') }).check()
  await page.getByRole('button', { name: /begin predator study/i }).click()
}

export async function submitPrediction(
  page: Page,
  habitat: 'reef_fish' | 'bark_moths',
) {
  const prediction = page.getByTestId(`prediction-${habitat}`)
  const camouflagedLabel = habitat === 'reef_fish'
    ? /reef-matched pattern.*larger percentage/i
    : /mottled bark pattern.*larger percentage/i
  await prediction
    .getByRole('radio', { name: camouflagedLabel })
    .check()
  await prediction
    .getByRole('textbox')
    .fill('Camouflage may reduce predation, so more survivors can reproduce and pass on the inherited trait.')
  await prediction.getByRole('button', { name: /lock prediction/i }).click()
}

export async function playGeneration(page: Page, generation: 1 | 2 | 3) {
  await page.getByTestId('start-generation').click()
  const summary = page.getByTestId('generation-summary')
  await expect(summary).toBeVisible()
  await expect(summary).toHaveAttribute('data-generation', String(generation))
  if (generation === 1) {
    await expect(page.getByTestId('fixed-population-disclosure')).toContainText(
      /Real population sizes do not always stay constant/i,
    )
    await expect(page.getByTestId('model-boundary-disclosure')).toContainText(
      /does not claim that nature always follows one exact sequence/i,
    )
  }
}

export async function playHabitat(page: Page) {
  for (const generation of [1, 2, 3] as const) {
    await playGeneration(page, generation)
    if (generation < 3) {
      await page.getByTestId('continue-generation').click()
    }
  }
}

const correctMisconceptionOptions = [
  'option-environmental-predation',
  'option-survivors-reproduced',
  'option-survive-and-reproduce',
  'option-background-dependent',
] as const

const incorrectMisconceptionOptions = [
  'option-organisms-chose-to-change',
  'option-environment-created-trait',
  'option-survival-only',
  'option-one-trait-always-best',
] as const

export async function completeMisconceptions(
  page: Page,
  firstAttempt: 'correct' | 'incorrect',
) {
  for (let index = 0; index < correctMisconceptionOptions.length; index += 1) {
    const questionNumber = index + 1
    const question = page.getByTestId(`misconception-${questionNumber}`)
    await expect(question).toBeVisible()

    if (firstAttempt === 'incorrect') {
      await question.getByTestId(incorrectMisconceptionOptions[index]).click()
      await question.getByRole('button', { name: /check answer/i }).click()
      await expect(question.getByRole('alert')).toContainText(/try again|not quite/i)
    }

    await question.getByTestId(correctMisconceptionOptions[index]).click()
    await question.getByRole('button', { name: /check answer/i }).click()
    await expect(question.getByTestId('answer-feedback')).toContainText(/correct/i)
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(1)
    await expect(page.locator('[role="status"]')).toHaveCount(0)
    await question.getByRole('button', { name: /continue/i }).click()
  }
}

export async function selectRequiredEvidence(page: Page) {
  for (const id of [
    'evidence-reef_fish-g0',
    'evidence-reef_fish-g3',
    'evidence-bark_moths-g0',
    'evidence-bark_moths-g3',
    'evidence-within-generation',
  ]) {
    await page.getByTestId(id).click()
  }
  await expectStageDockUsable(page, 'evidence-dock-action')
  await page.getByTestId('evidence-dock-action').click()
}

export async function completeCer(page: Page) {
  await page.getByTestId('cer-claim-population-change').click()
  await page
    .getByTestId('cer-reasoning')
    .fill(
      'The inherited camouflage variation affected which organisms were caught. Survivors reproduced, so their offspring made that trait a different percentage of the later population.',
    )
  await expectStageDockUsable(page, 'cer-dock-action')
  await page.getByTestId('cer-dock-action').click()
}

export async function finishCurrentHabitat(page: Page, completedGenerations = 0) {
  for (let generation = completedGenerations + 1; generation <= 3; generation += 1) {
    await playGeneration(page, generation as 1 | 2 | 3)
    if (generation < 3) await page.getByTestId('continue-generation').click()
  }
}
