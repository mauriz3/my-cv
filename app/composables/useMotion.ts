import { parseStoredMotion, type MotionPreference } from '~~/lib/motion'
import { startAnimationsSync, useAnimations } from './useAnimations'

/**
 * Valor vigente en `<html>` (lo fija el script anterior al pintado). Sin atributo, o con uno desconocido,
 * the web is static: it is the default value.
 */
export function readDocumentMotion(): MotionPreference {
  if (typeof document === 'undefined') return 'reduced'
  return parseStoredMotion(document.documentElement.getAttribute('data-motion')) ?? 'reduced'
}

/**
 * View compatible with tour, charts and counters: `full` is animations ON and `reduced` is off.
 * The choice lives on in `useAnimations` (`animations` = on | off).
 */
export function useMotion() {
  const { motion, isReduced, toggle, set } = useAnimations()
  return { motion, isReduced, toggle, set }
}

/** @see startAnimationsSync */
export function startMotionSync() {
  startAnimationsSync()
}
