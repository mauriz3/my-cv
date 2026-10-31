/**
 * Recorrido del Inicio (Holograma C): el holograma camina por un timeline de 5 puntos y se detiene en cada uno.
 * Lógica pura, sin Vue ni DOM: reparto en tramos, fases, posición, marcadores y pausa del ciclo de caminar.
 */
import { clamp01, easeInOutSine, lerp } from './easing'

/** Lado de la tarjeta respecto al holograma (en escritorio); el holograma mira hacia ella. */
export type CardSide = 'end' | 'start'

/** Los 5 puntos, en orden de recorrido, con la ruta de su sección. */
export const JOURNEY_POINTS = [
  { id: 'profile', path: '/', cardSide: 'end' },
  { id: 'skills', path: '/skills', cardSide: 'end' },
  { id: 'experience', path: '/experience', cardSide: 'end' },
  { id: 'education', path: '/education', cardSide: 'start' },
  { id: 'projects', path: '/projects', cardSide: 'start' },
] as const satisfies readonly {
  id: string
  path: string
  cardSide: CardSide
}[]

export type JourneyPointId = (typeof JOURNEY_POINTS)[number]['id']

const LAST_POINT_INDEX = JOURNEY_POINTS.length - 1
/** Cada punto ocupa un tramo igual del scroll (20 %). */
export const SEGMENT_SHARE = 1 / JOURNEY_POINTS.length

/** Alto de la sección con pin (vh). En móvil (< 768 px) no hay pin. */
export const JOURNEY_HEIGHT_VH = { desktop: 600, tablet: 400 } as const

export type JourneyPhase = 'walk' | 'stop' | 'point' | 'reveal' | 'read' | 'leave'

/**
 * Fin de cada fase como fracción de su tramo. En la spec, sobre el 20 % de cada tramo:
 * caminar 0–8 %, parada 8–10 %, señalar 10–12 %, línea + tarjeta 12–14 %, lectura 14–18 %, continuar 18–20 %.
 */
export const PHASE_ENDS: readonly (readonly [JourneyPhase, number])[] = [
  ['walk', 0.4],
  ['stop', 0.5],
  ['point', 0.6],
  ['reveal', 0.7],
  ['read', 0.9],
  ['leave', 1],
]

const WALK_SHARE = 0.4
/** Mitad de la fase de lectura (14–18 % del tramo): punto seguro para reanudar. */
const READING_MIDDLE = 0.8

/** El ciclo de caminar se pausa este tiempo después del último evento de scroll. */
export const WALK_IDLE_MS = 120

/** Tiempos del handoff. El CSS los lee como variables (ver `journeyTimingCssVars`). */
export const JOURNEY_TIMING = {
  walkCycleMs: 800,
  stopMs: 240,
  pointMs: 450,
  lineMs: 300,
  lineDelayMs: 200,
  cardMs: 360,
  cardDelayMs: 300,
  leaveMs: 200,
  breatheMs: 4000,
  flickerCycleMs: 5000,
  scanCycleMs: 6000,
} as const

export function journeyTimingCssVars(): Record<string, string> {
  return {
    '--walk-cycle-duration': `${JOURNEY_TIMING.walkCycleMs}ms`,
    '--stop-duration': `${JOURNEY_TIMING.stopMs}ms`,
    '--point-duration': `${JOURNEY_TIMING.pointMs}ms`,
    '--line-duration': `${JOURNEY_TIMING.lineMs}ms`,
    '--line-delay': `${JOURNEY_TIMING.lineDelayMs}ms`,
    '--card-duration': `${JOURNEY_TIMING.cardMs}ms`,
    '--card-delay': `${JOURNEY_TIMING.cardDelayMs}ms`,
    '--leave-duration': `${JOURNEY_TIMING.leaveMs}ms`,
    '--breathe-duration': `${JOURNEY_TIMING.breatheMs}ms`,
    '--holo-flicker-duration': `${JOURNEY_TIMING.flickerCycleMs}ms`,
    '--holo-scan-duration': `${JOURNEY_TIMING.scanCycleMs}ms`,
    '--journey-height-desktop': `${JOURNEY_HEIGHT_VH.desktop}vh`,
    '--journey-height-tablet': `${JOURNEY_HEIGHT_VH.tablet}vh`,
  }
}

export interface JourneyState {
  pointIndex: number
  phase: JourneyPhase
  /** Posición del holograma a lo largo del timeline (0 = primer punto, 1 = último). */
  position: number
}

/** Posición (0–1) de un punto en el timeline. */
export function pointPosition(index: number): number {
  return index / LAST_POINT_INDEX
}

function phaseWithin(segmentProgress: number): JourneyPhase {
  return PHASE_ENDS.find(([, end]) => segmentProgress < end)?.[0] ?? 'leave'
}

/**
 * Estado del recorrido para un progreso de scroll (0–1). El holograma empieza ya parado en el punto 1
 * (su tarjeta lleva el h1, visible desde la carga) y se queda leyendo en el último.
 */
export function journeyStateAt(progress: number): JourneyState {
  const clamped = clamp01(progress)
  const pointIndex = Math.min(Math.floor(clamped / SEGMENT_SHARE), LAST_POINT_INDEX)
  const segmentProgress = (clamped - pointIndex * SEGMENT_SHARE) / SEGMENT_SHARE
  let phase = phaseWithin(segmentProgress)
  if (pointIndex === 0 && phase !== 'leave') phase = 'read'
  if (pointIndex === LAST_POINT_INDEX && phase === 'leave') phase = 'read'

  const position =
    phase === 'walk'
      ? lerp(pointPosition(pointIndex - 1), pointPosition(pointIndex), easeInOutSine(segmentProgress / WALK_SHARE))
      : pointPosition(pointIndex)
  return { pointIndex, phase, position }
}

export type MarkerState = 'done' | 'current' | 'pending'

/** Hecho: puntos ya pasados · actual: donde está parado · pendiente: el resto (también el destino mientras camina). */
export function markerStateAt(markerIndex: number, state: JourneyState): MarkerState {
  if (state.phase === 'walk') return markerIndex < state.pointIndex ? 'done' : 'pending'
  if (markerIndex < state.pointIndex) return 'done'
  return markerIndex === state.pointIndex ? 'current' : 'pending'
}

const POINTING_PHASES: readonly JourneyPhase[] = ['point', 'reveal', 'read']
const CARD_PHASES: readonly JourneyPhase[] = ['reveal', 'read']

export function isPointing(phase: JourneyPhase): boolean {
  return POINTING_PHASES.includes(phase)
}

export function isCardShown(phase: JourneyPhase): boolean {
  return CARD_PHASES.includes(phase)
}

export type CardState = 'past' | 'current' | 'upcoming'

/** Tarjeta visible (`current`), ya leída (`past`, sale hacia arriba) o por llegar (`upcoming`, entra desde abajo). */
export function cardStateAt(cardIndex: number, state: JourneyState): CardState {
  if (cardIndex < state.pointIndex) return 'past'
  if (cardIndex > state.pointIndex) return 'upcoming'
  if (isCardShown(state.phase)) return 'current'
  return state.phase === 'leave' ? 'past' : 'upcoming'
}

/** La zancada solo avanza mientras hay scroll y se está caminando. */
export function isStepping(phase: JourneyPhase, msSinceLastScroll: number): boolean {
  return phase === 'walk' && msSinceLastScroll < WALK_IDLE_MS
}

/** Progreso en el que se lee la tarjeta de un punto: para reanudar ahí sin repetir los anteriores. */
export function readingProgressOf(pointIndex: number): number {
  if (pointIndex <= 0) return 0
  const index = Math.min(pointIndex, LAST_POINT_INDEX)
  return (index + READING_MIDDLE) * SEGMENT_SHARE
}

/** Progreso (0–1) del scroll dentro de una sección más alta que la ventana (top relativo a la ventana). */
export function scrollProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const scrollableDistance = sectionHeight - viewportHeight
  if (scrollableDistance <= 0) return 0
  return clamp01(-sectionTop / scrollableDistance)
}
