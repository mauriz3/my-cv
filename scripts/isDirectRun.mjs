import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Is the module run as `node path` (CLI) and not imported (tests)? */
export function isDirectRun(moduleUrl) {
  return process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl)
}
