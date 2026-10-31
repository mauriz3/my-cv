/**
 * Holograma móvil fijo con scroll (spec «movil-scroll.md», estilo Apple): todo es función del progreso p (0–1),
 * sin temporizadores, así que se puede ir hacia atrás. Lógica pura: valores de cada fotograma y su paso a CSS.
 * Solo se animan transform (scale, translate, rotate) y opacity.
 */
import { clamp01, cubicBezier, lerp } from './easing'
import { JOURNEY_POINTS, MOBILE_TIMELINE, journeyStateAt, type CardState, type JourneyState } from './journey'

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

/** Gesto de cada punto (fracciones de su tramo). */
const GESTURE = { armFrom: 0.38, armTo: 0.48, cardFrom: 0.46, cardTo: 0.62, leaveFrom: 0.88 } as const

const ARM_ANGLE_DEG = 55
const ZOOM_SCALE = 1.12
const ZOOM_SHIFT_PX = 6
const CARD_RISE_PX = 14
const CARD_LEAVE_PX = -8
const CARD_SCALE_FROM = 0.98

const easeOutExpo = cubicBezier(0.16, 1, 0.3, 1)
const easeOutBack = cubicBezier(0.34, 1.56, 0.64, 1)
const easeOutQuint = cubicBezier(0.22, 1, 0.36, 1)
const easeIn = cubicBezier(0.4, 0, 1, 1)

export type PointingArm = 'right' | 'left'

/** Señala con el brazo derecho en los puntos 1, 3 y 5 y con el izquierdo en el 2 y el 4. */
export function pointingArmOf(pointIndex: number): PointingArm {
  return pointIndex % 2 === 0 ? 'right' : 'left'
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
}

function rampBetween(value: number, from: number, to: number): number {
  return clamp01((value - from) / (to - from))
}

/** Fotograma del recorrido móvil para un progreso de scroll. */
export function mobileFrameAt(progress: number): MobileFrame {
  const state = journeyStateAt(progress, MOBILE_TIMELINE)
  const entry = easeOutExpo(clamp01(progress / MOBILE_TIMELINE.entryShare))

  // El último punto no sale: se queda leyendo hasta que se libera el pin.
  const isLastPoint = state.pointIndex === JOURNEY_POINTS.length - 1
  const u = isLastPoint ? Math.min(state.segmentProgress, GESTURE.leaveFrom) : state.segmentProgress
  const leave = easeIn(rampBetween(u, GESTURE.leaveFrom, 1))
  const stay = 1 - leave
  const armIn = rampBetween(u, GESTURE.armFrom, GESTURE.armTo)
  const zoom = easeOutExpo(armIn) * stay
  const cardIn = easeOutQuint(rampBetween(u, GESTURE.cardFrom, GESTURE.cardTo))
  // La tarjeta del punto 1 lleva el h1: visible desde la carga (LCP sin animar) hasta su salida.
  const cardShown = state.pointIndex === 0 ? 1 : cardIn
  const armDirection = pointingArmOf(state.pointIndex) === 'right' ? -1 : 1

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
    armAngleDeg: armDirection * ARM_ANGLE_DEG * easeOutBack(armIn) * stay,
    lineScale: cardIn * stay,
    cardOpacity: cardShown * stay,
    cardShiftPx: leave > 0 ? CARD_LEAVE_PX * leave : lerp(CARD_RISE_PX, 0, cardShown),
    cardScale: leave > 0 ? 1 : lerp(CARD_SCALE_FROM, 1, cardShown),
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
  }
}
