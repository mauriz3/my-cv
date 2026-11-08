/**
 * Fixed mobile hologram with scroll (spec «movil-scroll.md», Apple-style): everything is a function of progress p (0–1),
 * no timers, so scrubbing backward works. Pure logic: each frame’s values and mapping to CSS.
 * Only transform (scale, translate, rotate) and opacity are animated.
 */
import { clamp01, cubicBezier, easeInOutCubic, lerp, progressBetween } from './easing'
import { LAST_POINT_INDEX, MOBILE_TIMELINE, journeyStateAt, type CardState, type JourneyState } from './journey'

/**
 * Mobile pin: mobile width and viewport height between 520 and 950 px (Apple-style). Same values in
 * ProfileJourney CSS (media queries cannot use variables).
 */
export const MOBILE_PIN_QUERY = '(max-width: 767.98px) and (min-height: 520px) and (max-height: 950px)'

/** «Materialize» entrance (fractions of eased entry). */
const ENTRY = {
  holoScaleFrom: 1.2,
  opaqueAt: 0.6,
  rayFadeFrom: 0.8,
  scanlinesTo: 0.35,
  glowOpacityTo: 0.9,
  glowScaleFrom: 0.6,
  timelineFrom: 0.6,
} as const

/** Per-point gesture (fractions of its span) and how its card enters. */
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
 * Point 6 «Visits» (spec §4b): marker ring on stop, 8° «tap» at end of gesture,
 * card at scale 0.96, mini-chart and KPIs scroll-linked, no exit.
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

/** From here (fraction of point 6’s span) the «View visits» button pulses once. */
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

export type PointingArm = 'right' | 'left'

/** Points (index) that use the left arm: 2 and 4; right arm elsewhere. */
const LEFT_ARM_POINTS: ReadonlySet<number> = new Set([1, 3])

export function pointingArmOf(pointIndex: number): PointingArm {
  return LEFT_ARM_POINTS.has(pointIndex) ? 'left' : 'right'
}

/**
 * With a single in-place card, the current point’s card is `current` for its whole span: opacity
 * and position come from the frame (enters, reads, and exits with scroll).
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
  /** Share of the figure still hidden by the curtain (1 = all; revealed bottom to top). */
  curtain: number
  rayOpacity: number
  scanlinesOpacity: number
  glowOpacity: number
  glowScale: number
  timelineOpacity: number
  /** Pointing arm rotation (negative = right outward, positive = left). */
  armAngleDeg: number
  lineScale: number
  cardOpacity: number
  cardShiftPx: number
  cardScale: number
  /** Marker 6 ring (expands once on stop). */
  ringScale: number
  ringOpacity: number
  /** Visits card mini-chart draw and KPI count (0–1). */
  visitsDraw: number
}

/** Mobile journey frame for scroll progress. */
export function mobileFrameAt(progress: number): MobileFrame {
  const state = journeyStateAt(progress, MOBILE_TIMELINE)
  const entry = easeOutExpo(clamp01(progress / MOBILE_TIMELINE.entryShare))

  // Last point (Visits) does not exit: stays reading until pin releases.
  const isLastPoint = state.pointIndex === LAST_POINT_INDEX
  const gesture = isLastPoint ? VISITS_GESTURE : GESTURE
  const u = isLastPoint ? Math.min(state.segmentProgress, GESTURE.leaveFrom) : state.segmentProgress
  const leave = easeIn(progressBetween(u, gesture.leaveFrom, 1))
  const stay = 1 - leave
  const armIn = progressBetween(u, gesture.armFrom, gesture.armTo)
  const zoom = easeOutExpo(armIn) * stay
  const cardIn = easeOutQuint(progressBetween(u, gesture.cardFrom, gesture.cardTo))
  // Point 1 card has h1: visible on load (LCP not animated) until exit.
  const cardShown = state.pointIndex === 0 ? 1 : cardIn
  const armDirection = pointingArmOf(state.pointIndex) === 'right' ? -1 : 1
  const ring = isLastPoint ? easeOutExpo(progressBetween(u, VISITS_GESTURE.ringFrom, VISITS_GESTURE.ringTo)) : 0
  // «Tap»: arm returns 8° toward body and back (half sine).
  const tap = isLastPoint ? Math.sin(Math.PI * progressBetween(u, VISITS_GESTURE.tapFrom, VISITS_GESTURE.tapTo)) : 0

  return {
    state,
    holoOpacity: clamp01(entry / ENTRY.opaqueAt),
    holoScale: lerp(ENTRY.holoScaleFrom, 1, entry) * lerp(1, ZOOM_SCALE, zoom),
    holoShiftPx: ZOOM_SHIFT_PX * zoom,
    curtain: 1 - entry,
    rayOpacity: entry < 1 ? 1 - progressBetween(entry, ENTRY.rayFadeFrom, 1) : 0,
    scanlinesOpacity: lerp(1, ENTRY.scanlinesTo, entry),
    glowOpacity: lerp(0, ENTRY.glowOpacityTo, entry),
    glowScale: lerp(ENTRY.glowScaleFrom, 1, entry),
    timelineOpacity: progressBetween(entry, ENTRY.timelineFrom, 1),
    armAngleDeg: armDirection * (ARM_ANGLE_DEG * easeOutBack(armIn) - TAP_ANGLE_DEG * tap) * stay,
    lineScale: cardIn * stay,
    cardOpacity: cardShown * stay,
    cardShiftPx: leave > 0 ? CARD_LEAVE_PX * leave : lerp(gesture.cardRisePx, 0, cardShown),
    cardScale: leave > 0 ? 1 : lerp(gesture.cardScaleFrom, 1, cardShown),
    ringScale: lerp(1, RING_SCALE_TO, ring),
    ringOpacity: ring > 0 && ring < 1 ? RING_OPACITY_FROM * (1 - ring) : 0,
    visitsDraw: isLastPoint ? easeInOutCubic(progressBetween(u, VISITS_GESTURE.drawFrom, VISITS_GESTURE.drawTo)) : 0,
  }
}

const round = (value: number) => Number(value.toFixed(3))

/** Frame CSS variables (read by ProfileJourney in mobile pin mode). */
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
