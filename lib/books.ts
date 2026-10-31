/**
 * Sección «Libros que recomiendo» (Tanda D): constantes de la entrada y estado de cada portada.
 * Lógica pura, sin Vue ni DOM, para probarla en Vitest.
 */

/** Fracción visible de la lista que dispara la entrada (una sola vez). */
export const BOOKS_REVEAL_THRESHOLD = 0.2
/** Retraso entre tarjetas en la entrada escalonada. */
export const BOOKS_REVEAL_STAGGER_MS = 120

export type CoverStatus = 'loading' | 'loaded' | 'error'

/**
 * Estado de una portada a partir del `<img>`: sirve también cuando la imagen terminó (o falló) antes de hidratar,
 * porque entonces Vue ya no recibe el evento `load` / `error`.
 */
export function coverStatusOf(image: Pick<HTMLImageElement, 'complete' | 'naturalWidth'>): CoverStatus {
  if (!image.complete) return 'loading'
  return image.naturalWidth > 0 ? 'loaded' : 'error'
}

/** Retraso de entrada de la tarjeta `index` (0, 120, 240 ms…). */
export function revealDelayMs(index: number): number {
  return Math.max(0, index) * BOOKS_REVEAL_STAGGER_MS
}
