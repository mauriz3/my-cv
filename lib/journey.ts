/**
 * Home journey (Hologram C): the hologram walks a 6-point timeline and stops at each one.
 * Pure logic, no Vue or DOM: span split, phases, position, markers, and walk-cycle pause.
 */
import { clamp01, easeInOutSine, lerp } from './easing'

/** Card side relative to the hologram (desktop); the hologram faces it. */
export type CardSide = 'end' | 'start'

/** Six points, journey order, with section path. The last (Visits) has no exit. */
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

/** Pinned section height (vh): same scroll per point as with 5 (120vh desktop, 80vh tablet). */
export const JOURNEY_HEIGHT_VH = { desktop: 720, tablet: 480 } as const
/** Mobile, in svh (height with browser bar visible): stable when bar shows/hides. */
export const MOBILE_JOURNEY_HEIGHT_SVH = 420

export type JourneyPhase = 'walk' | 'stop' | 'point' | 'reveal' | 'read' | 'leave'

/**
 * End of each phase as a fraction of its span. Per spec, ~20% of each span:
 * walk 0–8%, stop 8–10%, point 10–12%, line + card 12–14%, read 14–18%, leave 18–20%.
 */
export const PHASE_ENDS: readonly (readonly [JourneyPhase, number])[] = [
  ['walk', 0.4],
  ['stop', 0.5],
  ['point', 0.6],
  ['reveal', 0.7],
  ['read', 0.9],
  ['leave', 1],
]

/** Walk cycle pauses this long after the last scroll event. */
export const WALK_IDLE_MS = 120

/** Handoff timings. CSS reads them as variables (see `journeyTimingCssVars`). */
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

/** How scroll is split: optional entry, then equal span per point divided into phases. */
export interface JourneyTimeline {
  /** Initial scroll fraction before the first point (hologram entrance). */
  entryShare: number
  /** End of each phase as a fraction of one point’s span. */
  phaseEnds: readonly (readonly [JourneyPhase, number])[]
  /** Starts stopped and reading at point 1 (its card has h1, visible on load). */
  startsReading: boolean
}

/** Tablet and desktop: equal span per point, no entry. */
export const PINNED_TIMELINE: JourneyTimeline = { entryShare: 0, phaseEnds: PHASE_ENDS, startsReading: true }

/**
 * Mobile (spec «fixed hologram with scroll»): entry 0–0.14 (hologram materializes) and 6 spans of 0.1433.
 * Phases per span: walk 0–0.30, stop –0.38, point and zoom –0.48, line and card –0.62, read –0.88, exit.
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
  /** Hologram position along the timeline (0 = first point, 1 = last). */
  position: number
  /** Progress (0–1) within the current point’s span. */
  segmentProgress: number
}

/** Position (0–1) of a point on the timeline. */
export function pointPosition(index: number): number {
  return index / LAST_POINT_INDEX
}

/** Scroll fraction per point (equal spans after entry). */
export function segmentShareOf(timeline: JourneyTimeline): number {
  return (1 - timeline.entryShare) / JOURNEY_POINTS.length
}

/** Phase start and end (fraction of span). */
function phaseRange(timeline: JourneyTimeline, phase: JourneyPhase): [number, number] {
  const index = timeline.phaseEnds.findIndex(([name]) => name === phase)
  return [timeline.phaseEnds[index - 1]?.[1] ?? 0, timeline.phaseEnds[index]![1]]
}

function phaseWithin(timeline: JourneyTimeline, segmentProgress: number): JourneyPhase {
  return timeline.phaseEnds.find(([, end]) => segmentProgress < end)?.[0] ?? 'leave'
}

/**
 * Journey state for scroll progress (0–1). During entry, at start of point 1;
 * stays reading at the last. With `startsReading`, starts stopped and reading at point 1.
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

/** Done: passed points · current: where it stops · pending: the rest (also destination while walking). */
export function markerStateAt(markerIndex: number, state: JourneyState): MarkerState {
  if (state.phase === 'walk') return markerIndex < state.pointIndex ? 'done' : 'pending'
  if (markerIndex < state.pointIndex) return 'done'
  return markerIndex === state.pointIndex ? 'current' : 'pending'
}

const POINTING_PHASES: readonly JourneyPhase[] = ['point', 'reveal', 'read']
/** Card visible when standing and pointing, not only in reveal (avoid empty screens when walking). */
const CARD_PHASES: readonly JourneyPhase[] = ['stop', 'point', 'reveal', 'read']
/** During the pass, the card enters before you finish walking. */
const WALK_CARD_REVEAL_SHARE = 0.28

export function isPointing(phase: JourneyPhase): boolean {
  return POINTING_PHASES.includes(phase)
}

export function isCardShown(phase: JourneyPhase): boolean {
  return CARD_PHASES.includes(phase)
}

export type CardState = 'past' | 'current' | 'upcoming'

/** Card visible (`current`), already read (`past`, exits upward), or upcoming (`upcoming`, enters from below). */
export function cardStateAt(cardIndex: number, state: JourneyState): CardState {
  if (cardIndex < state.pointIndex) return 'past'
  if (cardIndex > state.pointIndex) return 'upcoming'
  if (isCardShown(state.phase)) return 'current'
  if (state.phase === 'walk' && state.segmentProgress >= WALK_CARD_REVEAL_SHARE) return 'current'
  return state.phase === 'leave' ? 'past' : 'upcoming'
}

/** Step animation only advances while scrolling and in walk phase. */
export function isStepping(phase: JourneyPhase, msSinceLastScroll: number): boolean {
  return phase === 'walk' && msSinceLastScroll < WALK_IDLE_MS
}

/**
 * Progress where a point’s card is being read (mid read phase):
 * to resume there without replaying earlier points.
 */
export function readingProgressOf(pointIndex: number, timeline: JourneyTimeline = PINNED_TIMELINE): number {
  if (timeline.startsReading && pointIndex <= 0) return 0
  const index = Math.min(Math.max(pointIndex, 0), LAST_POINT_INDEX)
  const [readStart, readEnd] = phaseRange(timeline, 'read')
  return timeline.entryShare + (index + (readStart + readEnd) / 2) * segmentShareOf(timeline)
}

/** Scroll progress (0–1) within a section taller than the viewport (top relative to viewport). */
export function scrollProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const scrollableDistance = sectionHeight - viewportHeight
  if (scrollableDistance <= 0) return 0
  return clamp01(-sectionTop / scrollableDistance)
}
