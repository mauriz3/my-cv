import { describe, expect, it } from 'vitest'
import { blockingAdvisories } from '../../scripts/audit.mjs'

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
})
