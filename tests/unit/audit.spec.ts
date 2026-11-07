import { describe, expect, it } from 'vitest'
import { blockingAdvisories } from '../../scripts/audit.mjs'

const advisory = (id: string, severity: string) => ({
  source: 1,
  severity,
  title: `Aviso ${id}`,
  url: `https://github.com/advisories/${id}`
})
const TODAY = new Date('2026-11-07')

describe('scripts/audit.mjs', () => {
  it('bloquea los avisos high y critical y deja pasar moderate y low', () => {
    const blocking = blockingAdvisories(
      {
        'paquete-a': { via: [advisory('GHSA-high', 'high'), advisory('GHSA-low', 'low')] },
        'paquete-b': { via: [advisory('GHSA-critical', 'critical'), advisory('GHSA-moderate', 'moderate')] }
      },
      {},
      TODAY
    )
    expect([...blocking.keys()]).toEqual(['GHSA-high', 'GHSA-critical'])
    expect(blocking.get('GHSA-high')).toBe('high · paquete-a · Aviso GHSA-high · https://github.com/advisories/GHSA-high')
  })

  it('ignora las dependencias que solo heredan el aviso de otro paquete', () => {
    expect(blockingAdvisories({ nuxt: { via: ['nitropack'] } }, {}, TODAY).size).toBe(0)
  })

  it('una excepción aceptada vale hasta su fecha de revisión; después vuelve a bloquear', () => {
    const vulnerabilities = { paquete: { via: [advisory('GHSA-aceptado', 'high')] } }
    const accepted = { 'GHSA-aceptado': { reviewBy: '2026-12-01', reason: 'sin parche' } }
    expect(blockingAdvisories(vulnerabilities, accepted, TODAY).size).toBe(0)
    expect(blockingAdvisories(vulnerabilities, accepted, new Date('2026-12-02')).size).toBe(1)
  })
})
