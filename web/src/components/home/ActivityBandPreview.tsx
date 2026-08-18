/**
 * Decorative "product shot" for the homepage Activity band.
 *
 * Curve and scatter shapes only, no assay numbers asserted — the plate-reader
 * export this would read from doesn't exist yet, so there is nothing real to
 * chart. Colors match the canonical BHET palette used on the real
 * `/substrate` comparison page once it ships.
 */

const CHART_W = 300
const CHART_H = 150
const PAD = { l: 26, r: 6, t: 8, b: 18 }

/** Saturating-hydrolysis shape: fast rise then plateau, one curve per substrate. */
const SERIES = [
  { color: "#2E86AB", label: "12.5 mM", k: 0.42, top: 0.55 },
  { color: "#A23B72", label: "25 mM", k: 0.3, top: 0.78 },
  { color: "#F18F01", label: "50 mM", k: 0.2, top: 0.95 },
]

function px(t: number) {
  return PAD.l + t * (CHART_W - PAD.l - PAD.r)
}
function py(v: number) {
  return CHART_H - PAD.b - v * (CHART_H - PAD.t - PAD.b)
}

function TimeseriesChart() {
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      preserveAspectRatio="none"
      className="block h-full w-full"
    >
      <line
        x1={PAD.l}
        y1={PAD.t}
        x2={PAD.l}
        y2={CHART_H - PAD.b}
        stroke="rgba(255,255,255,0.18)"
      />
      <line
        x1={PAD.l}
        y1={CHART_H - PAD.b}
        x2={CHART_W - PAD.r}
        y2={CHART_H - PAD.b}
        stroke="rgba(255,255,255,0.18)"
      />
      <text
        x={4}
        y={PAD.t + 8}
        fill="rgba(255,255,255,0.45)"
        fontSize={7}
        fontFamily="monospace"
      >
        A400
      </text>
      <text
        x={CHART_W - 30}
        y={CHART_H - 6}
        fill="rgba(255,255,255,0.45)"
        fontSize={7}
        fontFamily="monospace"
      >
        time
      </text>
      {SERIES.map(s => {
        const points = Array.from({ length: 25 }, (_, j) => {
          const t = j / 24
          return `${px(t)},${py(s.top * (1 - Math.exp(-t / s.k)))}`
        }).join(" ")
        return (
          <polyline
            key={s.label}
            points={points}
            fill="none"
            stroke={s.color}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

const SCATTER_W = 150
const SCATTER_H = 150
const SCATTER_PAD = 20

/** Deterministic jitter around the diagonal — a shape, not a measurement. */
const SCATTER_DOTS = Array.from({ length: 30 }, (_, i) => {
  const a = (i * 0.0721) % 1
  const jitter = Math.sin(i * 12.9898) * 0.5 + 0.5 - 0.5
  const b = Math.min(0.96, Math.max(0.04, a * 0.8 + jitter * 0.32))
  return {
    cx: SCATTER_PAD + a * (SCATTER_W - SCATTER_PAD * 2),
    cy: SCATTER_H - SCATTER_PAD - b * (SCATTER_H - SCATTER_PAD * 2),
    color: i % 3 === 0 ? "#F18F01" : i % 3 === 1 ? "#A23B72" : "#2E86AB",
  }
})

function ScatterChart() {
  return (
    <svg
      viewBox={`0 0 ${SCATTER_W} ${SCATTER_H}`}
      preserveAspectRatio="none"
      className="block h-full w-full"
    >
      <line
        x1={SCATTER_PAD}
        y1={SCATTER_H - SCATTER_PAD}
        x2={SCATTER_W - SCATTER_PAD}
        y2={SCATTER_PAD}
        stroke="rgba(255,255,255,0.18)"
        strokeDasharray="3 3"
      />
      <line
        x1={SCATTER_PAD}
        y1={SCATTER_PAD}
        x2={SCATTER_PAD}
        y2={SCATTER_H - SCATTER_PAD}
        stroke="rgba(255,255,255,0.18)"
      />
      <line
        x1={SCATTER_PAD}
        y1={SCATTER_H - SCATTER_PAD}
        x2={SCATTER_W - SCATTER_PAD}
        y2={SCATTER_H - SCATTER_PAD}
        stroke="rgba(255,255,255,0.18)"
      />
      {SCATTER_DOTS.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={2.2}
          fill={d.color}
          fillOpacity={0.75}
        />
      ))}
    </svg>
  )
}

export function ActivityBandPreview() {
  return (
    <div className="border-border bg-surface-sunken relative grid aspect-16/10 max-h-105 w-full grid-cols-[1.25fr_1fr] overflow-hidden rounded-xl border">
      <div className="border-border flex min-w-0 flex-col gap-1.5 overflow-hidden border-r p-3">
        <span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
          Hydrolysis timeseries
        </span>
        <div className="min-h-0 flex-1">
          <TimeseriesChart />
        </div>
        <div className="flex flex-wrap gap-2">
          {SERIES.map(s => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1 font-mono text-[9px] text-white/80"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden p-3">
        <span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
          Substrate vs substrate
        </span>
        <div className="min-h-0 flex-1">
          <ScatterChart />
        </div>
        <span className="font-mono text-[9px] text-white/40">
          shape only — awaiting assay export
        </span>
      </div>
    </div>
  )
}
