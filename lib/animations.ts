/**
 * Opt-in animations. Pure logic, no Vue or DOM: the site starts static and only animates
 * with an explicit `on` choice (and on load, if the system does not request reduced motion).
 * The attribute remains `<html data-motion="full | reduced">` (ON → full, OFF → reduced).
 */
import { easeOutCubic, lerp } from './easing'
import { MOTION_ATTRIBUTE, MOTION_STORAGE_KEY, SYSTEM_REDUCED_MOTION_QUERY } from './motion'

export const ANIMATIONS_STORAGE_KEY = 'animations'
export const ANIMATIONS_HINT_KEY = 'animations-hint'
/** Legacy key (`full` | `reduced`). Not read: an inherited `full` would enable animations. */
export const LEGACY_MOTION_STORAGE_KEY = MOTION_STORAGE_KEY

export const ANIMATION_CHOICES = ['on', 'off'] as const
export type AnimationChoice = (typeof ANIMATION_CHOICES)[number]

/**
 * Button discovery pulse: 3 × 800 ms, from mount.
 * On mobile the button is 44 px and grows about 3 px; the ring (same `::after` as the Visits CTA)
 * widens a bit more, in the button’s amber.
 */
export const PULSE_CYCLE_MS = 800
export const PULSE_ITERATIONS = 3
export const PULSE_DELAY_MS = 0
/** 44 px × 1.08 ≈ 47.5 px. */
export const PULSE_SCALE = 1.08
/** Slightly larger than the button, without a large-ring jump. */
export const PULSE_HALO_SCALE = 1.2
/** `@keyframes` names in AnimationsToggle. Only these count for `animationend`. */
export const PULSE_ANIMATION = 'animations-hint'
export const PULSE_HALO_ANIMATION = 'animations-hint-halo'

const PULSE_BUTTON_STOP_TYPES = ['pointerdown', 'click', 'focus'] as const

/** Visible scenes reach their live progress in this time when animations turn on. */
export const SCENE_CATCH_UP_MS = 450
/** Any intersection counts as a visible card: threshold 0 is not enough (`ratio >= 0` would always pass). */
export const SCENE_VISIBLE_RATIO = 0
/** Chart visible when at least this fraction of its canvas is on screen. */
export const CHART_VISIBLE_RATIO = 0.25

/** Stored value only applies if it is a known choice. Anything else, including the legacy key, is “no choice”. */
export function parseStoredAnimation(stored: string | null): AnimationChoice | null {
  return ANIMATION_CHOICES.find((choice) => choice === stored) ?? null
}

/**
 * ON only with `on` choice and either the system does not request reduced motion, or this visit enabled it manually.
 * `override` starts false: on load (and reload) `prefers-reduced-motion` wins.
 */
export function isEffectiveOn(stored: AnimationChoice | null, prefersReducedMotion: boolean, override: boolean): boolean {
  return stored === 'on' && (!prefersReducedMotion || override)
}

export interface PulseConditions {
  stored: AnimationChoice | null
  prefersReducedMotion: boolean
  hintShown: boolean
  visible: boolean
}

/** First tab load, no choice, no reduced-motion, tab visible. */
export function shouldPulse(conditions: PulseConditions): boolean {
  return conditions.stored === null && !conditions.prefersReducedMotion && !conditions.hintShown && conditions.visible
}

export interface PulseStopSignal {
  type: string
  /** Event occurs on the button. Scroll and touches elsewhere on the document do not count. */
  onToggle: boolean
  /** `document.hidden` on `visibilitychange`. */
  hidden?: boolean
  /** `animationName` from `animationend`. */
  animationName?: string
}

function isPulseAnimation(name: string | undefined): boolean {
  return name === PULSE_ANIMATION || name === PULSE_HALO_ANIMATION
}

/**
 * Pulse stops only on button press or focus, when the tab is hidden, or after 3 cycles.
 * `wheel`, `touchmove`, `keydown`, and `pointerdown` outside the button do not stop it.
 */
export function shouldStopPulse(signal: PulseStopSignal): boolean {
  if (signal.type === 'visibilitychange') return signal.hidden === true
  if (signal.type === 'animationend') return isPulseAnimation(signal.animationName)
  return signal.onToggle && PULSE_BUTTON_STOP_TYPES.some((type) => type === signal.type)
}

/** Visible fraction of a `[top, bottom)` rectangle within the viewport. 0 if it has no height. */
export function intersectionRatio(top: number, bottom: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  const height = bottom - top
  if (height <= 0) return 0
  const visible = Math.min(bottom, viewportHeight) - Math.max(top, 0)
  return Math.max(0, visible) / height
}

/** Visible when there is intersection and the threshold is met (0 = any pixel). */
export function meetsVisibility(ratio: number, threshold: number): boolean {
  return ratio > 0 && ratio >= threshold
}

/**
 * Scene catch-up: from 0 to `pLive` over `durationMs` with easeOutCubic.
 * If the user scrolls, `pLive` is the live value at that instant. With `pLive` ≤ 0 there is no path.
 */
export function catchUpShown(elapsedMs: number, pLive: number, durationMs: number = SCENE_CATCH_UP_MS): number {
  if (pLive <= 0) return 0
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs))
  return lerp(0, pLive, easeOutCubic(progress))
}

/**
 * Before first paint: ON only if `animations=on` and the system does not request reduced motion.
 * Ignores the legacy `motion` key. Its hash is included in CSP via `scripts/build-headers.mjs`.
 */
export const ANIMATIONS_NO_FLASH_SCRIPT =
  `var a=null;try{a=localStorage.getItem('${ANIMATIONS_STORAGE_KEY}')}catch(e){}` +
  `var on=a==='on'&&!matchMedia('${SYSTEM_REDUCED_MOTION_QUERY}').matches;` +
  `document.documentElement.setAttribute('${MOTION_ATTRIBUTE}',on?'full':'reduced')`
