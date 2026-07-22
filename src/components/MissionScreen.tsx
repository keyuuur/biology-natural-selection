import { useState } from 'react'
import type { StudyRoute } from '../game/sessionTypes.ts'
import type { SelectedTimingMode } from '../simulation/index.ts'
import { ScreenCard } from './ScreenCard.tsx'
import { StageActionDock } from './StageActionDock.tsx'

type MissionScreenProps = {
  storageMessage: string
  onBegin: (route: StudyRoute, timingMode?: SelectedTimingMode) => void
}

export function MissionScreen({ storageMessage, onBegin }: MissionScreenProps) {
  const [route, setRoute] = useState<StudyRoute | null>(null)
  const [mode, setMode] = useState<SelectedTimingMode>('standard')
  const canBegin = route === 'observation' || (route === 'predator' && mode !== null)
  const actionLabel = route === 'observation' ? 'Begin observation study' : 'Begin predator study'
  const actionStatus = route === null
    ? 'Choose how you will collect evidence.'
    : route === 'observation'
      ? 'Observation study selected — the same science evidence awaits.'
      : `${mode === 'extended' ? 'Extended' : 'Standard'} predator study selected.`

  return (
    <ScreenCard
      className="mission-card"
      eyebrow="Predator field study"
      headingId="mission-stage-heading"
      stageHeading
      title="Can you see natural selection happen?"
    >
      <div className="mission-grid" data-testid="mission-screen">
        <div className="mission-core">
          <p className="lead">
            Act as a predator—or choose the Observation study—to gather evidence about inherited
            patterns, survival, reproduction, and changing population percentages.
          </p>
          <div className="science-notice">
            Individuals never change their own inherited pattern. Natural selection changes the
            percentage of traits in a population across generations.
          </div>

          <fieldset className="choice-fieldset study-route-picker">
            <legend>How will you collect evidence?</legend>
            <div className="choice-stack">
              <label className={`choice-card choice-card--reason${route === 'predator' ? ' is-selected' : ''}`}>
                <input
                  checked={route === 'predator'}
                  data-testid="study-route-predator"
                  name="study-route"
                  onChange={() => setRoute('predator')}
                  type="radio"
                />
                <span>
                  <strong>Predator study</strong>
                  Tap organisms you notice, then use your population evidence to explain the change.
                </span>
              </label>
              <label className={`choice-card choice-card--reason${route === 'observation' ? ' is-selected' : ''}`}>
                <input
                  checked={route === 'observation'}
                  data-testid="study-route-observation"
                  name="study-route"
                  onChange={() => setRoute('observation')}
                  type="radio"
                />
                <span>
                  <strong>Observation study</strong>
                  The model resolves predation while you investigate the same graphs, checks, and field report.
                </span>
              </label>
            </div>
          </fieldset>

          {route === 'predator' && (
            <fieldset className="mode-picker">
              <legend>Choose predator-study timing</legend>
              <label className={`mode-card${mode === 'standard' ? ' is-selected' : ''}`}>
                <input
                  checked={mode === 'standard'}
                  name="timing-mode"
                  onChange={() => setMode('standard')}
                  type="radio"
                />
                <span><strong>Standard</strong><small>25 seconds per generation</small></span>
              </label>
              <label className={`mode-card${mode === 'extended' ? ' is-selected' : ''}`}>
                <input
                  checked={mode === 'extended'}
                  name="timing-mode"
                  onChange={() => setMode('extended')}
                  type="radio"
                />
                <span><strong>Extended</strong><small>40 seconds, slower movement, larger tap areas</small></span>
              </label>
            </fieldset>
          )}

          <StageActionDock
            disabled={!canBegin}
            disabledReason="Choose a study route to begin."
            onPrimary={() => route && onBegin(route, route === 'predator' ? mode : undefined)}
            primaryLabel={actionLabel}
            status={actionStatus}
          />
        </div>

        <div className="mission-support">
          <div className="mission-art" aria-hidden="true">
            <div className="art-panel art-panel--reef">
              <span className="fish-mark fish-mark--mottled">•••</span>
              <span className="fish-mark fish-mark--solid">|||</span>
            </div>
            <div className="art-panel art-panel--bark">
              <span className="moth-mark moth-mark--mottled">••</span>
              <span className="moth-mark moth-mark--solid">==</span>
            </div>
            <div className="art-caption">2 habitats · 3 generations each · your evidence</div>
          </div>
          <section aria-labelledby="mission-steps-title">
            <h3 id="mission-steps-title">What you will do</h3>
            <ul className="mission-checklist">
              <li>Compare two inherited patterns in each habitat.</li>
              <li>Follow survivors into a new offspring generation.</li>
              <li>Use graphs and rates to explain population change.</li>
            </ul>
          </section>
          <p className="storage-status">{storageMessage}</p>
        </div>
      </div>
    </ScreenCard>
  )
}
