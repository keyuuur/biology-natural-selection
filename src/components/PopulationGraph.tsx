import { useId } from 'react'
import { HABITAT_STUDENT_COPY } from '../learning/index.ts'
import type { HabitatId } from '../simulation/index.ts'

export type PopulationGraphPoint = {
  generation: number
  counts: Readonly<{ camouflaged: number; conspicuous: number }>
  percentages: Readonly<{ camouflaged: number; conspicuous: number }>
}

type PopulationGraphProps = {
  habitatId: HabitatId
  title: string
  points: readonly PopulationGraphPoint[]
  selectedGenerations?: ReadonlySet<number>
  onToggleGeneration?: (generation: number) => void
  selectionHint?: string
}

const WIDTH = 680
const HEIGHT = 300
const PADDING = { left: 58, right: 24, top: 24, bottom: 42 }
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom

function pointCoordinates(generation: number, percentage: number, maxGeneration: number) {
  return {
    x: PADDING.left + (generation / Math.max(1, maxGeneration)) * PLOT_WIDTH,
    y: PADDING.top + ((100 - percentage) / 100) * PLOT_HEIGHT,
  }
}

function linePath(
  points: readonly PopulationGraphPoint[],
  morph: 'camouflaged' | 'conspicuous',
  maxGeneration: number,
) {
  return points
    .map((point, index) => {
      const coordinate = pointCoordinates(
        point.generation,
        point.percentages[morph],
        maxGeneration,
      )
      return `${index === 0 ? 'M' : 'L'} ${coordinate.x} ${coordinate.y}`
    })
    .join(' ')
}

function displayPercent(value: number): string {
  return Number(value.toFixed(1)).toString()
}

export function PopulationGraph({
  habitatId,
  title,
  points,
  selectedGenerations = new Set<number>(),
  onToggleGeneration,
  selectionHint,
}: PopulationGraphProps) {
  const titleId = useId()
  const descriptionId = useId()
  const maxGeneration = Math.max(3, ...points.map((point) => point.generation))
  const copy = HABITAT_STUDENT_COPY[habitatId]
  const { camouflaged: camouflagedLabel, conspicuous: conspicuousLabel } = copy.morphLabels

  return (
    <section
      className="graph-card"
      aria-labelledby={titleId}
      data-testid={`population-graph-${habitatId}`}
    >
      <div className="graph-card__heading">
        <div>
          <p className="eyebrow">Population evidence</p>
          <h3 id={titleId}>{title}</h3>
        </div>
        <div className="graph-legend" aria-label="Graph legend">
          <span><i className="legend-line legend-line--camo" />{camouflagedLabel}</span>
          <span><i className="legend-line legend-line--obvious" />{conspicuousLabel}</span>
        </div>
      </div>

      <div className="graph-svg-wrap">
        <svg
          className="trait-graph"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <desc id={descriptionId}>
            Line graph showing the percentage of {copy.organismLabel} with the {camouflagedLabel}{' '}
            and the {conspicuousLabel} from Generation 0 through Generation {maxGeneration}.
          </desc>
          {[0, 25, 50, 75, 100].map((value) => {
            const { y } = pointCoordinates(0, value, maxGeneration)
            return (
              <g key={value}>
                <line className="graph-gridline" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} />
                <text className="graph-axis-label" x={PADDING.left - 12} y={y + 5} textAnchor="end">
                  {value}%
                </text>
              </g>
            )
          })}
          {Array.from({ length: maxGeneration + 1 }, (_, generation) => {
            const { x } = pointCoordinates(generation, 0, maxGeneration)
            return (
              <text className="graph-axis-label" key={generation} x={x} y={HEIGHT - 12} textAnchor="middle">
                G{generation}
              </text>
            )
          })}
          <path className="graph-line graph-line--camo" d={linePath(points, 'camouflaged', maxGeneration)} />
          <path className="graph-line graph-line--obvious" d={linePath(points, 'conspicuous', maxGeneration)} />
          {points.flatMap((point) =>
            (['camouflaged', 'conspicuous'] as const).map((morph) => {
              const { x, y } = pointCoordinates(point.generation, point.percentages[morph], maxGeneration)
              const selected = selectedGenerations.has(point.generation)
              const className = `graph-point graph-point--${morph}${selected ? ' graph-point--selected' : ''}`
              return morph === 'camouflaged' ? (
                <circle className={className} cx={x} cy={y} key={`${point.generation}-${morph}`} r={selected ? 8 : 6} />
              ) : (
                <rect
                  className={className}
                  height={selected ? 15 : 12}
                  key={`${point.generation}-${morph}`}
                  rx="2"
                  width={selected ? 15 : 12}
                  x={x - (selected ? 7.5 : 6)}
                  y={y - (selected ? 7.5 : 6)}
                />
              )
            }),
          )}
        </svg>
      </div>

      {onToggleGeneration && (
        <div className="graph-selection">
          {selectionHint && <p>{selectionHint}</p>}
          <div className="generation-chip-row">
            {points.map((point) => {
              const selected = selectedGenerations.has(point.generation)
              return (
                <button
                  aria-label={`Generation ${point.generation}: ${displayPercent(point.percentages.camouflaged)}% ${camouflagedLabel}; ${displayPercent(point.percentages.conspicuous)}% ${conspicuousLabel}`}
                  aria-pressed={selected}
                  className={`generation-chip${selected ? ' is-selected' : ''}`}
                  key={point.generation}
                  onClick={() => onToggleGeneration(point.generation)}
                  type="button"
                >
                  <span>Generation {point.generation}</span>
                  <strong>{displayPercent(point.percentages.camouflaged)}% / {displayPercent(point.percentages.conspicuous)}%</strong>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="graph-table-scroll">
        <table data-testid={`population-table-${habitatId}`}>
          <caption>{copy.organismLabel} counts and percentages by generation</caption>
          <thead>
            <tr>
              <th scope="col">Generation</th>
              <th scope="col">{camouflagedLabel}</th>
              <th scope="col">{conspicuousLabel}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.generation}>
                <th scope="row">{point.generation}</th>
                <td>{point.counts.camouflaged}/40 ({displayPercent(point.percentages.camouflaged)}%)</td>
                <td>{point.counts.conspicuous}/40 ({displayPercent(point.percentages.conspicuous)}%)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
