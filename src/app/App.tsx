import { useEffect, useRef, useState } from 'react'
import { CerScreen } from '../components/CerScreen.tsx'
import { EvidenceScreen } from '../components/EvidenceScreen.tsx'
import { FieldScene, type FieldSceneHandle } from '../components/FieldScene.tsx'
import { GameHeader } from '../components/GameHeader.tsx'
import { GenerationPanel } from '../components/GenerationPanel.tsx'
import { MisconceptionScreen } from '../components/MisconceptionScreen.tsx'
import { MissionScreen } from '../components/MissionScreen.tsx'
import { ObservePanel } from '../components/ObservePanel.tsx'
import { PopulationGraph } from '../components/PopulationGraph.tsx'
import { PredictionPanel } from '../components/PredictionPanel.tsx'
import { ResultsScreen } from '../components/ResultsScreen.tsx'
import { buildSessionResult, useGameSession } from '../game/useGameSession.ts'
import { localResultSaver } from '../storage/resultSaver.ts'
import './app.css'

export function App() {
  const game = useGameSession()
  const { session } = game
  const sceneRef = useRef<FieldSceneHandle>(null)
  const mainRef = useRef<HTMLElement>(null)
  const previousStageRef = useRef(session.stage)
  const [isAnimating, setIsAnimating] = useState(false)
  const [liveMessage, setLiveMessage] = useState('Mission ready.')
  const [storageMessage, setStorageMessage] = useState(
    'Results stay on this device and are never sent anywhere.',
  )
  const [gameplayError, setGameplayError] = useState<string | null>(null)

  useEffect(() => {
    const result = session.completedResult ?? buildSessionResult(session, 'draft')
    let active = true

    void localResultSaver
      .save(result)
      .then(() => {
        if (!active) return
        setStorageMessage(
          result.completionState === 'complete'
            ? 'Field report saved locally on this device. Nothing was sent.'
            : 'Draft saved locally on this device. Nothing was sent.',
        )
      })
      .catch((error: unknown) => {
        if (!active) return
        setStorageMessage(
          `${error instanceof Error ? error.message : String(error)} Gameplay can continue.`,
        )
      })

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (previousStageRef.current === session.stage) return
    previousStageRef.current = session.stage
    const frameId = window.requestAnimationFrame(() => mainRef.current?.focus())
    return () => window.cancelAnimationFrame(frameId)
  }, [session.stage])

  async function handleRunGeneration() {
    if (isAnimating) return
    setGameplayError(null)
    setIsAnimating(true)
    try {
      const prepared = game.prepareGeneration()
      await sceneRef.current?.playGeneration(prepared.result)
      game.commitGeneration(prepared.nextState)
      setLiveMessage(
        `Generation ${prepared.result.generation} complete. The new population has ${prepared.result.endingCounts.higher_speed} higher-speed and ${prepared.result.endingCounts.lower_speed} lower-speed deer.`,
      )
    } catch (error) {
      setGameplayError(
        error instanceof Error ? error.message : 'The generation could not run.',
      )
    } finally {
      setIsAnimating(false)
    }
  }

  const fieldStage =
    session.stage === 'observe' ||
    session.stage === 'prediction' ||
    session.stage === 'generations'

  const latestResult = session.simulation.history.at(-1)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to field study</a>
      <GameHeader stage={session.stage} generation={session.simulation.generation} />

      <main
        aria-label="Natural Selection field study"
        className={`game-main game-main--${session.stage}`}
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
      >
        {session.stage === 'mission' && <MissionScreen onBegin={game.enterObserve} />}

        {fieldStage && (
          <div className="field-workspace">
            <section className="habitat-column" aria-labelledby="habitat-title">
              <div className="habitat-heading">
                <div>
                  <p className="eyebrow">Live habitat model</p>
                  <h2 id="habitat-title">Distant Food Meadow</h2>
                </div>
                <span className="generation-badge">Generation {session.simulation.generation}</span>
              </div>
              <FieldScene
                counts={session.simulation.counts}
                generation={session.simulation.generation}
                ref={sceneRef}
              />
              <p className="field-caption">
                Limited food lies in the far feeding zone. Rings and symbols help track
                the variants; movement speed is the inherited trait.
              </p>
            </section>

            <aside className="field-sidebar">
              {session.stage === 'observe' && (
                <ObservePanel
                  counts={session.simulation.counts}
                  onContinue={game.enterPrediction}
                />
              )}
              {session.stage === 'prediction' && (
                <PredictionPanel onSubmit={game.commitPrediction} />
              )}
              {session.stage === 'generations' && (
                <GenerationPanel
                  counts={session.simulation.counts}
                  currentGeneration={session.simulation.generation}
                  isAnimating={isAnimating}
                  latestResult={latestResult}
                  onRun={handleRunGeneration}
                />
              )}
              {gameplayError && (
                <div className="feedback-box feedback-box--retry" role="alert">
                  <strong>Generation paused.</strong>
                  <p>{gameplayError} The last valid population was kept.</p>
                </div>
              )}
            </aside>

            <div className="field-graph-row">
              <PopulationGraph points={game.graphPoints} />
            </div>
          </div>
        )}

        {session.stage === 'misconception' && (
          <MisconceptionScreen
            graphPoints={game.graphPoints}
            onAnswer={game.answerMisconception}
            onContinue={game.enterEvidence}
            recordedResponse={session.misconceptionResponse}
          />
        )}

        {session.stage === 'evidence' && (
          <EvidenceScreen
            generations={session.simulation.history}
            graphPoints={game.graphPoints}
            onContinue={game.enterCer}
            onSelectSurvivorGeneration={game.selectSurvivorGeneration}
            onToggleGeneration={game.toggleEvidenceGeneration}
            selectedGenerations={session.evidence.generationIds}
            survivorGeneration={session.evidence.survivorGeneration}
          />
        )}

        {session.stage === 'cer' && (
          <CerScreen evidenceTexts={game.evidenceTexts} onComplete={game.completeCer} />
        )}

        {session.stage === 'results' && session.completedResult && (
          <ResultsScreen
            graphPoints={game.graphPoints}
            onReplay={() => {
              game.replay()
              setGameplayError(null)
              setLiveMessage('A new field-study session is ready.')
            }}
            result={session.completedResult}
            storageMessage={storageMessage}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>Classroom model · No login required</span>
        <span>No names, periods, or scores collected</span>
      </footer>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </div>
  )
}
