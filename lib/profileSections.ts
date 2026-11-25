/**
 * Profile About and Languages: CEFR scale and opt-in entrance delays.
 * Pure logic, no Vue or DOM. Durations and delays match the approved motion board.
 * The optional ambient halo is intentionally absent: it loops.
 */

/** Visible fraction that starts the one-shot entrance. */
export const PROFILE_REVEAL_THRESHOLD = 0.2

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

export const CEFR_STEP_COUNT = CEFR_LEVELS.length

export const QUOTE_BAR_MS = 320
export const QUOTE_TEXT_MS = 360
export const QUOTE_TEXT_DELAY_MS = 60
export const BODY_MS = 360
export const BODY_DELAY_MS = 150

export const TERM_MS = 260
const TERM_BASE_DELAY_MS = 120
const TERM_STAGGER_MS = 85

export const SIGN_MS = 200
const SIGN_DELAYS_MS = [185, 270, 365] as const
const LAST_SIGN_DELAY_MS = SIGN_DELAYS_MS[2]

export const RESULT_MS = 340
const RESULT_DELAY_MS = 430
const BAR_STAGGER_MS = 35

export const ROCKET_MS = 380
export const ROCKET_DELAY_MS = 510

export const LANGUAGE_CARD_MS = 320
const LANGUAGE_CARD_STAGGER_MS = 90

export const SEGMENT_MS = 220
const SEGMENT_BASE_DELAY_MS = 140
const SEGMENT_STAGGER_MS = 55

export const BADGE_MS = 260
const BADGE_BASE_DELAY_MS = 220

/** How many A1–C2 steps are filled for a CEFR level (A1 → 1, C2 → 6). */
export function filledStepCount(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level) + 1
}

export function isFilledStep(level: CefrLevel, stepIndex: number): boolean {
  return stepIndex >= 0 && stepIndex < filledStepCount(level)
}

export function isCurrentStep(level: CefrLevel, stepIndex: number): boolean {
  return stepIndex === filledStepCount(level) - 1
}

/** Visible fraction, for example `4/6`. */
export function languageFraction(level: CefrLevel): string {
  return `${filledStepCount(level)}/${CEFR_STEP_COUNT}`
}

/** Bulb, UX window, and wireframe: 120 ms + 85 ms × k. */
export function termDelayMs(index: number): number {
  return TERM_BASE_DELAY_MS + TERM_STAGGER_MS * Math.max(0, index)
}

/** Plus, plus, and equals: 185 / 270 / 365 ms. */
export function signDelayMs(index: number): number {
  return SIGN_DELAYS_MS[index] ?? LAST_SIGN_DELAY_MS
}

/** MVP box (index 0) and its three bars: 430 ms + 35 ms × b. */
export function resultBarDelayMs(index: number): number {
  return RESULT_DELAY_MS + BAR_STAGGER_MS * Math.max(0, index)
}

/** Language card entrance: 90 ms × i. */
export function languageCardDelayMs(index: number): number {
  return LANGUAGE_CARD_STAGGER_MS * Math.max(0, index)
}

/** Filled scale step: 140 ms + 90 ms × i + 55 ms × j. */
export function segmentDelayMs(cardIndex: number, stepIndex: number): number {
  return (
    SEGMENT_BASE_DELAY_MS +
    LANGUAGE_CARD_STAGGER_MS * Math.max(0, cardIndex) +
    SEGMENT_STAGGER_MS * Math.max(0, stepIndex)
  )
}

/** Level badge and fraction, after the last filled step is scheduled: 220 ms + 90 ms × i + 55 ms × (N − 1). */
export function badgeDelayMs(cardIndex: number, filled: number): number {
  const lastActive = Math.max(0, filled - 1)
  return BADGE_BASE_DELAY_MS + LANGUAGE_CARD_STAGGER_MS * Math.max(0, cardIndex) + SEGMENT_STAGGER_MS * lastActive
}

/** CSS variables read by the entrance rules. */
export function enterVars(delayMs: number, durationMs: number): Record<string, string> {
  return {
    '--enter-delay': `${delayMs}ms`,
    '--enter-ms': `${durationMs}ms`,
  }
}
