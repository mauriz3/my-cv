import { parseStoredMotion, type MotionPreference } from '~~/lib/motion'
import { startAnimationsSync, useAnimations } from './useAnimations'

/**
 * Valor vigente en `<html>` (lo fija el script anterior al pintado). Sin atributo, o con uno desconocido,
 * la web está estática: es el valor por defecto.
 */
export function readDocumentMotion(): MotionPreference {
  if (typeof document === 'undefined') return 'reduced'
  return parseStoredMotion(document.documentElement.getAttribute('data-motion')) ?? 'reduced'
}

/**
 * Vista compatible con el recorrido, las gráficas y los contadores: `full` es animaciones ON y `reduced` es OFF.
 * La elección vive en `useAnimations` (`animations` = on | off).
 */
export function useMotion() {
  const { motion, isReduced, toggle, set } = useAnimations()
  return { motion, isReduced, toggle, set }
}

/** @see startAnimationsSync */
export function startMotionSync() {
  startAnimationsSync()
}
