import { expect, test, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  expectNoEligibleActorOverlap,
  expectOneRenderer,
  qaSnapshot,
  startGenerationByTouch,
  waitForQaState,
  type InteractionQaSnapshot,
} from './interaction-support'
import { chooseTiming, submitPrediction, testUrl } from './support'
import { deriveSeed } from '../../src/simulation/index.ts'

// The persistent JSON/PNG files below are the evidence artifacts. Avoid
// Playwright trace/video finalization for this long manual diagnostic file;
// it has previously left a completed worker/browser alive after a report
// wrote.
test.use({ screenshot: 'off', trace: 'off', video: 'off' })

const ENABLED = process.env.CAPTURE_CHALLENGE_BASELINE === '1'
const FULL_TIMELINE = process.env.CAPTURE_CHALLENGE_FULL_TIMELINE === '1'
// Canvas screenshots can interrupt Phaser's advancing clock even though the
// app remains visibly running. Full timeline diagnostics therefore never
// capture inline. A separate opt-in suite opens a fresh round for each
// representative 0/5/10/20-second screenshot and ends it immediately after
// the capture.
const CAPTURE_REPRESENTATIVE_SCREENSHOTS =
  process.env.CAPTURE_CHALLENGE_REPRESENTATIVE_SCREENSHOTS === '1'
const CAPTURE_ISOLATED_BASELINE =
  process.env.CAPTURE_CHALLENGE_ISOLATED_BASELINE === '1'
const CAPTURE_ALL_TIMELINES = FULL_TIMELINE
const requestedSeedLimit = Number(process.env.CHALLENGE_BASELINE_SEED_LIMIT ?? '12')
const SEED_LIMIT = Number.isInteger(requestedSeedLimit)
  ? Math.max(1, Math.min(12, requestedSeedLimit))
  : 12
const BASELINE_SESSION_SEED = 1

function readPlacementSeeds(): number[] {
  const requestedSeeds = process.env.CHALLENGE_BASELINE_PLACEMENT_SEEDS
  if (!requestedSeeds) {
    return Array.from({ length: SEED_LIMIT }, (_, index) => 101 + index)
  }

  const values = requestedSeeds
    .split(',')
    .map((value) => Number(value.trim()))
  if (
    values.length === 0 ||
    values.some((value) => !Number.isInteger(value) || value < 101 || value > 112) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(
      'CHALLENGE_BASELINE_PLACEMENT_SEEDS must be a comma-separated, unique subset of 101 through 112.',
    )
  }
  return values
}

const PLACEMENT_SEEDS = readPlacementSeeds()
const VIEWPORTS = [
  { label: '768x1024', width: 768, height: 1024, representativePlacementSeed: 101 },
  { label: '1024x768', width: 1024, height: 768, representativePlacementSeed: 104 },
  { label: '820x1180', width: 820, height: 1180, representativePlacementSeed: 107 },
  { label: '1180x820', width: 1180, height: 820, representativePlacementSeed: 110 },
] as const
const CHECKPOINTS = [0, 5, 10, 20] as const
// Playwright removes passed-test output folders. Baseline evidence must remain
// available for visual review, so this intentionally uses the ignored, stable
// test-results directory instead of testInfo.outputPath().
const baselineArtifactDirectory = path.resolve(
  process.cwd(),
  'test-results',
  'challenge-baseline',
)
const placementReportSuffix = PLACEMENT_SEEDS.length === 12
  ? ''
  : `-seeds-${PLACEMENT_SEEDS.join('-')}`

type SnapshotReport = {
  elapsedTargetSeconds: number
  roundElapsedMs: number
  actorCounts: Record<'camouflaged' | 'conspicuous', number>
  hitRegionsOverlap: boolean
  manualCatches: number
  misses: number
  latestFeedbackLatencyMs: number | null
  firstAcceptedCatchElapsedMs: number | null
  totalCollisionTurns: number
  maxCollisionTurns: number
  frameMetrics: InteractionQaSnapshot['frameMetrics']
  actors: InteractionQaSnapshot['actors']
}

type SeedReport = {
  /** Held constant so only raw placement varies between baseline fields. */
  sessionSeed: number
  /** Deterministic round seed used by the first reef generation. */
  biologySeed: number
  /** Raw QA-only placement input, exactly one of 101 through 112. */
  requestedPlacementSeed: number
  /** Exact renderer inputs observed through the network-free QA bridge. */
  placementSeed: number
  movementSeed: number
  roundId: string
  checkpoints: SnapshotReport[]
}

type BaselineReport = {
  viewport: (typeof VIEWPORTS)[number]
  sessionSeed: number
  requestedPlacementSeeds: readonly number[]
  seedLimit: number
  mode: 'compact' | 'full-timeline'
  expectedCheckpoints: readonly number[]
  report: SeedReport[]
}

function hasHitRegionOverlap(snapshot: InteractionQaSnapshot): boolean {
  const eligible = snapshot.actors.filter(({ locked }) => !locked)
  return eligible.some((first, index) => eligible.slice(index + 1).some((second) => {
    const one = first.hitBounds
    const two = second.hitBounds
    return one.x < two.x + two.width &&
      one.x + one.width > two.x &&
      one.y < two.y + two.height &&
      one.y + one.height > two.y
  }))
}

function recordSnapshot(
  snapshot: InteractionQaSnapshot,
  elapsedTargetSeconds: number,
): SnapshotReport {
  return {
    elapsedTargetSeconds,
    roundElapsedMs: snapshot.roundElapsedMs,
    actorCounts: snapshot.actors.reduce<Record<'camouflaged' | 'conspicuous', number>>(
      (counts, actor) => ({ ...counts, [actor.morphId]: counts[actor.morphId] + 1 }),
      { camouflaged: 0, conspicuous: 0 },
    ),
    hitRegionsOverlap: hasHitRegionOverlap(snapshot),
    manualCatches: snapshot.manualCatches,
    misses: snapshot.misses,
    latestFeedbackLatencyMs: snapshot.latestFeedbackLatencyMs,
    firstAcceptedCatchElapsedMs: snapshot.firstAcceptedCatchElapsedMs,
    totalCollisionTurns: snapshot.actors.reduce((sum, actor) => sum + actor.collisionTurns, 0),
    maxCollisionTurns: Math.max(0, ...snapshot.actors.map((actor) => actor.collisionTurns)),
    frameMetrics: snapshot.frameMetrics,
    actors: snapshot.actors.map((actor) => ({ ...actor })),
  }
}

async function openFishRound(page: Page, placementSeed: number): Promise<InteractionQaSnapshot> {
  await page.goto(testUrl({
    seed: String(BASELINE_SESSION_SEED),
    qa: true,
    placementSeed,
    // Browser diagnostics deliberately spend much longer inside a round than
    // a student would. Give this QA-only round ample headroom so a slow
    // renderer sample cannot auto-resolve before its 20-second checkpoint.
    // This never affects a non-E2E build.
    roundMs: 600_000,
  }))
  await chooseTiming(page, 'Standard')
  await submitPrediction(page, 'reef_fish')
  const ready = await waitForQaState(page, 'ready')
  expectOneRenderer(ready)
  return startGenerationByTouch(page)
}

async function waitForRoundTime(page: Page, milliseconds: number): Promise<InteractionQaSnapshot> {
  await expect.poll(
    async () => {
      const snapshot = await qaSnapshot(page)
      if (snapshot.roundState !== 'running') {
        throw new Error(
          `Expected a running diagnostic round at ${milliseconds}ms; received ${snapshot.roundState}.`,
        )
      }
      return snapshot.roundElapsedMs
    },
    { timeout: Math.max(10_000, milliseconds + 10_000) },
  ).toBeGreaterThanOrEqual(milliseconds)
  const snapshot = await qaSnapshot(page)
  expect(snapshot.roundState).toBe('running')
  // QA polling may land up to about one frame/interval late. A wider drift
  // means this field cannot honestly be labeled as its requested 5/10/20s
  // checkpoint and must be rerun in isolation.
  expect(snapshot.roundElapsedMs).toBeLessThanOrEqual(milliseconds + 1_500)
  return snapshot
}

async function captureRepresentativeCanvas(
  page: Page,
  viewportLabel: string,
  seed: string,
  checkpoint: number,
) {
  // This is a canvas-only capture, so DOM focus is outside its image. Do not
  // blur the page here: the live game correctly pauses on a real window blur,
  // which would turn a visual QA capture into an artificial stopped timer.
  const filename = `fish-${viewportLabel}-seed-${seed}-${checkpoint}s.png`
  await mkdir(baselineArtifactDirectory, { recursive: true })
  const screenshotPath = path.join(baselineArtifactDirectory, filename)
  await page.locator('canvas').screenshot({ path: screenshotPath })
  const afterCapture = await qaSnapshot(page)
  expect(afterCapture.roundState).toBe('running')
  expect(afterCapture.pauseReasons).toEqual([])
}

test.describe('Fish visual challenge baseline @manual', () => {
  for (const viewport of VIEWPORTS) {
    test(`records seeded fish fields at ${viewport.label}`, async ({ page }) => {
      test.skip(!ENABLED, 'Set CAPTURE_CHALLENGE_BASELINE=1 to run the opt-in visual baseline.')
      test.setTimeout(
        CAPTURE_ALL_TIMELINES
          ? Math.max(240_000, PLACEMENT_SEEDS.length * 180_000 + 120_000)
          : Math.max(180_000, PLACEMENT_SEEDS.length * 18_000 + 90_000),
      )
      // Each seed is an independent visual field. Clearing only the local
      // resumable draft before each navigation keeps the recovery dialog from
      // joining one seed to the next while leaving production recovery intact.
      await page.addInitScript(() => window.localStorage.clear())
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      const report: SeedReport[] = []
      for (const requestedPlacementSeed of PLACEMENT_SEEDS) {
        const checkpoints: SnapshotReport[] = []
        const start = await openFishRound(page, requestedPlacementSeed)
        const sessionSeed = BASELINE_SESSION_SEED
        const biologySeed = deriveSeed(sessionSeed, 'reef_fish', 1, 'biology')
        const movementSeed = deriveSeed(biologySeed, 'movement')
        const expectedRoundId = `reef_fish:g1:s${biologySeed}`
        expect(start.roundId).toBe(expectedRoundId)
        expect(start.placementSeed).toBe(requestedPlacementSeed)
        expect(start.movementSeed).toBe(movementSeed)
        expect(start.actorCount).toBe(40)
        expect(start.actors.filter(({ morphId }) => morphId === 'camouflaged')).toHaveLength(20)
        expect(start.actors.filter(({ morphId }) => morphId === 'conspicuous')).toHaveLength(20)
        expectNoEligibleActorOverlap(start)
        checkpoints.push(recordSnapshot(start, 0))
        // The compact sweep checks every deterministic field at live renderer
        // start, then records the full 0/5/10/20 motion timeline for one
        // representative seed per viewport. FULL_TIMELINE records the longer
        // all-seed diagnostics archive without inline screenshots so logical
        // renderer time stays trustworthy.
        const checkpointsToCapture = CAPTURE_ALL_TIMELINES || requestedPlacementSeed === viewport.representativePlacementSeed
          ? CHECKPOINTS.slice(1)
          : []
        for (const checkpoint of checkpointsToCapture) {
          const snapshot = await waitForRoundTime(page, checkpoint * 1_000)
          expect(snapshot.roundState).toBe('running')
          expect(snapshot.manualCatches).toBe(0)
          expect(snapshot.misses).toBe(0)
          expect(snapshot.placementSeed).toBe(requestedPlacementSeed)
          expect(snapshot.movementSeed).toBe(movementSeed)
          expectNoEligibleActorOverlap(snapshot)
          // Collision-turn counts are retained in the JSON report rather than
          // hard-gated here: browser frame cadence changes an exact count near
          // a checkpoint. Non-overlap and touch behavior have dedicated,
          // deterministic checks; acceptable classroom motion is a physical-
          // device and pilot gate.
          checkpoints.push(recordSnapshot(snapshot, checkpoint))
        }
        if (CAPTURE_ALL_TIMELINES) {
          expect(checkpoints.map(({ elapsedTargetSeconds }) => elapsedTargetSeconds)).toEqual(CHECKPOINTS)
        }
        report.push({
          sessionSeed,
          biologySeed,
          requestedPlacementSeed,
          placementSeed: start.placementSeed!,
          movementSeed,
          roundId: expectedRoundId,
          checkpoints,
        })
      }

      await mkdir(baselineArtifactDirectory, { recursive: true })
      const reportPath = path.join(
        baselineArtifactDirectory,
        `fish-${viewport.label}${placementReportSuffix}.json`,
      )
      const mode: BaselineReport['mode'] = FULL_TIMELINE
          ? 'full-timeline'
          : 'compact'
      const baselineReport: BaselineReport = {
        viewport,
        sessionSeed: BASELINE_SESSION_SEED,
        requestedPlacementSeeds: PLACEMENT_SEEDS,
        seedLimit: SEED_LIMIT,
        mode,
        expectedCheckpoints: CAPTURE_ALL_TIMELINES ? CHECKPOINTS : [0],
        report,
      }
      await writeFile(
        reportPath,
        JSON.stringify(baselineReport, null, 2),
        'utf8',
      )
    })
  }
})

test.describe('Fish visual challenge representative captures @manual', () => {
  for (const viewport of VIEWPORTS) {
    test(`captures a fresh representative field at ${viewport.label}`, async ({ page }) => {
      test.skip(
        !CAPTURE_REPRESENTATIVE_SCREENSHOTS,
        'Set CAPTURE_CHALLENGE_REPRESENTATIVE_SCREENSHOTS=1 to create representative field images.',
      )
      test.setTimeout(180_000)
      await page.addInitScript(() => window.localStorage.clear())
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const checkpoint of CHECKPOINTS) {
        const snapshot = await openFishRound(page, viewport.representativePlacementSeed)
        expectNoEligibleActorOverlap(snapshot)
        if (checkpoint > 0) {
          await waitForRoundTime(page, checkpoint * 1_000)
        }
        await captureRepresentativeCanvas(
          page,
          viewport.label,
          String(viewport.representativePlacementSeed),
          checkpoint,
        )
      }
    })
  }
})

test.describe('Fish visual challenge isolated baseline @manual', () => {
  // A page navigation releases the React tree but keeps the browser page
  // alive. This suite gives every field its own Playwright page fixture so
  // late fields cannot inherit renderer work from earlier placements when
  // collecting frame-time evidence.
  for (const viewport of VIEWPORTS) {
    for (const requestedPlacementSeed of PLACEMENT_SEEDS) {
      test(
        `records an isolated fish field at ${viewport.label}, seed ${requestedPlacementSeed}`,
        async ({ page }) => {
          test.skip(
            !CAPTURE_ISOLATED_BASELINE,
            'Set CAPTURE_CHALLENGE_ISOLATED_BASELINE=1 to run isolated manual diagnostics.',
          )
          test.setTimeout(240_000)
          await page.addInitScript(() => window.localStorage.clear())
          await page.setViewportSize({ width: viewport.width, height: viewport.height })

          const checkpoints: SnapshotReport[] = []
          const start = await openFishRound(page, requestedPlacementSeed)
          const biologySeed = deriveSeed(BASELINE_SESSION_SEED, 'reef_fish', 1, 'biology')
          const movementSeed = deriveSeed(biologySeed, 'movement')
          const roundId = `reef_fish:g1:s${biologySeed}`
          expect(start.roundId).toBe(roundId)
          expect(start.placementSeed).toBe(requestedPlacementSeed)
          expect(start.movementSeed).toBe(movementSeed)
          expect(start.actorCount).toBe(40)
          expect(start.actors.filter(({ morphId }) => morphId === 'camouflaged')).toHaveLength(20)
          expect(start.actors.filter(({ morphId }) => morphId === 'conspicuous')).toHaveLength(20)
          expectNoEligibleActorOverlap(start)
          checkpoints.push(recordSnapshot(start, 0))

          for (const checkpoint of CHECKPOINTS.slice(1)) {
            const snapshot = await waitForRoundTime(page, checkpoint * 1_000)
            expect(snapshot.manualCatches).toBe(0)
            expect(snapshot.misses).toBe(0)
            expect(snapshot.placementSeed).toBe(requestedPlacementSeed)
            expect(snapshot.movementSeed).toBe(movementSeed)
            expectNoEligibleActorOverlap(snapshot)
            checkpoints.push(recordSnapshot(snapshot, checkpoint))
          }
          expect(checkpoints.map(({ elapsedTargetSeconds }) => elapsedTargetSeconds)).toEqual(CHECKPOINTS)

          const reportPath = path.join(
            baselineArtifactDirectory,
            `fish-${viewport.label}-isolated-seed-${requestedPlacementSeed}.json`,
          )
          const baselineReport: BaselineReport = {
            viewport,
            sessionSeed: BASELINE_SESSION_SEED,
            requestedPlacementSeeds: [requestedPlacementSeed],
            seedLimit: 1,
            mode: 'full-timeline',
            expectedCheckpoints: CHECKPOINTS,
            report: [{
              sessionSeed: BASELINE_SESSION_SEED,
              biologySeed,
              requestedPlacementSeed,
              placementSeed: start.placementSeed!,
              movementSeed,
              roundId,
              checkpoints,
            }],
          }
          await mkdir(baselineArtifactDirectory, { recursive: true })
          await writeFile(reportPath, JSON.stringify(baselineReport, null, 2), 'utf8')
        },
      )
    }
  }
})
