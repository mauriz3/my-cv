/**
 * Microanimaciones de las tarjetas del recorrido (Tanda F y, para las escenas de Skills, Experience, Education y
 * Projects, Tanda G: lib/journeyScene). Lógica pura: el progreso p (0–1) de cada tarjeta según la maqueta y,
 * para cada p, el valor de cada elemento animado.
 * Sin bucles: todo es función de p, así que al volver atrás se deshace (scrub reversible).
 * El estado final (p = 1) es también la versión estática (movimiento reducido, sin JS).
 */
import { clamp01, easeInOutCubic, progressBetween } from './easing'
import { flatSceneValues } from './journeyScene'
import {
  MOBILE_TIMELINE,
  type CardState,
  type JourneyPointId,
  type JourneyState,
  type JourneyTimeline,
} from './journey'

/** Tarjetas con microanimación. Visitas no se toca (tiene la suya). */
export type CardMotionKind = Exclude<JourneyPointId, 'visits'>

export function cardMotionKindOf(pointId: JourneyPointId): CardMotionKind | null {
  return pointId === 'visits' ? null : pointId
}

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

const eased = (p: number, { from, to }: CardProgressRange) => easeInOutCubic(progressBetween(p, from, to))

/** Duración de cada KPI: el tramo total menos el escalonado de los demás. */
const KPI_DURATION = PROFILE_TIMING.kpiTo - PROFILE_TIMING.kpiFrom - (PROFILE_KPI_COUNT - 1) * PROFILE_TIMING.kpiStagger

/** Avance de los contadores de Profile (0 → valor final). */
export function profileCountProgress(p: number): number {
  return eased(p, PROFILE_TIMING.counters)
}

/** KPI al valor final mientras la tarjeta de Perfil es la que se lee (sin esperar al primer scroll). */
export interface ProfileMotionOptions {
  profileKpisReady?: boolean
}

/** Tarjeta de Perfil legible en el recorrido: KPI y contadores ya en su valor final. */
export function profileMotionOptions(
  cardIndex: number,
  kind: CardMotionKind,
  cardState: CardState,
  state: JourneyState,
  journeyProgress: number,
  timeline: JourneyTimeline,
  journeyPinned: boolean,
): ProfileMotionOptions | undefined {
  if (!journeyPinned || kind !== 'profile' || cardIndex !== 0 || cardState !== 'current') return undefined
  if (timeline.startsReading && state.pointIndex === 0 && state.phase === 'read') return { profileKpisReady: true }
  if (timeline === MOBILE_TIMELINE && journeyProgress >= timeline.entryShare) return { profileKpisReady: true }
  return undefined
}

export function profileCounterProgress(p: number, options?: ProfileMotionOptions): number {
  if (options?.profileKpisReady) return 1
  return profileCountProgress(p)
}

/** Valor de cada elemento animado de la tarjeta para p, por nombre de variable CSS (sin `--fx-`). */
export function cardMotionValues(kind: CardMotionKind, p: number, options?: ProfileMotionOptions): Record<string, number> {
  switch (kind) {
    case 'profile': {
      const values: Record<string, number> = {
        eyebrow: eased(p, PROFILE_TIMING.eyebrow),
        headline: eased(p, PROFILE_TIMING.headline),
        tagline: eased(p, PROFILE_TIMING.tagline),
      }
      for (let index = 0; index < PROFILE_KPI_COUNT; index++) {
        const from = PROFILE_TIMING.kpiFrom + index * PROFILE_TIMING.kpiStagger
        values[`kpi-${index}`] = options?.profileKpisReady
          ? 1
          : eased(p, { from, to: from + KPI_DURATION })
      }
      return values
    }
    case 'education': {
      const values = flatSceneValues('education', p)
      values.cert = eased(p, { from: 0.52, to: 0.72 })
      values.courses = eased(p, { from: 0.68, to: 0.88 })
      return values
    }
    default:
      return flatSceneValues(kind, p)
  }
}

const round = (value: number) => Number(value.toFixed(3))

/** Variables CSS (`--fx-<elemento>`) que lee el CSS de las tarjetas (puede haber valores negativos). */
export function cardMotionCssVars(kind: CardMotionKind, p: number, options?: ProfileMotionOptions): Record<string, string> {
  return Object.fromEntries(
    Object.entries(cardMotionValues(kind, p, options)).map(([name, value]) => [`--fx-${name}`, String(round(value))]),
  )
}
