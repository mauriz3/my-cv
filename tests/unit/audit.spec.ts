import { describe, expect, it } from 'vitest'
import { AuditReportError, blockingAdvisories, parseAuditReport } from '../../scripts/audit.mjs'

const advisory = (id: string, severity: string) => ({
  source: 1,
  severity,
  title: `Advisory ${id}`,
  url: `https://github.com/advisories/${id}`
})
const TODAY = new Date('2026-11-07')

describe('scripts/audit.mjs', () => {
  it('blocks high and critical advisories; allows moderate and low', () => {
    const blocking = blockingAdvisories(
      {
        'package-a': { via: [advisory('GHSA-high', 'high'), advisory('GHSA-low', 'low')] },
        'package-b': { via: [advisory('GHSA-critical', 'critical'), advisory('GHSA-moderate', 'moderate')] }
      },
      {},
      TODAY
    )
    expect([...blocking.keys()]).toEqual(['GHSA-high', 'GHSA-critical'])
    expect(blocking.get('GHSA-high')).toBe('high · package-a · Advisory GHSA-high · https://github.com/advisories/GHSA-high')
  })

  it('ignores dependencies that only inherit the advisory from another package', () => {
    expect(blockingAdvisories({ nuxt: { via: ['nitropack'] } }, {}, TODAY).size).toBe(0)
  })

  it('an accepted exception holds until its review date; then blocks again', () => {
    const vulnerabilities = { pkg: { via: [advisory('GHSA-accepted', 'high')] } }
    const accepted = { 'GHSA-accepted': { reviewBy: '2026-12-01', reason: 'no patch' } }
    expect(blockingAdvisories(vulnerabilities, accepted, TODAY).size).toBe(0)
    expect(blockingAdvisories(vulnerabilities, accepted, new Date('2026-12-02')).size).toBe(1)
  })

  describe('parseAuditReport (fails closed)', () => {
    const VALID_REPORT = JSON.stringify({ vulnerabilities: { pkg: { via: [] } }, metadata: { vulnerabilities: { low: 1 } } })
    const run = (overrides: Record<string, unknown>) => ({ status: 0, signal: null, error: undefined, stdout: VALID_REPORT, ...overrides })

    it('returns vulnerabilities from a valid report, also when npm exits 1 because it found some', () => {
      expect(parseAuditReport(run({}))).toEqual({ pkg: { via: [] } })
      expect(parseAuditReport(run({ status: 1 }))).toEqual({ pkg: { via: [] } })
    })

    it.each([
      ['process could not start', { error: new Error('spawn npm ENOENT'), status: null }, /could not run/],
      ['process killed', { signal: 'SIGTERM', status: null }, /killed by SIGTERM/],
      ['unexpected exit code', { status: 2 }, /exited with code 2/],
      ['output is not JSON', { stdout: 'npm ERR! network' }, /not valid JSON/],
      ['output is not an object', { stdout: '[]' }, /not a report object/],
      [
        'npm reports an error with a failing exit code',
        { status: 1, stdout: JSON.stringify({ error: { code: 'EAUDITNOLOCK', summary: 'simulated audit failure' } }) },
        /EAUDITNOLOCK simulated audit failure/,
      ],
      ['report without vulnerabilities', { stdout: JSON.stringify({ metadata: { vulnerabilities: {} } }) }, /missing vulnerabilities/],
      ['report without metadata', { stdout: JSON.stringify({ vulnerabilities: {} }) }, /missing vulnerabilities or metadata/],
    ])('throws when %s', (_case, overrides, message) => {
      expect(() => parseAuditReport(run(overrides))).toThrow(AuditReportError)
      expect(() => parseAuditReport(run(overrides))).toThrow(message)
    })
  })
})
