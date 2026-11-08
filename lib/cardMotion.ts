/**
 * Journey card micro-animations (batch F and, for Skills, Experience, Education, and Projects scenes,
 * batch G: lib/journeyScene). Pure logic: progress p (0–1) per card per spec and,
 * for each p, each animated element’s value.
 * No loops: everything is a function of p, so scrubbing backward undoes (reversible scrub).
 * Final state (p = 1) is also the static version (reduced motion, no JS).
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

/** Cards with micro-animation. Visits is separate (has its own). */
export type CardMotionKind = Exclude<JourneyPointId, 'visits'>

export function cardMotionKindOf(pointId: JourneyPointId): CardMotionKind | null {
  return pointId === 'visits' ? null : pointId
}

/* ---------- Per-card progress p ---------- */

/** With card in page flow: p = 1 when its top edge reaches 40% of the viewport. */
export const FLOW_REVEAL_SHARE = 0.6

/** No pin (stacked cards): p = (vh − top) / (vh × 0.6), clamped. */
export function flowCardProgress(cardTop: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 1
  return clamp01((viewportHeight - cardTop) / (viewportHeight * FLOW_REVEAL_SHARE))
}

/** Segment (fraction of its point’s span) where a pinned card goes from p = 0 to p = 1. */
export interface CardProgressRange {
  from: number
  to: number
}

/**
 * With pin the card does not move on screen: p comes from progress within its point’s span.
 * · Desktop and tablet: from reveal (0.6) through mid-reading (0.85).
 * · Profile on desktop/tablet: readable on load; content enters over most of point 1 (0–0.85).
 * · Fixed mobile (spec): card entrance 0.46–0.62 (Profile: see `mobileFirstCardProgress`).
 */
export const PINNED_CARD_RANGE: CardProgressRange = { from: 0.6, to: 0.85 }
export const PINNED_FIRST_CARD_RANGE: CardProgressRange = { from: 0, to: 0.85 }
export const MOBILE_CARD_RANGE: CardProgressRange = { from: 0.46, to: 0.62 }

export function pinnedCardRange(cardIndex: number, timeline: JourneyTimeline): CardProgressRange {
  if (timeline === MOBILE_TIMELINE) return MOBILE_CARD_RANGE
  return cardIndex === 0 && timeline.startsReading ? PINNED_FIRST_CARD_RANGE : PINNED_CARD_RANGE
}

/**
 * Profile on fixed mobile: card is visible during hologram entrance (0–0.14 of scroll),
 * so its content enters as the hologram materializes, not in point 1’s span.
 */
export function mobileFirstCardProgress(journeyProgress: number): number {
  return progressBetween(journeyProgress, 0, MOBILE_TIMELINE.entryShare)
}

/** Already read: final state. Upcoming: initial. Current: from scroll within its span. */
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

/** Repaint only if p changes more than this (spec). */
export const MIN_CARD_PROGRESS_CHANGE = 0.001

/* ---------- Per-card elements for a given p ---------- */

/** p spans (spec §3). */
export const PROFILE_TIMING = {
  eyebrow: { from: 0, to: 0.22 },
  headline: { from: 0.08, to: 0.38 },
  tagline: { from: 0.18, to: 0.5 },
  kpiFrom: 0.08,
  kpiTo: 0.88,
  kpiStagger: 0.1,
  counters: { from: 0.5, to: 0.95 },
  actions: { from: 0.58, to: 0.98 },
  glow: { from: 0.1, to: 1 },
} as const
export const PROFILE_KPI_COUNT = 3

const eased = (p: number, { from, to }: CardProgressRange) => easeInOutCubic(progressBetween(p, from, to))

/** Each KPI’s duration: total span minus other KPIs’ stagger. */
const KPI_DURATION = PROFILE_TIMING.kpiTo - PROFILE_TIMING.kpiFrom - (PROFILE_KPI_COUNT - 1) * PROFILE_TIMING.kpiStagger

/** Profile counter progress (0 → final value). */
export function profileCountProgress(p: number): number {
  return eased(p, PROFILE_TIMING.counters)
}

/** KPIs at final value while the Profile card is current (no wait for first scroll). */
export interface ProfileMotionOptions {
  profileKpisReady?: boolean
}

/** Pin on point 1: copy and counters readable; scroll animates KPIs, glow, and CTA. */
export function profileMotionOptions(
  cardIndex: number,
  kind: CardMotionKind,
  cardState: CardState,
  _state: JourneyState,
  _journeyProgress: number,
  _timeline: JourneyTimeline,
  journeyPinned: boolean,
): ProfileMotionOptions | undefined {
  if (!journeyPinned || kind !== 'profile' || cardIndex !== 0 || cardState !== 'current') return undefined
  return { profileKpisReady: true }
}

/** Header and body copy at final position while the card is current with pin. */
function profileCopyProgress(p: number, range: CardProgressRange, options?: ProfileMotionOptions): number {
  return options?.profileKpisReady ? 1 : eased(p, range)
}

export function profileCounterProgress(p: number, options?: ProfileMotionOptions): number {
  if (options?.profileKpisReady) return 1
  return profileCountProgress(p)
}

/** Each animated element’s value for p, by CSS variable name (without `--fx-`). */
export function cardMotionValues(kind: CardMotionKind, p: number, options?: ProfileMotionOptions): Record<string, number> {
  switch (kind) {
    case 'profile': {
      const values = flatSceneValues('profile', p)
      values.eyebrow = profileCopyProgress(p, PROFILE_TIMING.eyebrow, options)
      values.headline = profileCopyProgress(p, PROFILE_TIMING.headline, options)
      values.tagline = profileCopyProgress(p, PROFILE_TIMING.tagline, options)
      values.actions = eased(p, PROFILE_TIMING.actions)
      values.glow = eased(p, PROFILE_TIMING.glow)
      values.note = profileCopyProgress(p, PROFILE_TIMING.counters, options)
      for (let index = 0; index < PROFILE_KPI_COUNT; index++) {
        const from = PROFILE_TIMING.kpiFrom + index * PROFILE_TIMING.kpiStagger
        values[`kpi-${index}`] = eased(p, { from, to: from + KPI_DURATION })
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

/** CSS variables (`--fx-<element>`) read by card CSS (may be negative). */
export function cardMotionCssVars(kind: CardMotionKind, p: number, options?: ProfileMotionOptions): Record<string, string> {
  return Object.fromEntries(
    Object.entries(cardMotionValues(kind, p, options)).map(([name, value]) => [`--fx-${name}`, String(round(value))]),
  )
}
