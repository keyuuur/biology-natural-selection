import type { TraitGraphPoint } from '../simulation/index.ts'

type PopulationGraphProps = {
  points: readonly TraitGraphPoint[]
  selectedGenerations?: ReadonlySet<number>
  onToggleGeneration?: (generation: number) => void
  selectionHint?: string
}

const WIDTH = 680
const HEIGHT = 300
const PADDING = { left: 58, right: 24, top: 24, bottom: 42 }
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom

function pointCoordinates(generation: number, percentage: number) {
  return {
    x: PADDING.left + (generation / 5) * PLOT_WIDTH,
    y: PADDING.top + ((100 - percentage) / 100) * PLOT_HEIGHT,
  }
}

function linePath(points: readonly TraitGraphPoint[], trait: 'higher_speed' | 'lower_speed') {
  return points
    .map((point, index) => {
      const coordinate = pointCoordinates(point.generation, point.percentages[trait])
      return `${index === 0 ? 'M' : 'L'} ${coordinate.x} ${coordinate.y}`
    })
    .join(' ')
}

export function PopulationGraph({
  points,
  selectedGenerations = new Set<number>(),
  onToggleGeneration,
  selectionHint,
}: PopulationGraphProps) {
  return (
    <section className="graph-card" aria-labelledby="trait-graph-title">
      <div className="graph-card__heading">
        <div>
          <p className="eyebrow">Population evidence</p>
          <h3 id="trait-graph-title">Inherited trait frequency</h3>
        </div>
        <div className="graph-legend" aria-label="Graph legend">
          <span><i className="legend-line legend-line--higher" />Higher-speed</span>
          <span><i className="legend-line legend-line--lower" />Lower-speed</span>
        </div>
      </div>

      <div className="graph-svg-wrap">
        <svg
          className="trait-graph"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby="trait-graph-title trait-graph-description"
        >
          <desc id="trait-graph-description">
            A line graph showing the percentage of higher-speed and lower-speed deer
            from Generation 0 through the latest completed generation.
          </desc>
          {[0, 25, 50, 75, 100].map((value) => {
            const { y } = pointCoordinates(0, value)
            return (
              <g key={value}>
                <line
                  className="graph-gridline"
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                />
                <text className="graph-axis-label" x={PADDING.left - 12} y={y + 5} textAnchor="end">
                  {value}%
                </text>
              </g>
            )
          })}
          {Array.from({ length: 6 }, (_, generation) => {
            const { x } = pointCoordinates(generation, 0)
            return (
              <text
                className="graph-axis-label"
                key={generation}
                x={x}
                y={HEIGHT - 12}
                textAnchor="middle"
              >
                G{generation}
              </text>
            )
          })}
          <path className="graph-line graph-line--higher" d={linePath(points, 'higher_speed')} />
          <path className="graph-line graph-line--lower" d={linePath(points, 'lower_speed')} />
          {points.flatMap((point) =>
            (['higher_speed', 'lower_speed'] as const).map((trait) => {
              const { x, y } = pointCoordinates(point.generation, point.percentages[trait])
              const selected = selectedGenerations.has(point.generation)
              const className = `graph-point graph-point--${trait}${selected ? ' graph-point--selected' : ''}`
              return trait === 'higher_speed' ? (
                <circle
                  className={className}
                  cx={x}
                  cy={y}
                  key={`${point.generation}-${trait}`}
                  r={selected ? 8 : 6}
                />
              ) : (
                <rect
                  className={className}
                  height={selected ? 15 : 12}
                  key={`${point.generation}-${trait}`}
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
                  aria-pressed={selected}
                  className="generation-chip"
                  key={point.generation}
                  onClick={() => onToggleGeneration(point.generation)}
                  type="button"
                >
                  <span>Generation {point.generation}</span>
                  <strong>
                    {point.percentages.higher_speed}% / {point.percentages.lower_speed}%
                  </strong>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="graph-table-scroll">
        <table>
          <caption>Trait counts and percentages by generation</caption>
          <thead>
            <tr>
              <th scope="col">Generation</th>
              <th scope="col">Higher-speed</th>
              <th scope="col">Lower-speed</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.generation}>
                <th scope="row">{point.generation}</th>
                <td>{point.counts.higher_speed}/20 ({point.percentages.higher_speed}%)</td>
                <td>{point.counts.lower_speed}/20 ({point.percentages.lower_speed}%)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
