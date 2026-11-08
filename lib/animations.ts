/**
 * Animaciones opt-in. Lógica pura, sin Vue ni DOM: la web arranca estática y solo anima
 * con una elección explícita `on` (y, al cargar, si el sistema no pide menos movimiento).
 * El atributo sigue siendo `<html data-motion="full | reduced">` (ON → full, OFF → reduced).
 */
import { easeOutCubic, lerp } from './easing'
import { MOTION_ATTRIBUTE, MOTION_STORAGE_KEY, SYSTEM_REDUCED_MOTION_QUERY } from './motion'

export const ANIMATIONS_STORAGE_KEY = 'animations'
export const ANIMATIONS_HINT_KEY = 'animations-hint'
/** Clave antigua (`full` | `reduced`). No se lee: un `full` heredado encendería las animaciones. */
export const LEGACY_MOTION_STORAGE_KEY = MOTION_STORAGE_KEY

export const ANIMATION_CHOICES = ['on', 'off'] as const
export type AnimationChoice = (typeof ANIMATION_CHOICES)[number]

/**
 * Pulso de descubrimiento del botón: 3 × 800 ms, desde que se monta.
 * En móvil el botón mide 44 px y crece unos 3 px; el anillo (el mismo `::after` que el CTA de Visitas)
 * se ensancha un poco más, en el ámbar del botón.
 */
export const PULSE_CYCLE_MS = 800
export const PULSE_ITERATIONS = 3
export const PULSE_DELAY_MS = 0
/** 44 px × 1.08 ≈ 47.5 px. */
export const PULSE_SCALE = 1.08
/** Un poco mayor que el botón, sin el salto de un anillo grande. */
export const PULSE_HALO_SCALE = 1.2
/** Nombres de `@keyframes` en AnimationsToggle. `animationend` solo cuenta estos. */
export const PULSE_ANIMATION = 'animations-hint'
export const PULSE_HALO_ANIMATION = 'animations-hint-halo'

const PULSE_BUTTON_STOP_TYPES = ['pointerdown', 'click', 'focus'] as const

/** Las escenas visibles alcanzan su progreso real en este tiempo al activar. */
export const SCENE_CATCH_UP_MS = 450
/** Cualquier intersección cuenta como tarjeta visible: el umbral 0 no basta (`ratio >= 0` sería siempre). */
export const SCENE_VISIBLE_RATIO = 0
/** Gráfica visible si al menos esta fracción de su canvas está en pantalla. */
export const CHART_VISIBLE_RATIO = 0.25

/** Lo guardado solo vale si es una elección conocida. Cualquier otra cosa, incluida la clave antigua, es «sin elección». */
export function parseStoredAnimation(stored: string | null): AnimationChoice | null {
  return ANIMATION_CHOICES.find((choice) => choice === stored) ?? null
}

/**
 * ON solo con elección `on` y, o bien el sistema no pide menos movimiento, o bien esta visita lo ha activado a mano.
 * `override` nace en false: al cargar (y al recargar) manda prefers-reduced-motion.
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

/** Primera carga de la pestaña, sin elección, sin reduced-motion y con la pestaña a la vista. */
export function shouldPulse(conditions: PulseConditions): boolean {
  return conditions.stored === null && !conditions.prefersReducedMotion && !conditions.hintShown && conditions.visible
}

export interface PulseStopSignal {
  type: string
  /** El evento ocurre en el botón. El scroll y los toques en el resto del documento no cuentan. */
  onToggle: boolean
  /** `document.hidden` en `visibilitychange`. */
  hidden?: boolean
  /** `animationName` de `animationend`. */
  animationName?: string
}

function isPulseAnimation(name: string | undefined): boolean {
  return name === PULSE_ANIMATION || name === PULSE_HALO_ANIMATION
}

/**
 * El pulso solo se detiene al pulsar o enfocar el botón, al ocultar la pestaña o al terminar los 3 ciclos.
 * `wheel`, `touchmove`, `keydown` y un `pointerdown` fuera del botón no lo cortan.
 */
export function shouldStopPulse(signal: PulseStopSignal): boolean {
  if (signal.type === 'visibilitychange') return signal.hidden === true
  if (signal.type === 'animationend') return isPulseAnimation(signal.animationName)
  return signal.onToggle && PULSE_BUTTON_STOP_TYPES.some((type) => type === signal.type)
}

/** Fracción visible de un rectángulo `[top, bottom)` dentro de la ventana. 0 si no tiene alto. */
export function intersectionRatio(top: number, bottom: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  const height = bottom - top
  if (height <= 0) return 0
  const visible = Math.min(bottom, viewportHeight) - Math.max(top, 0)
  return Math.max(0, visible) / height
}

/** Visible si hay intersección y se alcanza el umbral (0 = cualquier píxel). */
export function meetsVisibility(ratio: number, threshold: number): boolean {
  return ratio > 0 && ratio >= threshold
}

/**
 * Catch-up de una escena: de 0 a `pLive` en `durationMs` con easeOutCubic.
 * Si el usuario hace scroll, `pLive` es el valor vivo de ese instante. Con `pLive` ≤ 0 no hay trayecto.
 */
export function catchUpShown(elapsedMs: number, pLive: number, durationMs: number = SCENE_CATCH_UP_MS): number {
  if (pLive <= 0) return 0
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs))
  return lerp(0, pLive, easeOutCubic(progress))
}

/**
 * Antes del primer pintado: ON solo si hay `animations=on` y el sistema no pide menos movimiento.
 * Ignora la clave antigua `motion`. Su hash entra en la CSP con `scripts/build-headers.mjs`.
 */
export const ANIMATIONS_NO_FLASH_SCRIPT =
  `var a=null;try{a=localStorage.getItem('${ANIMATIONS_STORAGE_KEY}')}catch(e){}` +
  `var on=a==='on'&&!matchMedia('${SYSTEM_REDUCED_MOTION_QUERY}').matches;` +
  `document.documentElement.setAttribute('${MOTION_ATTRIBUTE}',on?'full':'reduced')`
