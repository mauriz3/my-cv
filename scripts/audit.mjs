/**
 * `npm audit` con una lista de excepciones documentadas.
 * Falla si hay una vulnerabilidad high o critical cuyo aviso (GHSA) no esté aceptado aquí.
 */
import { spawnSync } from 'node:child_process'

const FAILING_SEVERITIES = new Set(['high', 'critical'])

/** Cada excepción lleva su motivo y una fecha límite de revisión: al vencer, la CI vuelve a fallar. */
const ACCEPTED_ADVISORIES = {
  'GHSA-86w9-cpqp-85rv': {
    reviewBy: '2026-11-24',
    reason:
      'node-forge (verificación de firmas RSA): lo usa listhen solo en el servidor de desarrollo con HTTPS. No entra en el sitio estático y aún no hay versión corregida.'
  }
}

const NPM_BINARY = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const audit = spawnSync(NPM_BINARY, ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const { vulnerabilities = {} } = JSON.parse(audit.stdout)

function isAccepted(advisoryId) {
  const exception = ACCEPTED_ADVISORIES[advisoryId]
  return exception !== undefined && new Date() <= new Date(exception.reviewBy)
}

const blocking = new Map()
for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  for (const via of vulnerability.via) {
    if (typeof via !== 'object') continue
    const advisoryId = via.url.split('/').pop()
    if (FAILING_SEVERITIES.has(via.severity) && !isAccepted(advisoryId)) {
      blocking.set(advisoryId, `${via.severity} · ${packageName} · ${via.title} · ${via.url}`)
    }
  }
}

for (const [advisoryId, { reviewBy, reason }] of Object.entries(ACCEPTED_ADVISORIES)) {
  console.log(`Aceptado ${advisoryId} hasta ${reviewBy}: ${reason}`)
}
if (blocking.size > 0) {
  console.error('Vulnerabilidades sin aceptar:')
  for (const line of blocking.values()) console.error(` - ${line}`)
  process.exit(1)
}
console.log('npm audit: sin vulnerabilidades high/critical pendientes.')
