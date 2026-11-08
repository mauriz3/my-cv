/**
 * `npm audit` with a documented exception list.
 * Fails if there is a high or critical vulnerability whose advisory (GHSA) is not accepted here.
 */
import { spawnSync } from 'node:child_process'
import { isDirectRun } from './isDirectRun.mjs'

const FAILING_SEVERITIES = new Set(['high', 'critical'])

/** Each exception includes a reason and review-by date: when it expires, CI fails again. */
const ACCEPTED_ADVISORIES = {}

const NPM_BINARY = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function isAccepted(advisoryId, acceptedAdvisories, today) {
  const exception = acceptedAdvisories[advisoryId]
  return exception !== undefined && today <= new Date(exception.reviewBy)
}

/** Blocking advisories (GHSA → readable line) from `npm audit --json`: high/critical without a valid exception. */
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
    console.log(`Accepted ${advisoryId} until ${reviewBy}: ${reason}`)
  }
  if (blocking.size > 0) {
    console.error('Unaccepted vulnerabilities:')
    for (const line of blocking.values()) console.error(` - ${line}`)
    process.exit(1)
  }
  console.log('npm audit: no pending high/critical vulnerabilities.')
}
