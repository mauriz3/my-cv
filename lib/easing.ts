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

/** Precisión de `cubicBezier`: 2^-20 ≈ 1e-6 de error en x. */
const BISECTION_STEPS = 20

/** Coordenada de una curva de Bézier cúbica con extremos (0, 0) y (1, 1) para el parámetro `t`. */
function bezierCoordinate(t: number, first: number, second: number): number {
  const inverse = 1 - t
  return 3 * first * t * inverse * inverse + 3 * second * t * t * inverse + t * t * t
}

/**
 * La curva CSS `cubic-bezier(x1, y1, x2, y2)` como función de progreso (0–1), para animaciones ligadas al scroll.
 * Con x1 y x2 en [0, 1] la x es monótona: se busca su parámetro por bisección.
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
