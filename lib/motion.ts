/**
 * Preferencia «Reduce motion» y clases de `<html>` que el CSS usa para decidir si anima.
 * Lógica pura (sin Vue) para probar el script anterior al pintado en Vitest.
 */

/** En `<html>` cuando el usuario pide menos movimiento con el botón de la web. */
export const REDUCE_MOTION_CLASS = 'reduce-motion'
/** En `<html>` cuando hay JS: sin ella el CSS deja todo visible y estático. */
export const SCRIPTING_CLASS = 'has-js'
export const REDUCE_MOTION_STORAGE_KEY = 'reduce-motion'
export const STORED_ON = '1'
export const STORED_OFF = '0'

/**
 * Script inline que corre antes del primer pintado: marca que hay JS y aplica «Reduce motion» guardado.
 * Así el storytelling elige su maqueta (con o sin pin) sin saltos de diseño (CLS 0).
 * Su hash entra en la CSP con `scripts/build-headers.mjs`.
 */
export const MOTION_NO_FLASH_SCRIPT =
  `document.documentElement.classList.add('${SCRIPTING_CLASS}');` +
  `try{if(localStorage.getItem('${REDUCE_MOTION_STORAGE_KEY}')==='${STORED_ON}')` +
  `document.documentElement.classList.add('${REDUCE_MOTION_CLASS}')}catch(e){}`
