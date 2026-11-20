/**
 * `npm audit` with a documented exception list.
 * Fails if there is a high or critical vulnerability whose advisory (GHSA) is not accepted here
 * and has not been withdrawn on GitHub, and fails closed when npm or that lookup does not
 * produce a usable result.
 *
 * `npm audit --json` has no withdrawn flag. The public GitHub Advisory API does (`withdrawn_at`).
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

const GITHUB_ADVISORY_API = 'https://api.github.com/advisories/'
const GITHUB_ADVISORY_ACCEPT = 'application/vnd.github+json'
const GITHUB_API_VERSION = '2022-11-28'
const GITHUB_ADVISORY_USER_AGENT = 'my-cv-audit-check'

/**
 * Slice of `fetch` this check needs. A test stub can return it without building a `Response`.
 * @typedef {{ ok?: unknown, status?: unknown, json?: () => Promise<unknown> }} AdvisoryResponse
 * @typedef {(url: string, init?: { headers?: Record<string, string> }) => Promise<AdvisoryResponse | null | undefined>} AdvisoryFetch
 */

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

function advisoryIdFromUrl(url) {
  return url.split('/').pop()
}

/** Blocking advisories (GHSA → readable line) from `npm audit --json`: high/critical without a valid exception. */
export function blockingAdvisories(vulnerabilities, acceptedAdvisories = ACCEPTED_ADVISORIES, today = new Date()) {
  const blocking = new Map()
  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    for (const via of vulnerability.via) {
      if (typeof via !== 'object') continue
      const advisoryId = advisoryIdFromUrl(via.url)
      if (FAILING_SEVERITIES.has(via.severity) && !isAccepted(advisoryId, acceptedAdvisories, today)) {
        blocking.set(advisoryId, `${via.severity} · ${packageName} · ${via.title} · ${via.url}`)
      }
    }
  }
  return blocking
}

async function readWithdrawnAt(advisoryId, fetchImpl) {
  let response
  try {
    response = await fetchImpl(`${GITHUB_ADVISORY_API}${encodeURIComponent(advisoryId)}`, {
      headers: {
        Accept: GITHUB_ADVISORY_ACCEPT,
        'User-Agent': GITHUB_ADVISORY_USER_AGENT,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new AuditReportError(`GitHub advisory lookup for ${advisoryId} failed: ${detail}`)
  }
  if (!isPlainObject(response) || response.ok !== true) {
    const status = isPlainObject(response) && response.status !== undefined ? response.status : 'no response'
    throw new AuditReportError(`GitHub advisory lookup for ${advisoryId} failed: HTTP ${status}`)
  }
  let body
  try {
    body = await response.json()
  } catch {
    throw new AuditReportError(`GitHub advisory ${advisoryId} is not valid JSON`)
  }
  if (!isPlainObject(body) || !Object.hasOwn(body, 'withdrawn_at')) {
    throw new AuditReportError(`GitHub advisory ${advisoryId} has no withdrawn_at`)
  }
  if (body.withdrawn_at === null) return null
  if (typeof body.withdrawn_at === 'string' && body.withdrawn_at.length > 0) return body.withdrawn_at
  throw new AuditReportError(`GitHub advisory ${advisoryId} has an unusable withdrawn_at`)
}

/**
 * GHSA → `withdrawn_at` for ids GitHub has withdrawn. Other ids are omitted. Fails closed on a bad lookup.
 * @param {Iterable<string>} advisoryIds
 * @param {AdvisoryFetch} [fetchImpl]
 * @returns {Promise<Map<string, string>>}
 */
export async function withdrawnAdvisoryIds(advisoryIds, fetchImpl = globalThis.fetch) {
  const withdrawn = new Map()
  for (const advisoryId of advisoryIds) {
    const withdrawnAt = await readWithdrawnAt(advisoryId, fetchImpl)
    if (withdrawnAt !== null) withdrawn.set(advisoryId, withdrawnAt)
  }
  return withdrawn
}

/**
 * High/critical advisories still blocking, plus the ones ignored because GitHub withdrew them.
 * Skips the API when nothing would fail the check.
 * @param {Record<string, { via: unknown[] }>} vulnerabilities
 * @param {Record<string, { reviewBy: string, reason: string }>} [acceptedAdvisories]
 * @param {Date} [today]
 * @param {AdvisoryFetch} [fetchImpl]
 * @returns {Promise<{ blocking: Map<string, string>, withdrawn: Map<string, string> }>}
 */
export async function pendingAdvisories(
  vulnerabilities,
  acceptedAdvisories = ACCEPTED_ADVISORIES,
  today = new Date(),
  fetchImpl = globalThis.fetch,
) {
  const blocking = blockingAdvisories(vulnerabilities, acceptedAdvisories, today)
  const withdrawn = blocking.size === 0 ? new Map() : await withdrawnAdvisoryIds(blocking.keys(), fetchImpl)
  for (const advisoryId of withdrawn.keys()) blocking.delete(advisoryId)
  return { blocking, withdrawn }
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

async function reportAudit() {
  const vulnerabilities = runAudit()
  let pending
  try {
    pending = await pendingAdvisories(vulnerabilities)
  } catch (error) {
    if (!(error instanceof AuditReportError)) throw error
    console.error(`${error.message}. Failing: a blocking advisory is skipped only when GitHub marks it withdrawn.`)
    process.exit(1)
  }
  for (const [advisoryId, { reviewBy, reason }] of Object.entries(ACCEPTED_ADVISORIES)) {
    console.log(`Accepted ${advisoryId} until ${reviewBy}: ${reason}`)
  }
  for (const [advisoryId, withdrawnAt] of pending.withdrawn) {
    console.log(`Ignored withdrawn advisory ${advisoryId} (${withdrawnAt}).`)
  }
  if (pending.blocking.size > 0) {
    console.error('Unaccepted vulnerabilities:')
    for (const line of pending.blocking.values()) console.error(` - ${line}`)
    process.exit(1)
  }
  console.log('npm audit: no pending high/critical vulnerabilities.')
}

if (isDirectRun(import.meta.url)) {
  await reportAudit()
}
