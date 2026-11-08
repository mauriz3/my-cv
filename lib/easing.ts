/** Pure numeric helpers for animations: bounds, interpolation, curves, and counters. */

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

/** Progress (0–1) of `value` between `from` and `to`, clamped: the span of a scroll-linked animation. */
export function progressBetween(value: number, from: number, to: number): number {
  return clamp01((value - from) / (to - from))
}

/** Approximates cubic-bezier(0.45, 0, 0.55, 1): smooth start and stop (step between two points). */
export function easeInOutSine(progress: number): number {
  return (1 - Math.cos(Math.PI * clamp01(progress))) / 2
}

/** `cubicBezier` precision: 2^-20 ≈ 1e-6 error in x. */
const BISECTION_STEPS = 20

/** Coordinate on a cubic Bézier with endpoints (0, 0) and (1, 1) for parameter `t`. */
function bezierCoordinate(t: number, first: number, second: number): number {
  const inverse = 1 - t
  return 3 * first * t * inverse * inverse + 3 * second * t * t * inverse + t * t * t
}

/**
 * CSS curve `cubic-bezier(x1, y1, x2, y2)` as a progress function (0–1), for scroll-linked animations.
 * With x1 and x2 in [0, 1], x is monotone: find its parameter by bisection.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (progress: number) => number {
  return (progress) => {
    const x = clamp01(progress)
    if (x === 0 || x === 1) return x
    let low = 0
    let high = 1
    for (let step = 0; step < BISECTION_STEPS; step++) {
      const middle = (low + high) / 2
      if (bezierCoordinate(middle, x1, x2) < x) low = middle
      else high = middle
    }
    return bezierCoordinate((low + high) / 2, y1, y2)
  }
}

/** cubic-bezier(0.65, 0, 0.35, 1) (CSS easeInOutCubic): strokes that draw and scroll-linked content. */
export const easeInOutCubic = cubicBezier(0.65, 0, 0.35, 1)

const EXPO_STEEPNESS = 10

/** Approximates cubic-bezier(0.16, 1, 0.3, 1): fast start, slow finish. */
export function easeOutExpo(progress: number): number {
  const clamped = clamp01(progress)
  return clamped === 1 ? 1 : 1 - Math.pow(2, -EXPO_STEEPNESS * clamped)
}

export const COUNTER_DURATION_MS = 900

/** Counter value from 0 to `target` after `elapsedMs` (integer, ends exactly at `target`). */
export function countUpValue(target: number, elapsedMs: number, durationMs: number = COUNTER_DURATION_MS): number {
  return Math.round(target * easeOutExpo(elapsedMs / durationMs))
}

/** easeOutCubic, equivalent to cubic-bezier(0.33, 1, 0.68, 1): fast start, slow finish (waves, check). */
export function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - clamp01(progress), 3)
}

/** Standard “back” overshoot: s = 1.4 gives ≈10% overshoot; s = 2, ≈20% (small “pops” only). */
export const OVERSHOOT_SOFT = 1.4

/** easeOutBack with overshoot `s`: 1 + (s + 1)(t − 1)³ + s(t − 1)². Passes above 1 before settling at 1. */
export function overshootOut(progress: number, overshoot: number = OVERSHOOT_SOFT): number {
  const t = clamp01(progress)
  if (t === 0 || t === 1) return t
  return 1 + (overshoot + 1) * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2)
}

/** Half sine 0 → 1 → 0: a single bump or bounce that returns to rest. */
export function halfSineBump(progress: number): number {
  return Math.sin(Math.PI * clamp01(progress))
}

/** x in [0, 1] with `curve(x) = target`, for an increasing curve (bisection). */
export function inverseOf(curve: (progress: number) => number, target: number): number {
  let low = 0
  let high = 1
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const middle = (low + high) / 2
    if (curve(middle) < target) low = middle
    else high = middle
  }
  return (low + high) / 2
}
