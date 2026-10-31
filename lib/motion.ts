/**
 * Preferencia de movimiento de la web (botón global de la cabecera). Lógica pura, sin Vue ni DOM global.
 * El estado vive en `<html data-motion="full | reduced">`: el CSS solo anima con `full`.
 * Sin JS no hay atributo y todo queda estático.
 */

export const MOTION_PREFERENCES = ['full', 'reduced'] as const
export type MotionPreference = (typeof MOTION_PREFERENCES)[number]

export const MOTION_ATTRIBUTE = 'data-motion'
export const MOTION_STORAGE_KEY = 'motion'
export const SYSTEM_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Lo guardado solo vale si es una preferencia conocida. */
export function parseStoredMotion(stored: string | null): MotionPreference | null {
  return MOTION_PREFERENCES.find((preference) => preference === stored) ?? null
}

/** Manda la elección manual; si no la hay, el sistema (prefers-reduced-motion). */
export function resolveMotion(stored: MotionPreference | null, systemPrefersReduced: boolean): MotionPreference {
  return stored ?? (systemPrefersReduced ? 'reduced' : 'full')
}

export function toggledMotion(current: MotionPreference): MotionPreference {
  return current === 'full' ? 'reduced' : 'full'
}

/**
 * Script inline que corre antes del primer pintado y fija `data-motion`, así el Inicio elige su maqueta
 * (recorrido con pin o versión estática) sin saltos de diseño. Su hash entra en la CSP con `scripts/build-headers.mjs`.
 */
export const MOTION_NO_FLASH_SCRIPT =
  `var m=null;try{m=localStorage.getItem('${MOTION_STORAGE_KEY}')}catch(e){}` +
  `if(m!=='full'&&m!=='reduced')m=matchMedia('${SYSTEM_REDUCED_MOTION_QUERY}').matches?'reduced':'full';` +
  `document.documentElement.setAttribute('${MOTION_ATTRIBUTE}',m)`
