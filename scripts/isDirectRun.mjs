import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** ¿Se ejecuta el módulo con `node ruta` (CLI) y no se importa (tests)? */
export function isDirectRun(moduleUrl) {
  return process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl)
}
