/**
 * «Books I recommend» section (batch D): section entry constants and each cover’s state.
 * Pure logic, no Vue or DOM, for Vitest.
 */

/** Visible fraction of the list that triggers the entrance (once). */
export const BOOKS_REVEAL_THRESHOLD = 0.2
/** Delay between cards in the staggered entrance. */
export const BOOKS_REVEAL_STAGGER_MS = 120

export type CoverStatus = 'loading' | 'loaded' | 'error'

/**
 * Cover state from the `<img>`: also when the image finished (or failed) before hydration,
 * because Vue may not receive the `load` / `error` event then.
 */
export function coverStatusOf(image: Pick<HTMLImageElement, 'complete' | 'naturalWidth'>): CoverStatus {
  if (!image.complete) return 'loading'
  return image.naturalWidth > 0 ? 'loaded' : 'error'
}

/** Entrance delay for card `index` (0, 120, 240 ms…). */
export function revealDelayMs(index: number): number {
  return Math.max(0, index) * BOOKS_REVEAL_STAGGER_MS
}
