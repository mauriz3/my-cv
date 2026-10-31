/**
 * Recorrido del Inicio (Holograma C): el holograma camina por un timeline de 6 puntos y se detiene en cada uno.
 * Lógica pura, sin Vue ni DOM: reparto en tramos, fases, posición, marcadores y pausa del ciclo de caminar.
 */
import { clamp01, easeInOutSine, lerp } from './easing'

/** Lado de la tarjeta respecto al holograma (en escritorio); el holograma mira hacia ella. */
export type CardSide = 'end' | 'start'

/** Los 6 puntos, en orden de recorrido, con la ruta de su sección. El último (Visitas) no tiene salida. */
export const JOURNEY_POINTS = [
  { id: 'profile', path: '/', cardSide: 'end' },
  { id: 'skills', path: '/skills', cardSide: 'end' },
  { id: 'experience', path: '/experience', cardSide: 'end' },
  { id: 'education', path: '/education', cardSide: 'start' },
  { id: 'projects', path: '/projects', cardSide: 'start' },
  { id: 'visits', path: '/visits', cardSide: 'start' },
] as const satisfies readonly {
  id: string
  path: string
  cardSide: CardSide
}[]

export type JourneyPointId = (typeof JOURNEY_POINTS)[number]['id']

export const LAST_POINT_INDEX = JOURNEY_POINTS.length - 1

/** Alto de la sección con pin (vh): el mismo scroll por punto que con 5 (120vh en escritorio, 80vh en tablet). */
export const JOURNEY_HEIGHT_VH = { desktop: 720, tablet: 480 } as const
/** En móvil, en svh (alto con la barra del navegador visible): no cambia al mostrarse u ocultarse. */
export const MOBILE_JOURNEY_HEIGHT_SVH = 420

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
    '--journey-height-mobile': `${MOBILE_JOURNEY_HEIGHT_SVH}svh`,
  }
}

/** Cómo se reparte el scroll: entrada opcional, luego un tramo igual por punto dividido en fases. */
export interface JourneyTimeline {
  /** Fracción inicial del scroll antes del primer punto (entrada del holograma). */
  entryShare: number
  /** Fin de cada fase como fracción del tramo de un punto. */
  phaseEnds: readonly (readonly [JourneyPhase, number])[]
  /** Empieza parado y leyendo en el punto 1 (su tarjeta lleva el h1, visible desde la carga). */
  startsReading: boolean
}

/** Tablet y escritorio: un tramo igual por punto, sin entrada. */
export const PINNED_TIMELINE: JourneyTimeline = { entryShare: 0, phaseEnds: PHASE_ENDS, startsReading: true }

/**
 * Móvil (spec «Holograma móvil fijo con scroll»): entrada 0–0,14 (el holograma se materializa) y 6 tramos de 0,1433.
 * Fases por tramo: caminar 0–0,30, parada –0,38, señalar y zoom –0,48, línea y tarjeta –0,62, lectura –0,88, salida.
 */
export const MOBILE_TIMELINE: JourneyTimeline = {
  entryShare: 0.14,
  phaseEnds: [
    ['walk', 0.3],
    ['stop', 0.38],
    ['point', 0.48],
    ['reveal', 0.62],
    ['read', 0.88],
    ['leave', 1],
  ],
  startsReading: false,
}

export interface JourneyState {
  pointIndex: number
  phase: JourneyPhase
  /** Posición del holograma a lo largo del timeline (0 = primer punto, 1 = último). */
  position: number
  /** Avance (0–1) dentro del tramo del punto actual. */
  segmentProgress: number
}

/** Posición (0–1) de un punto en el timeline. */
export function pointPosition(index: number): number {
  return index / LAST_POINT_INDEX
}

/** Fracción del scroll de cada punto (tramos iguales tras la entrada). */
export function segmentShareOf(timeline: JourneyTimeline): number {
  return (1 - timeline.entryShare) / JOURNEY_POINTS.length
}

/** Inicio y fin (fracción del tramo) de una fase. */
function phaseRange(timeline: JourneyTimeline, phase: JourneyPhase): [number, number] {
  const index = timeline.phaseEnds.findIndex(([name]) => name === phase)
  return [timeline.phaseEnds[index - 1]?.[1] ?? 0, timeline.phaseEnds[index]![1]]
}

function phaseWithin(timeline: JourneyTimeline, segmentProgress: number): JourneyPhase {
  return timeline.phaseEnds.find(([, end]) => segmentProgress < end)?.[0] ?? 'leave'
}

/**
 * Estado del recorrido para un progreso de scroll (0–1). Durante la entrada está en el inicio del punto 1;
 * se queda leyendo en el último. Con `startsReading` empieza ya parado y leyendo en el punto 1.
 */
export function journeyStateAt(progress: number, timeline: JourneyTimeline = PINNED_TIMELINE): JourneyState {
  const journeyProgress = clamp01((clamp01(progress) - timeline.entryShare) / (1 - timeline.entryShare))
  const pointShare = 1 / JOURNEY_POINTS.length
  const pointIndex = Math.min(Math.floor(journeyProgress / pointShare), LAST_POINT_INDEX)
  const segmentProgress = (journeyProgress - pointIndex * pointShare) / pointShare
  let phase = phaseWithin(timeline, segmentProgress)
  if (timeline.startsReading && pointIndex === 0 && phase !== 'leave') phase = 'read'
  if (pointIndex === LAST_POINT_INDEX && phase === 'leave') phase = 'read'

  const [, walkEnd] = phaseRange(timeline, 'walk')
  const position =
    phase === 'walk' && pointIndex > 0
      ? lerp(pointPosition(pointIndex - 1), pointPosition(pointIndex), easeInOutSine(segmentProgress / walkEnd))
      : pointPosition(pointIndex)
  return { pointIndex, phase, position, segmentProgress }
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

/**
 * Progreso en el que se lee la tarjeta de un punto (mitad de su fase de lectura):
 * para reanudar ahí sin repetir los anteriores.
 */
export function readingProgressOf(pointIndex: number, timeline: JourneyTimeline = PINNED_TIMELINE): number {
  if (timeline.startsReading && pointIndex <= 0) return 0
  const index = Math.min(Math.max(pointIndex, 0), LAST_POINT_INDEX)
  const [readStart, readEnd] = phaseRange(timeline, 'read')
  return timeline.entryShare + (index + (readStart + readEnd) / 2) * segmentShareOf(timeline)
}

/** Progreso (0–1) del scroll dentro de una sección más alta que la ventana (top relativo a la ventana). */
export function scrollProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const scrollableDistance = sectionHeight - viewportHeight
  if (scrollableDistance <= 0) return 0
  return clamp01(-sectionTop / scrollableDistance)
}
