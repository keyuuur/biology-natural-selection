import { expect, test } from '@playwright/test'
import {
  PORTRAIT,
  chooseTiming,
  completeMisconceptions,
  expectResponsive,
  finishCurrentHabitat,
  submitPrediction,
  testUrl,
} from './support'

async function beginObservationStudy(page: import('@playwright/test').Page) {
  await expect(page.getByRole('button', { name: /begin predator study/i })).toBeDisabled()
  await page.getByTestId('study-route-observation').check()
  const begin = page.getByRole('button', { name: /begin observation study/i })
  await expect(begin).toBeEnabled()
  await begin.click()
}

async function selectRequiredEvidenceWithDock(page: import('@playwright/test').Page) {
  for (const id of [
    'evidence-reef_fish-g0',
    'evidence-reef_fish-g3',
    'evidence-bark_moths-g0',
    'evidence-bark_moths-g3',
    'evidence-within-generation',
  ]) {
    await page.getByTestId(id).click()
  }
  await page.getByTestId('evidence-dock-action').click()
}

async function completeCerWithDock(page: import('@playwright/test').Page) {
  await page.getByTestId('cer-claim-population-change').click()
  await page.getByTestId('cer-reasoning').fill(
    'The inherited camouflage variation affected which organisms were caught. Survivors reproduced, so their offspring made that trait a different percentage of the later population.',
  )
  await page.getByTestId('cer-dock-action').click()
}

async function reachObservationCer(page: import('@playwright/test').Page) {
  await submitPrediction(page, 'reef_fish')
  await expect(page.getByTestId('dom-observation-study')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await finishCurrentHabitat(page)

  await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
  await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()

  await submitPrediction(page, 'bark_moths')
  await expect(page.getByTestId('dom-observation-study')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await finishCurrentHabitat(page)

  await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()
  await selectRequiredEvidenceWithDock(page)
  await completeMisconceptions(page, 'correct')
  await expect(page.getByTestId('cer-screen')).toBeVisible()
}

async function completeObservationStudy(page: import('@playwright/test').Page) {
  await reachObservationCer(page)
  await completeCerWithDock(page)
}

async function expectPortraitStageDockAfterDocumentScroll(
  page: import('@playwright/test').Page,
) {
  const dock = page.getByTestId('stage-action-dock')
  await expect(dock).toBeVisible()
  const scrollY = await page.evaluate(() => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    window.scrollTo({ top: Math.min(420, maximum), behavior: 'auto' })
    return window.scrollY
  })
  expect(scrollY).toBeGreaterThan(0)

  await expect.poll(async () => dock.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight + 1
  })).toBe(true)

  const nestedVerticalScroller = await dock.evaluate((element) => {
    let ancestor = element.parentElement
    while (ancestor && ancestor.tagName.toLowerCase() !== 'main') {
      const style = window.getComputedStyle(ancestor)
      const hasNestedVerticalScroll =
        /(auto|scroll)/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1
      if (hasNestedVerticalScroll) {
        return { className: ancestor.className, tagName: ancestor.tagName }
      }
      ancestor = ancestor.parentElement
    }
    return null
  })
  expect(nestedVerticalScroller).toBeNull()
  await expectResponsive(page)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }))
}

test.describe('Student study routes @webkit', () => {
  test('draft recovery traps focus, restores a study heading, and starts over safely', async ({ page }) => {
    await page.goto(testUrl({ seed: 'draft-recovery-focus' }))
    await chooseTiming(page, 'Standard')
    await expect(page.getByTestId('prediction-reef_fish')).toBeVisible()
    await expect.poll(async () => page.evaluate(() => (
      window.localStorage.getItem('natural-selection:v2:session-draft') !== null
    ))).toBe(true)

    await page.reload()
    const dialog = page.getByTestId('draft-recovery')
    const resume = dialog.getByRole('button', { name: /resume study/i })
    const startOver = dialog.getByRole('button', { name: /start over/i })
    await expect(dialog).toBeVisible()
    await expect(resume).toBeFocused()
    await expect(page.locator('main#main-content')).toHaveAttribute('inert', '')

    await page.keyboard.press('Shift+Tab')
    await expect(startOver).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(resume).toBeFocused()

    await resume.click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('main [data-stage-heading]').first()).toBeFocused()

    await page.reload()
    await expect(dialog).toBeVisible()
    await startOver.click()
    await expect(page.getByTestId('mission-screen')).toBeVisible()
    await expect(page.locator('main [data-stage-heading]').first()).toBeFocused()
    await expect(page.locator('main#main-content')).not.toHaveAttribute('inert', '')
  })

  test('beginning a new study clears prior local result text on a shared device', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'natural-selection:v2:last-result',
        JSON.stringify({ reasoning: 'a prior student report' }),
      )
    })
    await page.goto(testUrl({ seed: 'shared-device-clear' }))
    await chooseTiming(page, 'Standard')

    await expect.poll(async () => page.evaluate(() => (
      window.localStorage.getItem('natural-selection:v2:last-result')
    ))).toBeNull()
  })

  test('Predator round stays inside the main landmark and focuses its live heading', async ({ page }) => {
    await page.goto(testUrl({ seed: 'predator-main-focus', qa: true, roundMs: 60_000 }))
    await chooseTiming(page, 'Standard')
    await submitPrediction(page, 'reef_fish')

    const habitatTitle = page.getByTestId('habitat-title')
    await expect(habitatTitle).toBeFocused()
    await expect(habitatTitle.evaluate((heading) => heading.closest('main#main-content') !== null)).resolves.toBe(true)
  })

  test('Mission requires a route and only requires timing for the Predator study', async ({ page }) => {
    await page.goto(testUrl({ seed: 'route-gating' }))

    await expect(page.getByTestId('mission-screen')).toContainText(
      /act as a predator.*observation study/i,
    )

    const predatorBegin = page.getByRole('button', { name: /begin predator study/i })
    await expect(predatorBegin).toBeDisabled()
    await page.getByTestId('study-route-predator').check()
    await expect(predatorBegin).toBeEnabled()

    await page.getByRole('radio', { name: /extended/i }).check()
    await expect(predatorBegin).toBeEnabled()

    const observationBegin = page.getByRole('button', { name: /begin observation study/i })
    await page.getByTestId('study-route-observation').check()
    await expect(observationBegin).toBeEnabled()
    await expect(page.getByText(/same graphs, checks, and field report/i)).toBeVisible()
  })

  test('Portrait Mission, Evidence, and CER docks remain visible in one document scroll', async ({ page }) => {
    await page.setViewportSize(PORTRAIT)
    await page.goto(testUrl({ seed: 'portrait-stage-docks' }))
    await expectPortraitStageDockAfterDocumentScroll(page)

    await beginObservationStudy(page)
    await submitPrediction(page, 'reef_fish')
    await finishCurrentHabitat(page)
    await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
    await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()
    await submitPrediction(page, 'bark_moths')
    await finishCurrentHabitat(page)
    await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()

    await expect(page.getByTestId('evidence-progress')).toBeVisible()
    await expectPortraitStageDockAfterDocumentScroll(page)
    await selectRequiredEvidenceWithDock(page)
    await completeMisconceptions(page, 'correct')
    await expect(page.getByTestId('cer-screen')).toBeVisible()
    await expectPortraitStageDockAfterDocumentScroll(page)
  })

  test('keyboard-only controls reach the DOM Observation round with one polite announcer and focused headings', async ({ page }) => {
    await page.goto(testUrl({ seed: 'observation-keyboard' }))

    const observationRoute = page.getByTestId('study-route-observation')
    await observationRoute.focus()
    await expect(observationRoute).toBeFocused()
    await page.keyboard.press('Space')
    await expect(observationRoute).toBeChecked()

    const begin = page.getByRole('button', { name: /begin observation study/i })
    await page.keyboard.press('Tab')
    await expect(begin).toBeFocused()
    await page.keyboard.press('Enter')

    const predictionHeading = page.locator('main [data-stage-heading]').first()
    await expect(predictionHeading).toBeFocused()
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(1)
    await expect(page.locator('[role="status"]')).toHaveCount(0)

    const prediction = page.getByTestId('prediction-reef_fish')
    const camouflagedPrediction = prediction.getByRole('radio', { name: /reef-matched pattern/i })
    await camouflagedPrediction.focus()
    await page.keyboard.press('Space')
    await expect(camouflagedPrediction).toBeChecked()
    await page.keyboard.press('Tab')
    const reason = prediction.locator('textarea')
    await expect(reason).toBeFocused()
    await page.keyboard.type('It is harder to see, so more organisms may survive.')
    await page.keyboard.press('Tab')
    const lockPrediction = prediction.getByRole('button', { name: /lock prediction/i })
    await expect(lockPrediction).toBeFocused()
    await page.keyboard.press('Enter')

    const observationHeading = page.getByTestId('dom-observation-study').getByRole('heading')
    await expect(observationHeading).toBeFocused()
    await expect(page.locator('canvas')).toHaveCount(0)
    await page.keyboard.press('Tab')
    const resolve = page.getByRole('button', { name: /resolve this generation/i })
    await expect(resolve).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('generation-summary')).toBeVisible()
    await expect(page.locator('main [data-stage-heading]').first()).toBeFocused()
  })

  test('Observation study completes the full science path without mounting a canvas and replay returns to route choice', async ({ page }) => {
    await page.goto(testUrl({ seed: 'observation-full-route' }))
    const initialSeed = await page.getByTestId('app-shell').getAttribute('data-session-seed')

    await beginObservationStudy(page)
    await completeObservationStudy(page)

    await expect(page.getByTestId('results-screen')).toBeVisible()
    await expect(page.getByTestId('timing-mode-result')).toHaveText(/observation study/i)
    await expect(page.getByTestId('predator-score-unavailable')).toContainText(
      /not part of your observation study/i,
    )
    await expect(page.getByTestId('science-completion')).toContainText(/complete/i)
    await expect(page.locator('canvas')).toHaveCount(0)

    await page.getByRole('button', { name: /start a new study/i }).click()
    await expect(page.getByTestId('mission-screen')).toBeVisible()
    await expect(page.getByRole('button', { name: /begin predator study/i })).toBeDisabled()
    await expect(page.getByTestId('app-shell')).not.toHaveAttribute('data-session-seed', initialSeed ?? '')
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('CER swaps to one in-flow submit action when the visual viewport is reduced', async ({ page }) => {
    await page.addInitScript(() => {
      let viewportHeight = 1180
      const viewport = new EventTarget()
      Object.defineProperties(viewport, {
        width: { get: () => 820 },
        height: { get: () => viewportHeight },
      })
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: viewport,
      })
      Object.defineProperty(window, '__setCerVisualViewportHeight', {
        configurable: true,
        value: (nextHeight: number) => {
          viewportHeight = nextHeight
          viewport.dispatchEvent(new Event('resize'))
        },
      })
    })

    await page.goto(testUrl({ seed: 'cer-keyboard-viewport' }))
    await beginObservationStudy(page)
    await reachObservationCer(page)

    await page.getByTestId('cer-claim-population-change').click()
    await page.getByTestId('cer-reasoning').fill(
      'Inherited variation affected survival and reproduction. The surviving organisms produced offspring, changing the percentage of the inherited pattern in the later population.',
    )
    await expect(page.getByTestId('cer-dock-action')).toBeVisible()
    await expect(page.getByTestId('cer-keyboard-submit')).toHaveCount(0)

    await page.evaluate(() => {
      const target = window as Window & {
        __setCerVisualViewportHeight?: (nextHeight: number) => void
      }
      target.__setCerVisualViewportHeight?.(960)
    })

    await expect(page.getByTestId('cer-dock-action')).toHaveCount(0)
    const keyboardSubmit = page.getByTestId('cer-keyboard-submit')
    await expect(keyboardSubmit).toBeVisible()
    await keyboardSubmit.click()
    await expect(page.getByTestId('results-screen')).toBeVisible()
  })

  test('Renderer failure remains distinct from a student-selected Observation study', async ({ page }) => {
    await page.goto(testUrl({ seed: 'renderer-failure-route', failRenderer: true }))
    await page.getByTestId('study-route-predator').check()
    await page.getByRole('button', { name: /begin predator study/i }).click()

    await submitPrediction(page, 'reef_fish')
    await expect(page.getByTestId('dom-observation-fallback')).toBeVisible()
    await expect(
      page.getByTestId('dom-observation-fallback').getByRole('heading'),
    ).toBeFocused()
    await expect(page.locator('canvas')).toHaveCount(0)
    await finishCurrentHabitat(page)
    await page.getByRole('button', { name: /review (reef|fish) evidence/i }).click()
    await page.getByRole('button', { name: /continue to (the )?(moth|bark) habitat/i }).click()
    await submitPrediction(page, 'bark_moths')
    await finishCurrentHabitat(page)
    await page.getByRole('button', { name: /compare (the )?(habitats|evidence)/i }).click()
    await selectRequiredEvidenceWithDock(page)
    await completeMisconceptions(page, 'correct')
    await completeCerWithDock(page)

    await expect(page.getByTestId('predator-score-unavailable')).toContainText(
      /graphics could not load/i,
    )
    await expect(page.getByTestId('predator-score-unavailable')).not.toContainText(
      /not part of your observation study/i,
    )
  })
})
