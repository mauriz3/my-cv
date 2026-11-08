import { describe, expect, it } from 'vitest'
import { ANALYTICS_MEASUREMENT_ID } from '../../lib/analytics'
import { analyticsCookieNames, GA_COOKIE_MAX_AGE_MONTHS, GA_DATA_RETENTION_MONTHS } from '../../lib/privacy'

describe('analyticsCookieNames', () => {
  it('derives the session cookie from the measurement ID without «G-»', () => {
    expect(analyticsCookieNames('G-ABC123')).toEqual(['_ga', '_ga_ABC123'])
  })

  it('uses the real ID by default', () => {
    expect(analyticsCookieNames()).toEqual(['_ga', `_ga_${ANALYTICS_MEASUREMENT_ID.slice(2)}`])
  })
})

describe('retention periods', () => {
  it('GA retention is 14 months', () => {
    expect(GA_DATA_RETENTION_MONTHS).toBe(14)
  })

  it('data retention is shorter than cookie lifetime', () => {
    expect(GA_DATA_RETENTION_MONTHS).toBeLessThan(GA_COOKIE_MAX_AGE_MONTHS)
  })
})
