/**
 * `npm audit` with a documented exception list.
 * Fails if there is a high or critical vulnerability whose advisory (GHSA) is not accepted here,
 * and fails closed when npm does not produce a usable report (crash, registry error, non-JSON output).
 */
import { spawnSync } from 'node:child_process'
import { isDirectRun } from './isDirectRun.mjs'

const FAILING_SEVERITIES = new Set(['high', 'critical'])

/** Each exception includes a reason and review-by date: when it expires, CI fails again. */
const ACCEPTED_ADVISORIES = {}

const NPM_BINARY = process.platform === 'win32' ? 'npm.cmd' : 'npm'
/** `npm audit` exits 1 when it finds vulnerabilities: still a valid report. Anything else is a failure. */
const AUDIT_EXIT_CODES_WITH_REPORT = new Set([0, 1])
const MAX_AUDIT_OUTPUT_BYTES = 64 * 1024 * 1024

export class AuditReportError extends Error {
  name = 'AuditReportError'
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validated `vulnerabilities` from a finished `npm audit --json` run (`spawnSync` result).
 * Throws `AuditReportError` instead of treating a missing report as a clean audit.
 */
export function parseAuditReport({ status, signal, error, stdout }) {
  if (error) throw new AuditReportError(`npm audit could not run: ${error.message}`)
  if (signal) throw new AuditReportError(`npm audit was killed by ${signal}`)
  if (!AUDIT_EXIT_CODES_WITH_REPORT.has(status)) throw new AuditReportError(`npm audit exited with code ${status}`)
  let report
  try {
    report = JSON.parse(stdout)
  } catch {
    throw new AuditReportError('npm audit output is not valid JSON')
  }
  if (!isPlainObject(report)) throw new AuditReportError('npm audit output is not a report object')
  if (report.error !== undefined) {
    const { code = 'unknown', summary = '' } = isPlainObject(report.error) ? report.error : {}
    throw new AuditReportError(`npm audit reported an error: ${code} ${summary}`.trim())
  }
  if (!isPlainObject(report.vulnerabilities) || !isPlainObject(report.metadata?.vulnerabilities)) {
    throw new AuditReportError('npm audit report is missing vulnerabilities or metadata')
  }
  return report.vulnerabilities
}

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

function runAudit() {
  const audit = spawnSync(NPM_BINARY, ['audit', '--json'], { encoding: 'utf8', maxBuffer: MAX_AUDIT_OUTPUT_BYTES })
  try {
    return parseAuditReport(audit)
  } catch (error) {
    if (!(error instanceof AuditReportError)) throw error
    console.error(`${error.message}. Failing: an audit without results is not a clean audit.`)
    if (audit.stderr) console.error(audit.stderr.trim())
    process.exit(1)
  }
}

if (isDirectRun(import.meta.url)) {
  const blocking = blockingAdvisories(runAudit())
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
