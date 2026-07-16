import { useState } from 'react'
import type { SelectedTimingMode } from '../simulation/index.ts'
import { ScreenCard } from './ScreenCard.tsx'

type MissionScreenProps = {
  storageMessage: string
  onBegin: (mode: SelectedTimingMode) => void
}

export function MissionScreen({ storageMessage, onBegin }: MissionScreenProps) {
  const [mode, setMode] = useState<SelectedTimingMode>('standard')

  return (
    <ScreenCard
      className="mission-card"
      eyebrow="Predator field study"
      title="Can you see natural selection happen?"
      footer={
        <button
          className="primary-button"
          data-testid="primary-action"
          onClick={() => onBegin(mode)}
          type="button"
        >
          Begin the study
        </button>
      }
    >
      <div className="mission-grid" data-testid="mission-screen">
        <div className="mission-art" aria-hidden="true">
          <div className="art-panel art-panel--reef">
            <span className="fish-mark fish-mark--mottled">•••</span>
            <span className="fish-mark fish-mark--solid">|||</span>
          </div>
          <div className="art-panel art-panel--bark">
            <span className="moth-mark moth-mark--mottled">••</span>
            <span className="moth-mark moth-mark--solid">==</span>
          </div>
          <div className="art-caption">2 habitats · 6 generations · your evidence</div>
        </div>

        <div className="mission-copy">
          <p className="lead">
            You are the predator. Tap whichever fish and moths you notice first, then track which inherited patterns survive and reproduce.
          </p>
          <ul className="mission-checklist">
            <li>Compare mottled and solid inherited patterns.</li>
            <li>Follow survivors into a new offspring generation.</li>
            <li>Use graphs and rates to explain population change.</li>
          </ul>
          <div className="science-notice">
            Individuals never change their own inherited pattern. Natural selection changes the percentage of traits in a population across generations.
          </div>

          <fieldset className="mode-picker">
            <legend>Choose a play mode</legend>
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
          <p className="storage-status">{storageMessage}</p>
        </div>
      </div>
    </ScreenCard>
  )
}
