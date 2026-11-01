/**
 * Microanimaciones de las tarjetas del recorrido (Tanda F, spec tanda-f/especificaciones.md). Lógica pura:
 * el progreso p (0–1) de cada tarjeta según la maqueta y, para cada p, el avance ya suavizado de cada elemento.
 * Sin bucles: todo es función de p, así que al volver atrás se deshace (scrub reversible).
 * El estado final (p = 1) es también la versión estática (movimiento reducido, sin JS).
 */
import { clamp01, easeInOutCubic, lerp, progressBetween } from './easing'
import { MOBILE_TIMELINE, type CardState, type JourneyPointId, type JourneyState, type JourneyTimeline } from './journey'

/** Tarjetas con microanimación. Visitas no se toca (tiene la suya). */
export type CardMotionKind = Exclude<JourneyPointId, 'visits'>
/** Tarjetas con icono en la esquina (Profile anima su propio contenido). */
export type CornerIconKind = Exclude<CardMotionKind, 'profile'>

export const CORNER_ICON_KINDS: readonly CornerIconKind[] = ['skills', 'experience', 'education', 'projects']

export function cardMotionKindOf(pointId: JourneyPointId): CardMotionKind | null {
  return pointId === 'visits' ? null : pointId
}

/** Lado del icono de la esquina en px (viewBox 72): tarjeta de 370 px en desktop y tablet, 358 px en móvil. */
export const CORNER_ICON_SIZE_PX = { wide: 64, mobile: 56 } as const
export const CORNER_ICON_VIEWBOX = 72

/* ---------- Progreso p de cada tarjeta ---------- */

/** Con la tarjeta en el flujo de la página: p = 1 cuando su borde superior llega al 40 % de la ventana. */
export const FLOW_REVEAL_SHARE = 0.6

/** Sin pin (tarjetas una debajo de otra): p = (vh − top) / (vh × 0,6), con límites. */
export function flowCardProgress(cardTop: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 1
  return clamp01((viewportHeight - cardTop) / (viewportHeight * FLOW_REVEAL_SHARE))
}

/** Tramo (fracción del tramo de su punto) en el que una tarjeta fijada pasa de p = 0 a p = 1. */
export interface CardProgressRange {
  from: number
  to: number
}

/**
 * Con pin la tarjeta no se mueve por la pantalla: p sale del avance dentro del tramo de su punto.
 * · Escritorio y tablet: desde que se muestra (fase «reveal», 0,6) hasta mitad de la lectura (0,85).
 * · Profile en escritorio y tablet: ya se lee al cargar, así que se anima con el primer scroll (0–0,25).
 * · Móvil fijo (spec): la entrada de la tarjeta, 0,46–0,62 (Profile: ver `mobileFirstCardProgress`).
 */
export const PINNED_CARD_RANGE: CardProgressRange = { from: 0.6, to: 0.85 }
export const PINNED_FIRST_CARD_RANGE: CardProgressRange = { from: 0, to: 0.25 }
export const MOBILE_CARD_RANGE: CardProgressRange = { from: 0.46, to: 0.62 }

export function pinnedCardRange(cardIndex: number, timeline: JourneyTimeline): CardProgressRange {
  if (timeline === MOBILE_TIMELINE) return MOBILE_CARD_RANGE
  return cardIndex === 0 && timeline.startsReading ? PINNED_FIRST_CARD_RANGE : PINNED_CARD_RANGE
}

/**
 * Profile en el móvil fijo: su tarjeta ya se ve durante la entrada del holograma (0–0,14 del scroll),
 * así que su contenido entra a la vez que el holograma se materializa, no en el tramo del punto 1.
 */
export function mobileFirstCardProgress(journeyProgress: number): number {
  return progressBetween(journeyProgress, 0, MOBILE_TIMELINE.entryShare)
}

/** Ya leída: estado final. Por llegar: estado inicial. La actual: según el scroll dentro de su tramo. */
export function pinnedCardProgress(
  cardIndex: number,
  cardState: CardState,
  state: JourneyState,
  timeline: JourneyTimeline,
): number {
  if (cardState === 'past') return 1
  if (cardState === 'upcoming') return 0
  const { from, to } = pinnedCardRange(cardIndex, timeline)
  return progressBetween(state.segmentProgress, from, to)
}

/** Solo se repinta si p cambia más que esto (spec). */
export const MIN_CARD_PROGRESS_CHANGE = 0.001

/* ---------- Elementos de cada tarjeta para un p dado ---------- */

/** Tramos de p (spec §3). */
export const PROFILE_TIMING = {
  eyebrow: { from: 0, to: 0.2 },
  headline: { from: 0.12, to: 0.36 },
  tagline: { from: 0.24, to: 0.48 },
  kpiFrom: 0.4,
  kpiTo: 0.8,
  kpiStagger: 0.08,
  counters: { from: 0.45, to: 0.9 },
} as const
export const PROFILE_KPI_COUNT = 4

export const SKILLS_TIMING = { polygon: { from: 0, to: 0.8 }, vertices: { from: 0.6, to: 0.9 } } as const

export const EXPERIENCE_TIMING = { line: { from: 0, to: 0.85 }, ring: { from: 0.85, to: 1 }, nodeFade: 0.08 } as const

export const EDUCATION_TIMING = { steps: { from: 0, to: 0.65 }, cap: { from: 0.55, to: 0.95 } } as const

export const PROJECTS_TIMING = {
  frame: { from: 0, to: 0.2 },
  lineFrom: 0.15,
  lineStagger: 0.17,
  lineDuration: 0.28,
  cursor: { from: 0.88, to: 1 },
  frameOpacityFrom: 0.35,
} as const
export const PROJECTS_LINE_COUNT = 4

const eased = (p: number, { from, to }: CardProgressRange) => easeInOutCubic(progressBetween(p, from, to))

/** Duración de cada KPI: el tramo total menos el escalonado de los demás. */
const KPI_DURATION = PROFILE_TIMING.kpiTo - PROFILE_TIMING.kpiFrom - (PROFILE_KPI_COUNT - 1) * PROFILE_TIMING.kpiStagger

/** Avance de los contadores de Profile (0 → valor final). */
export function profileCountProgress(p: number): number {
  return eased(p, PROFILE_TIMING.counters)
}

/* Experience: trayectoria ascendente de 5 nodos (los 5 puestos). */
export const EXPERIENCE_POINTS: readonly (readonly [number, number])[] = [
  [8, 60],
  [22, 50],
  [36, 42],
  [50, 30],
  [64, 16],
]

/** Posición (0–1, por longitud) de cada vértice a lo largo de una polilínea. */
export function polylineStops(points: readonly (readonly [number, number])[]): number[] {
  const lengths = points.slice(1).map(([x, y], index) => Math.hypot(x - points[index]![0], y - points[index]![1]))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let travelled = 0
  return [0, ...lengths.map((length) => (travelled += length) / total)]
}

const EXPERIENCE_STOPS = polylineStops(EXPERIENCE_POINTS)

/** El nodo i se enciende cuando le llega la línea (el primero, nada más empezar; el último, al terminar). */
function nodeProgress(line: number, stop: number): number {
  const from = stop * (1 - EXPERIENCE_TIMING.nodeFade)
  return progressBetween(line, from, from + EXPERIENCE_TIMING.nodeFade)
}

/** Avance (0–1, ya suavizado) de cada elemento animado de la tarjeta, por nombre de variable CSS. */
export function cardMotionValues(kind: CardMotionKind, p: number): Record<string, number> {
  switch (kind) {
    case 'profile': {
      const values: Record<string, number> = {
        eyebrow: eased(p, PROFILE_TIMING.eyebrow),
        headline: eased(p, PROFILE_TIMING.headline),
        tagline: eased(p, PROFILE_TIMING.tagline),
      }
      for (let index = 0; index < PROFILE_KPI_COUNT; index++) {
        const from = PROFILE_TIMING.kpiFrom + index * PROFILE_TIMING.kpiStagger
        values[`kpi-${index}`] = eased(p, { from, to: from + KPI_DURATION })
      }
      return values
    }
    case 'skills':
      return { polygon: eased(p, SKILLS_TIMING.polygon), vertices: eased(p, SKILLS_TIMING.vertices) }
    case 'experience': {
      const line = eased(p, EXPERIENCE_TIMING.line)
      const values: Record<string, number> = { line, ring: eased(p, EXPERIENCE_TIMING.ring) }
      EXPERIENCE_STOPS.forEach((stop, index) => (values[`node-${index}`] = nodeProgress(line, stop)))
      return values
    }
    case 'education':
      return { steps: eased(p, EDUCATION_TIMING.steps), cap: eased(p, EDUCATION_TIMING.cap) }
    case 'projects': {
      const values: Record<string, number> = {
        frame: lerp(PROJECTS_TIMING.frameOpacityFrom, 1, eased(p, PROJECTS_TIMING.frame)),
        cursor: progressBetween(p, PROJECTS_TIMING.cursor.from, PROJECTS_TIMING.cursor.to),
      }
      for (let index = 0; index < PROJECTS_LINE_COUNT; index++) {
        const from = PROJECTS_TIMING.lineFrom + index * PROJECTS_TIMING.lineStagger
        values[`line-${index}`] = eased(p, { from, to: from + PROJECTS_TIMING.lineDuration })
      }
      return values
    }
  }
}

const round = (value: number) => Number(value.toFixed(3))

/** Variables CSS (`--fx-<elemento>`) que lee el CSS de las tarjetas. */
export function cardMotionCssVars(kind: CardMotionKind, p: number): Record<string, string> {
  return Object.fromEntries(
    Object.entries(cardMotionValues(kind, p)).map(([name, value]) => [`--fx-${name}`, String(round(value))]),
  )
}

/* ---------- Geometría del radar de Skills ---------- */

export const RADAR_CENTER = [36, 38] as const
export const RADAR_RADIUS = 26
export const RADAR_GUIDE_SHARES = [1, 0.5] as const
const FULL_TURN_DEG = 360
const TOP_ANGLE_DEG = -90

/** Vértices de un radar (el primero arriba y en sentido horario) para niveles 0–1. */
export function radarPoints(levels: readonly number[], radius: number = RADAR_RADIUS): [number, number][] {
  const step = FULL_TURN_DEG / levels.length
  return levels.map((level, index) => {
    const angle = ((TOP_ANGLE_DEG + step * index) * Math.PI) / 180
    return [
      round(RADAR_CENTER[0] + radius * level * Math.cos(angle)),
      round(RADAR_CENTER[1] + radius * level * Math.sin(angle)),
    ]
  })
}

export const svgPoints = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => `${x},${y}`).join(' ')
