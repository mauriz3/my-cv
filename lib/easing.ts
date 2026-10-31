/** Utilidades numéricas puras para animaciones: límites, interpolación, curvas y contadores. */

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

/** Aproxima cubic-bezier(0.45, 0, 0.55, 1): arranca y frena suave (paso entre dos puntos). */
export function easeInOutSine(progress: number): number {
  return (1 - Math.cos(Math.PI * clamp01(progress))) / 2
}

const EXPO_STEEPNESS = 10

/** Aproxima cubic-bezier(0.16, 1, 0.3, 1): arranca rápido y frena al final. */
export function easeOutExpo(progress: number): number {
  const clamped = clamp01(progress)
  return clamped === 1 ? 1 : 1 - Math.pow(2, -EXPO_STEEPNESS * clamped)
}

export const COUNTER_DURATION_MS = 900

/** Valor del contador de 0 a `target` tras `elapsedMs` (entero, termina exacto en `target`). */
export function countUpValue(target: number, elapsedMs: number, durationMs: number = COUNTER_DURATION_MS): number {
  return Math.round(target * easeOutExpo(elapsedMs / durationMs))
}
