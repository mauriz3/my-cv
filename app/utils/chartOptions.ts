import type { ChartTheme } from '~/composables/useChartTheme'

/** Piezas comunes de las gráficas de Visitas (Chart.js). */

export const CHART_FONT_SIZE_PX = 12
const TOOLTIP_PADDING_PX = 8
const TOOLTIP_RADIUS_PX = 8
const MAX_VALUE_TICKS = 5

/** Animación de entrada; con movimiento reducido, ninguna (`animation: false`). */
export function chartAnimation(isReduced: boolean, durationMs: number) {
  return isReduced ? (false as const) : { duration: durationMs, easing: 'easeOutQuart' as const }
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
