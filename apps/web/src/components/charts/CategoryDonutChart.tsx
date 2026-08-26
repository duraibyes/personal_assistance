import React from 'react'

type CategorySlice = { name: string; icon: string | null; total: number; percentage: number }

const CHART_COLORS = [
  'var(--chart-cat-1)', 'var(--chart-cat-2)', 'var(--chart-cat-3)', 'var(--chart-cat-4)',
  'var(--chart-cat-5)', 'var(--chart-cat-6)', 'var(--chart-cat-7)', 'var(--chart-cat-8)',
]

const SIZE = 200
const CENTER = SIZE / 2
const OUTER_R = 90
const INNER_R = 56

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

function describeDonutSlice(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle)
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle)
  const startInner = polarToCartesian(cx, cy, innerR, startAngle)
  const endInner = polarToCartesian(cx, cy, innerR, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerR, outerR, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', startInner.x, startInner.y,
    'A', innerR, innerR, 0, largeArcFlag, 1, endInner.x, endInner.y,
    'Z',
  ].join(' ')
}

/** Merges everything past the first 7 slices into "Other" — keeps the palette's validated 8-slot cap. */
function capSlices(slices: CategorySlice[]): CategorySlice[] {
  if (slices.length <= 8) return slices
  const top = slices.slice(0, 7)
  const rest = slices.slice(7)
  const otherTotal = rest.reduce((acc, s) => acc + s.total, 0)
  const otherPct = rest.reduce((acc, s) => acc + s.percentage, 0)
  return [...top, { name: 'Other', icon: null, total: otherTotal, percentage: otherPct }]
}

export function CategoryDonutChart({ data, grandTotal }: { data: CategorySlice[]; grandTotal: number }) {
  const slices = capSlices(Array.isArray(data) ? data : [])

  if (slices.length === 0 || grandTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-muted-foreground">No expenses recorded this month yet.</p>
      </div>
    )
  }

  let cumulativeAngle = 0

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-44 h-44 shrink-0" role="img" aria-label="Expense breakdown by category">
        {slices.map((slice, i) => {
          const angleSpan = (slice.percentage / 100) * 360
          const startAngle = cumulativeAngle
          const endAngle = cumulativeAngle + angleSpan
          cumulativeAngle = endAngle

          const path = describeDonutSlice(CENTER, CENTER, OUTER_R, INNER_R, startAngle, endAngle)
          return (
            <path
              key={slice.name}
              d={path}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              <title>{`${slice.name}: ₹${slice.total.toLocaleString('en-IN')} (${slice.percentage.toFixed(1)}%)`}</title>
            </path>
          )
        })}
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(var(--foreground))">
          ₹{grandTotal >= 100000 ? `${(grandTotal / 100000).toFixed(1)}L` : grandTotal.toLocaleString('en-IN')}
        </text>
        <text x={CENTER} y={CENTER + 12} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
          Total
        </text>
      </svg>

      <ul className="flex-1 w-full space-y-2 min-w-0">
        {slices.map((slice, i) => (
          <li key={slice.name} className="flex items-center justify-between gap-2 text-sm min-w-0">
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-foreground truncate">{slice.icon ? `${slice.icon} ` : ''}{slice.name}</span>
            </span>
            <span className="text-muted-foreground text-xs shrink-0">{slice.percentage.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
