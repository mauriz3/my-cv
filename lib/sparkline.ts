/**
 * SVG mini-chart geometry for the Profile «Visits» card (no chart libraries).
 * Pure logic: `d` paths for a line and area, and donut arcs as fractions of the circumference.
 */

export interface SparklinePaths {
  line: string
  area: string
}

const round = (value: number) => Number(value.toFixed(2))

/** Line and area (to baseline) for a series, scaled to `width × height` with max at the top. */
export function sparklinePaths(values: readonly number[], width: number, height: number): SparklinePaths {
  if (values.length === 0) return { line: '', area: '' }
  const max = Math.max(...values, 1)
  const stepX = values.length > 1 ? width / (values.length - 1) : 0
  const points = values.map((value, index) => [round(index * stepX), round(height - (value / max) * height)] as const)
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
  const lastX = points.at(-1)![0]
  return { line, area: `${line} L${lastX} ${height} L0 ${height} Z` }
}

export interface DonutArc {
  /** Fraction of the circumference where the arc starts (0 = top). */
  start: number
  /** Fraction of the circumference the arc spans. */
  length: number
}

/** Consecutive donut arcs from values (any scale). */
export function donutArcs(values: readonly number[]): DonutArc[] {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return values.map(() => ({ start: 0, length: 0 }))
  let start = 0
  return values.map((value) => {
    const arc = { start, length: value / total }
    start += arc.length
    return arc
  })
}

export type EndTrend = 'rising' | 'falling' | 'steady'

/** Minimum relative difference between means to call it rising or falling. */
const STEADY_TOLERANCE = 0.05

/** Trend at the end of the series: mean of last window vs previous. */
export function endTrend(values: readonly number[], window = 7): EndTrend {
  if (values.length < window * 2) return 'steady'
  const mean = (slice: readonly number[]) => slice.reduce((sum, value) => sum + value, 0) / slice.length
  const recent = mean(values.slice(-window))
  const before = mean(values.slice(-window * 2, -window))
  if (before === 0) return 'steady'
  const change = recent / before - 1
  if (Math.abs(change) < STEADY_TOLERANCE) return 'steady'
  return change > 0 ? 'rising' : 'falling'
}
