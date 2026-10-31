/**
 * Holograma móvil fijo con scroll (spec «movil-scroll.md», estilo Apple): todo es función del progreso p (0–1),
 * sin temporizadores, así que se puede ir hacia atrás. Lógica pura: valores de cada fotograma y su paso a CSS.
 * Solo se animan transform (scale, translate, rotate) y opacity.
 */
import { clamp01, cubicBezier, lerp } from './easing'
import { LAST_POINT_INDEX, MOBILE_TIMELINE, journeyStateAt, type CardState, type JourneyState } from './journey'

/**
 * Pin móvil: ancho de móvil y alto de ventana entre 520 y 950 px (como Apple). Mismos valores en el CSS
 * de ProfileJourney (las media queries no admiten variables).
 */
export const MOBILE_PIN_QUERY = '(max-width: 767.98px) and (min-height: 520px) and (max-height: 950px)'

/** Entrada «materializa» (fracciones de la entrada ya suavizada). */
const ENTRY = {
  holoScaleFrom: 1.2,
  opaqueAt: 0.6,
  rayFadeFrom: 0.8,
  scanlinesTo: 0.35,
  glowOpacityTo: 0.9,
  glowScaleFrom: 0.6,
  timelineFrom: 0.6,
} as const

/** Gesto de cada punto (fracciones de su tramo) y cómo entra su tarjeta. */
const GESTURE = {
  armFrom: 0.38,
  armTo: 0.48,
  cardFrom: 0.46,
  cardTo: 0.62,
  leaveFrom: 0.88,
  cardRisePx: 14,
  cardScaleFrom: 0.98,
} as const

/**
 * Punto 6 «Visitas» (spec §4b): anillo del marcador en la parada, «tap» de 8° al final del gesto,
 * tarjeta con scale 0,96, mini-gráfica y KPI ligados al scroll y sin salida.
 */
const VISITS_GESTURE = {
  ...GESTURE,
  cardTo: 0.6,
  cardRisePx: 16,
  cardScaleFrom: 0.96,
  ringFrom: 0.3,
  ringTo: 0.38,
  tapFrom: 0.48,
  tapTo: 0.54,
  drawFrom: 0.58,
  drawTo: 0.82,
} as const

/** Desde aquí (fracción del tramo del punto 6) el botón «Ver visitas» pulsa una vez. */
export const VISITS_PULSE_FROM = VISITS_GESTURE.drawTo

const ARM_ANGLE_DEG = 55
const TAP_ANGLE_DEG = 8
const RING_SCALE_TO = 2
const RING_OPACITY_FROM = 0.6
const ZOOM_SCALE = 1.12
const ZOOM_SHIFT_PX = 6
const CARD_LEAVE_PX = -8

const easeOutExpo = cubicBezier(0.16, 1, 0.3, 1)
const easeOutBack = cubicBezier(0.34, 1.56, 0.64, 1)
const easeOutQuint = cubicBezier(0.22, 1, 0.36, 1)
const easeIn = cubicBezier(0.4, 0, 1, 1)
const easeInOutDraw = cubicBezier(0.65, 0, 0.35, 1)

export type PointingArm = 'right' | 'left'

/** Puntos (índice) en los que señala con el brazo izquierdo: el 2 y el 4; en el resto, el derecho. */
const LEFT_ARM_POINTS: ReadonlySet<number> = new Set([1, 3])

export function pointingArmOf(pointIndex: number): PointingArm {
  return LEFT_ARM_POINTS.has(pointIndex) ? 'left' : 'right'
}

/**
 * Con una sola tarjeta en el sitio, la del punto actual es `current` en todo su tramo: su opacidad
 * y posición las da el fotograma (entra, se lee y sale con el scroll).
 */
export function mobileCardStateAt(cardIndex: number, state: JourneyState): CardState {
  if (cardIndex === state.pointIndex) return 'current'
  return cardIndex < state.pointIndex ? 'past' : 'upcoming'
}

export interface MobileFrame {
  state: JourneyState
  holoOpacity: number
  holoScale: number
  holoShiftPx: number
  /** Parte de la figura aún tapada por la cortina (1 = toda; se descubre de abajo arriba). */
  curtain: number
  rayOpacity: number
  scanlinesOpacity: number
  glowOpacity: number
  glowScale: number
  timelineOpacity: number
  /** Giro del brazo que señala (negativo = derecho hacia fuera, positivo = izquierdo). */
  armAngleDeg: number
  lineScale: number
  cardOpacity: number
  cardShiftPx: number
  cardScale: number
  /** Anillo del marcador 6 (se expande una vez en la parada). */
  ringScale: number
  ringOpacity: number
  /** Dibujo de la mini-gráfica y cuenta de los KPI de la tarjeta Visitas (0–1). */
  visitsDraw: number
}

function rampBetween(value: number, from: number, to: number): number {
  return clamp01((value - from) / (to - from))
}

/** Fotograma del recorrido móvil para un progreso de scroll. */
export function mobileFrameAt(progress: number): MobileFrame {
  const state = journeyStateAt(progress, MOBILE_TIMELINE)
  const entry = easeOutExpo(clamp01(progress / MOBILE_TIMELINE.entryShare))

  // El último punto (Visitas) no sale: se queda leyendo hasta que se libera el pin.
  const isLastPoint = state.pointIndex === LAST_POINT_INDEX
  const gesture = isLastPoint ? VISITS_GESTURE : GESTURE
  const u = isLastPoint ? Math.min(state.segmentProgress, GESTURE.leaveFrom) : state.segmentProgress
  const leave = easeIn(rampBetween(u, gesture.leaveFrom, 1))
  const stay = 1 - leave
  const armIn = rampBetween(u, gesture.armFrom, gesture.armTo)
  const zoom = easeOutExpo(armIn) * stay
  const cardIn = easeOutQuint(rampBetween(u, gesture.cardFrom, gesture.cardTo))
  // La tarjeta del punto 1 lleva el h1: visible desde la carga (LCP sin animar) hasta su salida.
  const cardShown = state.pointIndex === 0 ? 1 : cardIn
  const armDirection = pointingArmOf(state.pointIndex) === 'right' ? -1 : 1
  const ring = isLastPoint ? easeOutExpo(rampBetween(u, VISITS_GESTURE.ringFrom, VISITS_GESTURE.ringTo)) : 0
  // «Tap»: el brazo vuelve 8° hacia el cuerpo y regresa (medio seno).
  const tap = isLastPoint ? Math.sin(Math.PI * rampBetween(u, VISITS_GESTURE.tapFrom, VISITS_GESTURE.tapTo)) : 0

  return {
    state,
    holoOpacity: clamp01(entry / ENTRY.opaqueAt),
    holoScale: lerp(ENTRY.holoScaleFrom, 1, entry) * lerp(1, ZOOM_SCALE, zoom),
    holoShiftPx: ZOOM_SHIFT_PX * zoom,
    curtain: 1 - entry,
    rayOpacity: entry < 1 ? 1 - rampBetween(entry, ENTRY.rayFadeFrom, 1) : 0,
    scanlinesOpacity: lerp(1, ENTRY.scanlinesTo, entry),
    glowOpacity: lerp(0, ENTRY.glowOpacityTo, entry),
    glowScale: lerp(ENTRY.glowScaleFrom, 1, entry),
    timelineOpacity: rampBetween(entry, ENTRY.timelineFrom, 1),
    armAngleDeg: armDirection * (ARM_ANGLE_DEG * easeOutBack(armIn) - TAP_ANGLE_DEG * tap) * stay,
    lineScale: cardIn * stay,
    cardOpacity: cardShown * stay,
    cardShiftPx: leave > 0 ? CARD_LEAVE_PX * leave : lerp(gesture.cardRisePx, 0, cardShown),
    cardScale: leave > 0 ? 1 : lerp(gesture.cardScaleFrom, 1, cardShown),
    ringScale: lerp(1, RING_SCALE_TO, ring),
    ringOpacity: ring > 0 && ring < 1 ? RING_OPACITY_FROM * (1 - ring) : 0,
    visitsDraw: isLastPoint ? easeInOutDraw(rampBetween(u, VISITS_GESTURE.drawFrom, VISITS_GESTURE.drawTo)) : 0,
  }
}

const round = (value: number) => Number(value.toFixed(3))

/** Variables CSS del fotograma (las lee ProfileJourney en modo pin móvil). */
export function mobileFrameCssVars(frame: MobileFrame): Record<string, string> {
  const isRightArm = frame.armAngleDeg <= 0
  return {
    '--holo-reveal': `${round(frame.holoOpacity)}`,
    '--holo-scale': `${round(frame.holoScale)}`,
    '--holo-shift': `${round(frame.holoShiftPx)}px`,
    '--curtain': `${round(frame.curtain)}`,
    '--ray-opacity': `${round(frame.rayOpacity)}`,
    '--scanlines-opacity': `${round(frame.scanlinesOpacity)}`,
    '--glow-opacity': `${round(frame.glowOpacity)}`,
    '--glow-scale': `${round(frame.glowScale)}`,
    '--timeline-opacity': `${round(frame.timelineOpacity)}`,
    '--arm-right': `${isRightArm ? round(frame.armAngleDeg) : 0}deg`,
    '--arm-left': `${isRightArm ? 0 : round(frame.armAngleDeg)}deg`,
    '--line-scale': `${round(frame.lineScale)}`,
    '--card-opacity': `${round(frame.cardOpacity)}`,
    '--card-shift': `${round(frame.cardShiftPx)}px`,
    '--card-scale': `${round(frame.cardScale)}`,
    '--ring-scale': `${round(frame.ringScale)}`,
    '--ring-opacity': `${round(frame.ringOpacity)}`,
    '--visits-draw': `${round(frame.visitsDraw)}`,
  }
}
