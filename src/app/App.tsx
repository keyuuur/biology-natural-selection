import { useEffect, useMemo, useRef, useState } from 'react'
import { CerScreen } from '../components/CerScreen.tsx'
import { EvidenceScreen } from '../components/EvidenceScreen.tsx'
import { GameHeader } from '../components/GameHeader.tsx'
import { GenerationPanel } from '../components/GenerationPanel.tsx'
import { HabitatGame } from '../components/HabitatGame.tsx'
import { HabitatSummaryScreen } from '../components/HabitatSummaryScreen.tsx'
import { MisconceptionScreen } from '../components/MisconceptionScreen.tsx'
import { MissionScreen } from '../components/MissionScreen.tsx'
import { PredictionPanel } from '../components/PredictionPanel.tsx'
import { ResultsScreen } from '../components/ResultsScreen.tsx'
import {
  createCerClaimChoices,
  formatGenerationPopulationEvidence,
  formatRateBasedGenerationEvidence,
} from '../learning/index.ts'
import type { GameSession, SessionDraftEnvelope } from '../game/sessionTypes.ts'
import { useGameSession } from '../game/useGameSession.ts'
import type {
  ComparisonEvidenceReference,
  GenerationResult,
  PopulationEvidenceReference,
} from '../simulation/index.ts'
import { localResultSaver } from '../storage/resultSaver.ts'
import './app.css'

function e2eConfig() {
  const params = new URLSearchParams(window.location.search)
  const enabled = params.get('e2e') === '1'
  const requestedDuration = Number(params.get('e2eRoundMs'))
  return {
    durationMs:
      enabled && Number.isFinite(requestedDuration) && requestedDuration >= 100
        ? requestedDuration
        : null,
    forceRendererFailure: enabled && params.get('e2eRenderer') === 'fail',
  }
}

function populationEvidenceText(
  game: ReturnType<typeof useGameSession>,
  reference: PopulationEvidenceReference,
): string {
  const point = game.graphPoints[reference.habitatId].find(
    (candidate) => candidate.generation === reference.generation,
  )
  if (!point) return 'Selected population evidence is unavailable.'
  return formatGenerationPopulationEvidence(
    reference.habitatId,
    reference.generation,
    point.counts,
  )
}

function comparisonEvidenceText(
  session: GameSession,
  reference: ComparisonEvidenceReference,
): string {
  const result = session.habitats[reference.habitatId].simulation.history.find(
    (generation) => generation.generation === reference.generation,
  )
  if (!result) return 'Selected survival evidence is unavailable.'
  return formatRateBasedGenerationEvidence({
    habitatId: result.habitatId,
    generation: result.generation,
    startingCounts: result.startingCounts,
    manualCatches: result.manualCatches,
    automaticCatches: result.automaticCatches,
    protectedEscapes: result.protectedEscapes,
    survivorCounts: result.survivorCounts,
    offspringCounts: result.offspringCounts,
  })
}

export function App() {
  const game = useGameSession()
  const { session } = game
  const config = useMemo(e2eConfig, [])
  const mainRef = useRef<HTMLElement>(null)
  const previousStageRef = useRef(session.stage)
  const [draftCandidate, setDraftCandidate] = useState<SessionDraftEnvelope | null>(null)
  const [storageReady, setStorageReady] = useState(false)
  const [storageMessage, setStorageMessage] = useState(
    'Progress stays only in this browser. No names or scores are sent anywhere.',
  )
  const [storageAlert, setStorageAlert] = useState<string | null>(null)
  const [liveMessage, setLiveMessage] = useState('Mission ready.')

  const rendererAlert = config.forceRendererFailure
    ? 'Graphics are unavailable for this test, so observation mode is active.'
    : null
  const systemAlert = [rendererAlert, storageAlert].filter(Boolean).join(' ')

  useEffect(() => {
    const loaded = localResultSaver.loadDraft()
    if (loaded.status === 'valid' && loaded.draft.session.stage !== 'results') {
      setDraftCandidate(loaded.draft)
    } else if (loaded.status === 'discarded' || loaded.status === 'unavailable') {
      setStorageAlert(
        loaded.status === 'unavailable'
          ? loaded.message
          : `${loaded.message} A new study was started.`,
      )
      setStorageMessage('This session will continue in memory if local saving is unavailable.')
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady || draftCandidate || session.stage === 'results') return
    try {
      localResultSaver.saveDraft(session)
      setStorageMessage('Draft saved on this device. Nothing was sent.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'This browser could not save locally.'
      setStorageAlert(`${message} Gameplay can continue, but this session will not be saved.`)
      setStorageMessage('Not saved; the study is continuing in memory.')
    }
  }, [draftCandidate, session, storageReady])

  useEffect(() => {
    if (!session.completedResult || session.stage !== 'results') return
    try {
      localResultSaver.saveResult(session.completedResult)
      setStorageMessage('Completed study saved on this device. Nothing was sent.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'This browser could not save locally.'
      setStorageAlert(`${message} The completed study was not saved.`)
      setStorageMessage('Completed in memory, but not saved on this device.')
    }
  }, [session.completedResult, session.stage])

  useEffect(() => {
    if (previousStageRef.current === session.stage) return
    previousStageRef.current = session.stage
    const frame = window.requestAnimationFrame(() => mainRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [session.stage])

  const timing = session.selectedTimingMode
    ? game.currentHabitat.timing[session.selectedTimingMode]
    : game.currentHabitat.timing.standard
  const durationMs = config.durationMs ?? timing.durationMs
  const latestResult: GenerationResult | undefined = game.currentSimulation.history.at(-1)
  const rendererMounted = session.predictions.reef_fish !== null
  const rendererActive = session.stage === 'round'

  const evidenceTexts = session.evidence.population.map((reference) =>
    populationEvidenceText(game, reference),
  )
  if (session.evidence.comparison) {
    evidenceTexts.push(comparisonEvidenceText(session, session.evidence.comparison))
  }

  const currentQuestion = game.misconceptionQuestions[session.currentCheckIndex]
  const currentAttempt = currentQuestion
    ? session.misconceptionChecks.find((attempt) => attempt.questionId === currentQuestion.id)
    : undefined

  function handleGenerationContinue() {
    const finalGeneration = latestResult?.generation === game.currentHabitat.generationCount
    game.continueAfterReview()
    if (finalGeneration && session.currentHabitatId === 'bark_moths') {
      game.continueAfterHabitat()
    }
  }

  function handleReplay() {
    localResultSaver.clearDraft()
    setDraftCandidate(null)
    setLiveMessage('A new field study is ready with a new placement seed.')
    game.replay()
  }

  return (
    <div
      className="app-shell"
      data-session-seed={session.seed}
      data-testid="app-shell"
    >
      <a className="skip-link" href="#main-content">Skip to field study</a>
      <GameHeader
        generation={game.currentGeneration}
        habitatLabel={game.currentHabitat.copy.shortTitle}
        stage={session.stage}
      />

      {systemAlert && <div className="system-alert" role="alert">{systemAlert}</div>}

      {draftCandidate && (
        <div className="draft-backdrop">
          <section
            aria-labelledby="draft-title"
            aria-modal="true"
            className="draft-recovery"
            data-testid="draft-recovery"
            role="dialog"
          >
            <p className="eyebrow">Saved on this device</p>
            <h2 id="draft-title">Resume your field study?</h2>
            <p>Your last study stopped before the final report.</p>
            <div className="button-row">
              <button
                className="primary-button"
                onClick={() => {
                  game.restore(draftCandidate.session)
                  setDraftCandidate(null)
                  setLiveMessage('Saved study resumed.')
                }}
                type="button"
              >
                Resume study
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  localResultSaver.clearDraft()
                  setDraftCandidate(null)
                }}
                type="button"
              >
                Start over
              </button>
            </div>
          </section>
        </div>
      )}

      {rendererMounted && (
        <div
          aria-hidden={!rendererActive}
          className={`persistent-renderer${rendererActive ? '' : ' persistent-renderer--hidden'}`}
        >
          <HabitatGame
            active={rendererActive}
            counts={game.currentSimulation.counts}
            durationMs={durationMs}
            forceRendererFailure={config.forceRendererFailure}
            generation={game.currentGeneration}
            habitatId={session.currentHabitatId}
            habitatTitle={game.currentHabitat.copy.title}
            hitAreaScale={timing.hitAreaScale}
            movementScale={timing.movementScale}
            onComplete={(metrics) => {
              game.completeRound(metrics)
              setLiveMessage(`Generation ${game.currentGeneration} complete. Review the population evidence.`)
            }}
            roundSeed={game.roundSeed}
            timingMode={session.selectedTimingMode ?? 'standard'}
          />
        </div>
      )}

      <main
        aria-label="Natural Selection predator and camouflage study"
        className={`game-main game-main--${session.stage}`}
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
      >
        {session.stage === 'mission' && (
          <MissionScreen onBegin={game.selectTiming} storageMessage={storageMessage} />
        )}

        {session.stage === 'prediction' && (
          <PredictionPanel habitat={game.currentHabitat} onSubmit={game.submitPrediction} />
        )}

        {session.stage === 'generation_review' && latestResult && (
          <GenerationPanel
            habitat={game.currentHabitat}
            onContinue={handleGenerationContinue}
            result={latestResult}
          />
        )}

        {session.stage === 'habitat_summary' && (
          <HabitatSummaryScreen
            habitatId={session.currentHabitatId}
            onContinue={game.continueAfterHabitat}
            points={game.graphPoints[session.currentHabitatId]}
          />
        )}

        {session.stage === 'evidence' && (
          <EvidenceScreen
            generations={{
              reef_fish: session.habitats.reef_fish.simulation.history,
              bark_moths: session.habitats.bark_moths.simulation.history,
            }}
            graphPoints={game.graphPoints}
            onContinue={game.enterChecks}
            onSelectComparison={game.selectComparisonEvidence}
            onTogglePopulation={game.togglePopulationEvidence}
            selectedComparison={session.evidence.comparison}
            selectedPopulation={session.evidence.population}
          />
        )}

        {session.stage === 'checks' && currentQuestion && (
          <MisconceptionScreen
            onAnswer={(answerId, correct) => game.answerCheck(currentQuestion.id, answerId, correct)}
            onContinue={game.nextCheck}
            question={currentQuestion}
            questionNumber={session.currentCheckIndex + 1}
            recordedAttempt={currentAttempt}
          />
        )}

        {session.stage === 'cer' && (
          <CerScreen
            claims={createCerClaimChoices(game.outcomes)}
            evidenceTexts={evidenceTexts}
            initialDraft={session.cer}
            onComplete={game.completeCer}
            onDraftChange={game.updateCer}
          />
        )}

        {session.stage === 'results' && session.completedResult && (
          <ResultsScreen
            graphPoints={game.graphPoints}
            onReplay={handleReplay}
            result={session.completedResult}
            storageMessage={storageMessage}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>Classroom model · No login required</span>
        <span>No names, periods, analytics, or network submissions</span>
      </footer>
      <div aria-atomic="true" aria-live="polite" className="sr-only">{liveMessage}</div>
    </div>
  )
}
