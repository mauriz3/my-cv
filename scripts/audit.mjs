/**
 * `npm audit` con una lista de excepciones documentadas.
 * Falla si hay una vulnerabilidad high o critical cuyo aviso (GHSA) no esté aceptado aquí.
 */
import { spawnSync } from 'node:child_process'
import { isDirectRun } from './isDirectRun.mjs'

const FAILING_SEVERITIES = new Set(['high', 'critical'])

/** Cada excepción lleva su motivo y una fecha límite de revisión: al vencer, la CI vuelve a fallar. */
const ACCEPTED_ADVISORIES = {}

const NPM_BINARY = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function isAccepted(advisoryId, acceptedAdvisories, today) {
  const exception = acceptedAdvisories[advisoryId]
  return exception !== undefined && today <= new Date(exception.reviewBy)
}

/** Avisos (GHSA → línea legible) de `npm audit --json` que bloquean: high/critical sin excepción vigente. */
export function blockingAdvisories(vulnerabilities, acceptedAdvisories = ACCEPTED_ADVISORIES, today = new Date()) {
  const blocking = new Map()
  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    for (const via of vulnerability.via) {
      if (typeof via !== 'object') continue
      const advisoryId = via.url.split('/').pop()
      if (FAILING_SEVERITIES.has(via.severity) && !isAccepted(advisoryId, acceptedAdvisories, today)) {
        blocking.set(advisoryId, `${via.severity} · ${packageName} · ${via.title} · ${via.url}`)
      }
    }
  }
  return blocking
}

if (isDirectRun(import.meta.url)) {
  const audit = spawnSync(NPM_BINARY, ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const { vulnerabilities = {} } = JSON.parse(audit.stdout)
  const blocking = blockingAdvisories(vulnerabilities)
  for (const [advisoryId, { reviewBy, reason }] of Object.entries(ACCEPTED_ADVISORIES)) {
    console.log(`Aceptado ${advisoryId} hasta ${reviewBy}: ${reason}`)
  }
  if (blocking.size > 0) {
    console.error('Vulnerabilidades sin aceptar:')
    for (const line of blocking.values()) console.error(` - ${line}`)
    process.exit(1)
  }
  console.log('npm audit: sin vulnerabilidades high/critical pendientes.')
}
