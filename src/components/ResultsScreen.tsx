import type {
  HabitatId,
  NaturalSelectionResult,
  PopulationGraphPoint,
} from '../simulation/index.ts'
import { PopulationGraph } from './PopulationGraph.tsx'
import { ScreenCard } from './ScreenCard.tsx'

type ResultsScreenProps = {
  result: NaturalSelectionResult
  graphPoints: Readonly<Record<HabitatId, readonly PopulationGraphPoint[]>>
  storageMessage?: string
  onReplay: () => void
}

type StudyPresentation = 'predator' | 'observation' | 'renderer_failure'

function classifyStudyPresentation(result: NaturalSelectionResult): StudyPresentation {
  const generations = (['reef_fish', 'bark_moths'] as const).flatMap(
    (habitatId) => result.habitats[habitatId].generations,
  )
  if (generations.some((generation) => generation.fallbackUsed)) return 'renderer_failure'
  if (generations.length > 0 && generations.every((generation) => generation.inputMode === 'observation')) {
    return 'observation'
  }
  return 'predator'
}

function timingLabel(mode: NaturalSelectionResult['selectedTimingMode']) {
  return mode === 'extended' ? 'Extended timing' : 'Standard timing'
}

export function ResultsScreen({
  result,
  graphPoints,
  storageMessage,
  onReplay,
}: ResultsScreenProps) {
  const presentation = classifyStudyPresentation(result)
  const scienceComplete =
    result.scienceCompletion.evidenceComplete && result.scienceCompletion.cerComplete

  return (
    <div className="results-layout" data-testid="results-screen">
      <ScreenCard
        className="results-card"
        eyebrow="Field study complete"
        title="Your evidence tells a population story"
      >
        <section className="result-section" aria-labelledby="predator-performance-title">
          <p className="eyebrow">Gameplay result</p>
          <h3 id="predator-performance-title">Predator Performance</h3>
          <p data-testid="timing-mode-result">
            {presentation === 'observation' ? 'Observation study' : timingLabel(result.selectedTimingMode)}
          </p>
          {presentation === 'observation' ? (
            <div className="feedback-box" data-testid="predator-score-unavailable">
              <strong>Predator performance was not part of your Observation study.</strong>
              <p>
                You completed the same science evidence and field report without a predator score.
              </p>
            </div>
          ) : presentation === 'renderer_failure' ? (
            <div className="feedback-box" data-testid="predator-score-unavailable">
              <strong>Predator performance is unavailable because graphics could not load.</strong>
              <p>
                Observation mode completed predation automatically. Your science evidence and CER
                are still complete.
              </p>
            </div>
          ) : (
            <dl className="metric-grid">
              <div><dt>Points</dt><dd>{result.predatorPerformance.points}</dd></div>
              <div><dt>Manual captures</dt><dd>{result.predatorPerformance.manualCaptures}</dd></div>
              <div><dt>Misses</dt><dd>{result.predatorPerformance.misses}</dd></div>
              <div><dt>Tap accuracy</dt><dd>{Math.round(result.predatorPerformance.accuracyPercent)}%</dd></div>
            </dl>
          )}
          <p className="model-note">
            Predator performance is a gameplay record. It is not combined with the science study.
          </p>
        </section>

        <section className="result-section" aria-labelledby="science-study-title">
          <p className="eyebrow">Learning result</p>
          <h3 id="science-study-title">Science Study</h3>
          <div className="science-completion" data-testid="science-completion">
            <strong>{scienceComplete ? 'Complete' : 'Incomplete'}</strong>
            <span>Evidence selected · Four checks corrected · CER submitted</span>
          </div>
          <p data-testid="first-attempt-score">
            First-attempt questions: {result.scienceCompletion.firstAttemptCorrect} of{' '}
            {result.scienceCompletion.questionCount} correct
          </p>
          <p>
            Corrections support learning. The first-attempt count is shown separately and is not a
            combined grade.
          </p>
        </section>

        <section className="final-cer" aria-labelledby="saved-cer-title">
          <p className="eyebrow">Saved field report</p>
          <h3 id="saved-cer-title">Your CER</h3>
          <blockquote>{result.cer.reasoning}</blockquote>
          <p className="model-note">Your free-text reasoning was saved but was not automatically graded.</p>
        </section>

        {storageMessage && <p className="storage-status">{storageMessage}</p>}

        <button
          className="secondary-button secondary-button--full"
          data-testid="primary-action"
          onClick={onReplay}
          type="button"
        >
          Start a new study
        </button>
      </ScreenCard>

      <div className="results-graphs">
        <PopulationGraph
          habitatId="reef_fish"
          points={graphPoints.reef_fish}
          title="Reef fish population evidence"
        />
        <PopulationGraph
          habitatId="bark_moths"
          points={graphPoints.bark_moths}
          title="Bark moth population evidence"
        />
      </div>
    </div>
  )
}
