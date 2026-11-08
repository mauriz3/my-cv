/**
 * Attribute the CSS uses to decide whether to animate. ON = `full`, OFF = `reduced`.
 * The user’s choice lives in `lib/animations.ts` (`animations` = on | off), not here.
 */

export const MOTION_PREFERENCES = ['full', 'reduced'] as const
export type MotionPreference = (typeof MOTION_PREFERENCES)[number]

export const MOTION_ATTRIBUTE = 'data-motion'
/** Legacy key. No longer read; cleared when saving the first animations choice. */
export const MOTION_STORAGE_KEY = 'motion'
export const SYSTEM_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Value stored in the attribute only applies if it is a known state. */
export function parseStoredMotion(stored: string | null): MotionPreference | null {
  return MOTION_PREFERENCES.find((preference) => preference === stored) ?? null
}
