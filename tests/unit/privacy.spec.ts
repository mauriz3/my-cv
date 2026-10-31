import { describe, expect, it } from 'vitest'
import { ANALYTICS_MEASUREMENT_ID } from '../../lib/analytics'
import { analyticsCookieNames, GA_COOKIE_MAX_AGE_MONTHS, GA_DATA_RETENTION_MONTHS } from '../../lib/privacy'

describe('analyticsCookieNames', () => {
  it('deriva la cookie de sesión del ID de medición sin «G-»', () => {
    expect(analyticsCookieNames('G-ABC123')).toEqual(['_ga', '_ga_ABC123'])
  })

  it('usa el ID real por defecto', () => {
    expect(analyticsCookieNames()).toEqual(['_ga', `_ga_${ANALYTICS_MEASUREMENT_ID.slice(2)}`])
  })
})

describe('plazos', () => {
  it('la retención de GA es de 14 meses', () => {
    expect(GA_DATA_RETENTION_MONTHS).toBe(14)
  })

  it('la retención de datos es más corta que la vida de la cookie', () => {
    expect(GA_DATA_RETENTION_MONTHS).toBeLessThan(GA_COOKIE_MAX_AGE_MONTHS)
  })
})
