import React from 'react'

type TrendPoint = { key: string; label: string; income: number; expenses: number }

const CHART_HEIGHT = 200
const BAR_GROUP_WIDTH = 64
const BAR_WIDTH = 20
const BAR_GAP = 4
const TOP_PADDING = 16
const AXIS_HEIGHT = 24

export function TrendBarChart({ data }: { data: TrendPoint[] }) {
  const maxValue = Math.max(1, ...data.flatMap((d) => [d.income, d.expenses]))
  const plotHeight = CHART_HEIGHT - TOP_PADDING
  const width = data.length * BAR_GROUP_WIDTH

  const scale = (value: number) => (value / maxValue) * plotHeight

  const gridLines = [0.25, 0.5, 0.75, 1]

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <svg
        viewBox={`0 0 ${Math.max(width, 280)} ${CHART_HEIGHT + AXIS_HEIGHT}`}
        className="w-full"
        style={{ minWidth: data.length > 4 ? `${width}px` : undefined, height: CHART_HEIGHT + AXIS_HEIGHT }}
        role="img"
        aria-label="Monthly income versus expenses trend"
      >
        {/* Gridlines */}
        {gridLines.map((g) => (
          <line
            key={g}
            x1={0}
            x2={Math.max(width, 280)}
            y1={TOP_PADDING + plotHeight * (1 - g)}
            y2={TOP_PADDING + plotHeight * (1 - g)}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />
        ))}

        {data.map((point, i) => {
          const groupX = i * BAR_GROUP_WIDTH + (BAR_GROUP_WIDTH - (BAR_WIDTH * 2 + BAR_GAP)) / 2
          const incomeHeight = scale(point.income)
          const expenseHeight = scale(point.expenses)
          const baseline = TOP_PADDING + plotHeight

          return (
            <g key={point.key}>
              <rect
                x={groupX}
                y={baseline - incomeHeight}
                width={BAR_WIDTH}
                height={Math.max(incomeHeight, 1)}
                rx={4}
                fill="var(--chart-income)"
              >
                <title>{`${point.label} · Income: ₹${point.income.toLocaleString('en-IN')}`}</title>
              </rect>
              <rect
                x={groupX + BAR_WIDTH + BAR_GAP}
                y={baseline - expenseHeight}
                width={BAR_WIDTH}
                height={Math.max(expenseHeight, 1)}
                rx={4}
                fill="var(--chart-expense)"
              >
                <title>{`${point.label} · Expenses: ₹${point.expenses.toLocaleString('en-IN')}`}</title>
              </rect>
              <text
                x={i * BAR_GROUP_WIDTH + BAR_GROUP_WIDTH / 2}
                y={CHART_HEIGHT + AXIS_HEIGHT - 6}
                textAnchor="middle"
                fontSize={11}
                fill="hsl(var(--muted-foreground))"
              >
                {point.label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex items-center gap-4 mt-2 px-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ backgroundColor: 'var(--chart-income)' }} />
          Income
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ backgroundColor: 'var(--chart-expense)' }} />
          Expenses
        </span>
      </div>
    </div>
  )
}
