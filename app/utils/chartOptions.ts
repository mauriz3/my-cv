import type { Plugin } from 'chart.js'
import type { ChartTheme } from '~/composables/useChartTheme'

/** Common parts of Visits charts (Chart.js). */

export const CHART_FONT_SIZE_PX = 12
const TOOLTIP_PADDING_PX = 8
const TOOLTIP_RADIUS_PX = 8
const MAX_VALUE_TICKS = 5

/** Input animation; with animations off, none (`animation: false`). */
export function chartAnimation(isReduced: boolean, durationMs: number) {
  return isReduced ? (false as const) : { duration: durationMs, easing: 'easeOutQuart' as const }
}

/** Graphs that must return to their base in the next update (activation with the graph in view). */
const chartsWaitingToReplay = new WeakSet<object>()

export function markChartReplay(chart: object) {
  chartsWaitingToReplay.add(chart)
}

function consumeChartReplay(chart: object): boolean {
  if (!chartsWaitingToReplay.has(chart)) return false
  chartsWaitingToReplay.delete(chart)
  return true
}

/**
 * When moving to `animation: false`, for the animation in progress (the `update('none')` leaves the final state).
 * If the graph is checked, `reset()` returns it to its base in that same update.
 */
export const finishAnimationsWhenDisabled: Plugin = {
  id: 'finishAnimationsWhenDisabled',
  beforeUpdate(chart) {
    if (chart.options.animation === false) {
      chart.stop()
      return
    }
    if (consumeChartReplay(chart)) chart.reset()
  },
}

export function chartFont(theme: ChartTheme) {
  return { family: theme.font, size: CHART_FONT_SIZE_PX }
}

/** Tooltip with the inverted contrast of the theme (dark on light and upside down). */
export function chartTooltip(theme: ChartTheme) {
  return {
    backgroundColor: theme.text,
    titleColor: theme.surface,
    bodyColor: theme.surface,
    titleFont: { ...chartFont(theme), weight: 'bold' as const },
    bodyFont: chartFont(theme),
    padding: TOOLTIP_PADDING_PX,
    cornerRadius: TOOLTIP_RADIUS_PX,
    usePointStyle: true,
    boxPadding: 4,
  }
}

/** Common options: container size (reserved high), no canvas caption (goes in HTML). */
export function baseChartOptions(theme: ChartTheme, isReduced: boolean, durationMs: number) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: chartAnimation(isReduced, durationMs),
    transitions: { resize: { animation: { duration: 0 } } },
    plugins: { legend: { display: false }, tooltip: chartTooltip(theme) },
  }
}

/** Category axis (dates, pages, stripes): no grid. */
export function categoryAxis(theme: ChartTheme) {
  return {
    grid: { display: false },
    border: { color: theme.grid },
    ticks: { color: theme.muted, font: chartFont(theme), autoSkip: true, maxRotation: 0 },
  }
}

/** Eje de valores: empieza en 0, como mucho 5 marcas. */
export function valueAxis(theme: ChartTheme) {
  return {
    beginAtZero: true,
    grid: { color: theme.grid },
    border: { display: false },
    ticks: { color: theme.muted, font: chartFont(theme), maxTicksLimit: MAX_VALUE_TICKS, precision: 0 },
  }
}
