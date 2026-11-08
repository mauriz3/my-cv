/**
 * Atributo con el que el CSS decide si anima. ON = `full`, OFF = `reduced`.
 * La elección de la persona vive en `lib/animations.ts` (`animations` = on | off), no aquí.
 */

export const MOTION_PREFERENCES = ['full', 'reduced'] as const
export type MotionPreference = (typeof MOTION_PREFERENCES)[number]

export const MOTION_ATTRIBUTE = 'data-motion'
/** Clave antigua. Ya no se lee; se borra al guardar la primera elección de animaciones. */
export const MOTION_STORAGE_KEY = 'motion'
export const SYSTEM_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Lo guardado en el atributo solo vale si es un estado conocido. */
export function parseStoredMotion(stored: string | null): MotionPreference | null {
  return MOTION_PREFERENCES.find((preference) => preference === stored) ?? null
}
