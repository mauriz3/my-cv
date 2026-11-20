import { describe, expect, it, vi } from 'vitest'
import { AuditReportError, blockingAdvisories, parseAuditReport, pendingAdvisories, withdrawnAdvisoryIds } from '../../scripts/audit.mjs'

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

  describe('withdrawn GitHub advisories', () => {
    const advisoryResponse = (body: unknown) => async () => ({ ok: true, status: 200, json: async () => body })

    it('requests the public advisory and records a timestamp in withdrawn_at', async () => {
      const fetchImpl = vi.fn(advisoryResponse({ withdrawn_at: '2026-11-18T15:38:56Z' }))
      const withdrawn = await withdrawnAdvisoryIds(['GHSA-fc5q-39xc-vjpf'], fetchImpl)
      expect(fetchImpl).toHaveBeenCalledWith('https://api.github.com/advisories/GHSA-fc5q-39xc-vjpf', {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'my-cv-audit-check',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      expect([...withdrawn.entries()]).toEqual([['GHSA-fc5q-39xc-vjpf', '2026-11-18T15:38:56Z']])
    })

    it('leaves an advisory in place when withdrawn_at is null, and skips the API when the id list is empty', async () => {
      const fetchImpl = vi.fn(advisoryResponse({ withdrawn_at: null }))
      expect((await withdrawnAdvisoryIds(['GHSA-open'], fetchImpl)).size).toBe(0)
      expect((await withdrawnAdvisoryIds([], fetchImpl)).size).toBe(0)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('drops only the withdrawn advisory from the blocking set', async () => {
      const fetchImpl = vi.fn(async (url: string) => {
        const id = url.split('/').pop()
        const withdrawnAt = id === 'GHSA-fc5q-39xc-vjpf' ? '2026-11-18T15:38:56Z' : null
        return { ok: true, status: 200, json: async () => ({ withdrawn_at: withdrawnAt }) }
      })
      const { blocking, withdrawn } = await pendingAdvisories(
        {
          picomatch: { via: [advisory('GHSA-fc5q-39xc-vjpf', 'high'), advisory('GHSA-fc5q-39xc-vjpf', 'high')] },
          other: { via: [advisory('GHSA-still-open', 'critical')] },
        },
        {},
        TODAY,
        fetchImpl,
      )
      expect([...withdrawn.keys()]).toEqual(['GHSA-fc5q-39xc-vjpf'])
      expect([...blocking.keys()]).toEqual(['GHSA-still-open'])
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    })

    it('does not consult GitHub when no high or critical advisory would fail', async () => {
      const fetchImpl = vi.fn()
      const accepted = { 'GHSA-accepted': { reviewBy: '2026-12-01', reason: 'no patch' } }
      const pending = await pendingAdvisories(
        {
          low: { via: [advisory('GHSA-low', 'low')] },
          accepted: { via: [advisory('GHSA-accepted', 'high')] },
        },
        accepted,
        TODAY,
        fetchImpl,
      )
      expect(pending.blocking.size).toBe(0)
      expect(pending.withdrawn.size).toBe(0)
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    it.each([
      ['the lookup returns HTTP error', async () => ({ ok: false, status: 403, json: async () => ({}) }), /HTTP 403/],
      ['the lookup returns no response', async () => null, /HTTP no response/],
      ['the network fails', async () => { throw new Error('ECONNRESET') }, /ECONNRESET/],
      ['the network fails with a non-Error', async () => { throw 'offline' }, /offline/],
      ['the body is not JSON', async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad') } }), /not valid JSON/],
      ['withdrawn_at is missing', advisoryResponse({ summary: 'still listed' }), /no withdrawn_at/],
      ['the body is not an object', advisoryResponse(['withdrawn']), /no withdrawn_at/],
      ['withdrawn_at is empty', advisoryResponse({ withdrawn_at: '' }), /unusable withdrawn_at/],
      ['withdrawn_at is not a string', advisoryResponse({ withdrawn_at: 1 }), /unusable withdrawn_at/],
    ])('fails closed when %s', async (_case, fetchImpl, message) => {
      const lookup = withdrawnAdvisoryIds(['GHSA-fc5q-39xc-vjpf'], fetchImpl)
      await expect(lookup).rejects.toThrow(AuditReportError)
      await expect(lookup).rejects.toThrow(message)
    })

    it('propagates a failed lookup instead of treating the advisory as withdrawn', async () => {
      const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) })
      await expect(
        pendingAdvisories({ pkg: { via: [advisory('GHSA-high', 'high')] } }, {}, TODAY, fetchImpl),
      ).rejects.toThrow(/HTTP 500/)
    })
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
