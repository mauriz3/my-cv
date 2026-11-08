import type { Plugin } from 'chart.js'
import type { ChartTheme } from '~/composables/useChartTheme'

/** Piezas comunes de las gráficas de Visitas (Chart.js). */

export const CHART_FONT_SIZE_PX = 12
const TOOLTIP_PADDING_PX = 8
const TOOLTIP_RADIUS_PX = 8
const MAX_VALUE_TICKS = 5

/** Animación de entrada; con animaciones apagadas, ninguna (`animation: false`). */
export function chartAnimation(isReduced: boolean, durationMs: number) {
  return isReduced ? (false as const) : { duration: durationMs, easing: 'easeOutQuart' as const }
}

/** Gráficas que deben volver a su base en la próxima actualización (activación con la gráfica a la vista). */
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
 * Al pasar a `animation: false`, para la animación en curso (el `update('none')` deja el estado final).
 * Si la gráfica está marcada, `reset()` la devuelve a su base en esa misma actualización.
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

/** Tooltip con el contraste invertido del tema (oscuro sobre claro y al revés). */
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

/** Opciones comunes: tamaño del contenedor (alto reservado), sin leyenda de canvas (va en HTML). */
export function baseChartOptions(theme: ChartTheme, isReduced: boolean, durationMs: number) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: chartAnimation(isReduced, durationMs),
    transitions: { resize: { animation: { duration: 0 } } },
    plugins: { legend: { display: false }, tooltip: chartTooltip(theme) },
  }
}

/** Eje de categorías (fechas, páginas, franjas): sin rejilla. */
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
