/**
 * Geometría de las mini-gráficas SVG de la tarjeta «Visitas» del Inicio (sin librerías de gráficas).
 * Lógica pura: rutas `d` de una línea y su área, y arcos de un donut en fracciones de la circunferencia.
 */

export interface SparklinePaths {
  line: string
  area: string
}

const round = (value: number) => Number(value.toFixed(2))

/** Línea y área (hasta la base) de una serie, escalada a `width × height` con el máximo arriba. */
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
  /** Fracción de la circunferencia donde empieza el arco (0 = arriba). */
  start: number
  /** Fracción de la circunferencia que ocupa. */
  length: number
}

/** Arcos consecutivos de un donut a partir de sus valores (cualquier escala). */
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

/** Diferencia mínima (relativa) entre medias para hablar de subida o bajada. */
const STEADY_TOLERANCE = 0.05

/** Tendencia al final de la serie: media de la última ventana frente a la anterior. */
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
