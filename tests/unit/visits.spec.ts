import { describe, expect, it } from 'vitest'
import { ISO_NUMERIC_BY_ALPHA2 } from '../../lib/countryCodes'
import {
  DEFAULT_VISITS_RANGE,
  changeDirection,
  MIN_VISITS_PER_COUNTRY,
  OTHER_COUNTRIES_ISO,
  REPORTED_PAGE_PATHS,
  VISITS_RANGES,
  formatDuration,
  formatInteger,
  formatKpiChange,
  formatShare,
  formatTimeLabel,
  formatWeekDay,
  groupSmallCountries,
  heatAlpha,
  isEmptyReport,
  isReportedPagePath,
  isVisitsRange,
  kpiChange,
  kpiTrend,
  peakOf,
  percentagePointChange,
  relativeChange,
  sum,
  visitsEndpoint,
  withAlpha,
} from '../../lib/visits'
import { NAV_ITEMS } from '../../app/utils/navigation'
import { cvFacts } from '../../data/cv.shared'
import { PRIVACY_PATH } from '../../lib/privacy'
import { MOCK_GENERATED_AT, buildMockReport } from '../../lib/visitsMock'
import { VisitsReportSchema } from '../../lib/visitsSchema'

describe('ranges', () => {
  it('only 1d, 7d, and 30d; default is 1 month', () => {
    expect(VISITS_RANGES).toEqual(['1d', '7d', '30d'])
    expect(DEFAULT_VISITS_RANGE).toBe('30d')
    expect(isVisitsRange('7d')).toBe(true)
    expect(isVisitsRange('90d')).toBe(false)
    expect(isVisitsRange(undefined)).toBe(false)
  })

  it('each range has a same-origin route', () => {
    expect(visitsEndpoint('30d')).toBe('/api/visits/30d')
  })
})

describe('aggregations', () => {
  it('relative and percentage-point change', () => {
    expect(relativeChange(318, 303)).toBe(0.05)
    expect(relativeChange(10, 0)).toBe(0)
    expect(percentagePointChange(0.41, 0.44)).toBe(-3)
  })

  it('series peak (first index on tie)', () => {
    expect(peakOf([3, 9, 9, 1])).toEqual({ index: 1, value: 9 })
    expect(peakOf([])).toBeUndefined()
  })

  it('groups sub-minimum countries into «Otros» and sorts', () => {
    const grouped = groupSmallCountries([
      { iso: 'US', visits: 8 },
      { iso: 'ES', visits: 14 },
      { iso: 'MX', visits: 4 },
      { iso: 'GB', visits: 3 },
    ])
    expect(grouped).toEqual([
      { iso: 'ES', visits: 14 },
      { iso: 'US', visits: 8 },
      { iso: OTHER_COUNTRIES_ISO, visits: 7 },
    ])
    expect(groupSmallCountries([{ iso: 'ES', visits: 5 }])).toEqual([{ iso: 'ES', visits: 5 }])
  })
})

describe('KPI trend', () => {
  it('up is better except for bounce', () => {
    expect(kpiTrend('visits', 0.12)).toBe('better')
    expect(kpiTrend('avgDurationSec', -0.04)).toBe('worse')
    expect(kpiTrend('bounceRate', -3)).toBe('better')
    expect(kpiTrend('bounceRate', 2)).toBe('worse')
    expect(kpiTrend('visitors', 0)).toBe('flat')
  })

  it('bounce changes in points; others relative', () => {
    const { kpis } = buildMockReport('30d')
    expect(kpiChange(kpis, 'bounceRate')).toBe(-3)
    expect(kpiChange(kpis, 'visitors')).toBe(0.08)
  })
})

describe('formatting', () => {
  it('duration in minutes and seconds', () => {
    expect(formatDuration(106)).toBe('1m 46s')
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(120)).toBe('2m 0s')
  })

  it('thousands separator also on four digits', () => {
    expect(formatInteger(1420, 'es-ES')).toBe('1.420')
    expect(formatInteger(1420, 'en-GB')).toBe('1,420')
  })

  it('percentages and changes signed per locale', () => {
    expect(formatShare(0.41, 'en')).toBe('41%')
    expect(formatShare(0.41, 'es-ES')).toMatch(/^41\s%$/)
    expect(formatKpiChange('visits', 0.12, 'en')).toBe('+12%')
    expect(formatKpiChange('avgDurationSec', -0.04, 'es-ES')).toMatch(/^-4\s%$/)
    expect(formatKpiChange('bounceRate', -3, 'en')).toBe('-3 pp')
    expect(formatKpiChange('visits', 0, 'en')).toBe('0%')
  })

  it('time label per range', () => {
    expect(formatTimeLabel('2026-10-30T14', '1d', 'en')).toBe('14:00')
    expect(formatTimeLabel('2026-10-26', '7d', 'en')).toBe('Mon')
    expect(formatTimeLabel('2026-10-28', '30d', 'en-GB')).toBe('28 Oct')
    expect(formatTimeLabel('2026-10-28', '30d', 'es-ES')).toBe('28 oct')
  })

  it('weekdays localized', () => {
    expect(formatWeekDay('mon', 'en')).toBe('Mon')
    expect(formatWeekDay('sun', 'es-ES')).toBe('dom')
  })
})

describe('sequential scale and colors', () => {
  it('opacity from 0.1 to 1', () => {
    expect(heatAlpha(0, 40)).toBeCloseTo(0.1)
    expect(heatAlpha(40, 40)).toBe(1)
    expect(heatAlpha(5, 0)).toBe(0.1)
  })

  it('hex with opacity to rgba', () => {
    expect(withAlpha('#02A0E9', 0.5)).toBe('rgba(2, 160, 233, 0.5)')
  })
})

describe('mock', () => {
  it.each(VISITS_RANGES)('%s satisfies endpoint contract', (range) => {
    const report = buildMockReport(range)
    expect(() => VisitsReportSchema.parse(report)).not.toThrow()
    expect(report).toEqual(buildMockReport(range)) // deterministic
    expect(report.range).toBe(range)
    expect(report.sample).toBe(true)
    expect(report.generatedAt).toBe(MOCK_GENERATED_AT)
    expect(isEmptyReport(report)).toBe(false)
  })

  it.each(VISITS_RANGES)('%s: aligned series, 100 % shares, no countries below minimum', (range) => {
    const { timeseries, devices, sources, countries, hours } = buildMockReport(range)
    expect(timeseries.current).toHaveLength(timeseries.labels.length)
    expect(timeseries.previous).toHaveLength(timeseries.labels.length)
    expect(sum(devices.map((item) => item.value))).toBe(100)
    expect(sum(sources.map((item) => item.value))).toBe(100)
    expect(countries.every((country) => country.visits >= MIN_VISITS_PER_COUNTRY)).toBe(true)
    expect(hours.values).toHaveLength(hours.days.length)
    expect(hours.values.every((day) => day.length === hours.slots.length)).toBe(true)
  })

  it('1 month and 1 week use spec series', () => {
    const month = buildMockReport('30d')
    expect(month.kpis.visits.value).toBe(1420)
    expect(month.timeseries.labels[0]).toBe('2026-10-01')
    expect(month.timeseries.labels.at(-1)).toBe('2026-10-30')
    const week = buildMockReport('7d')
    expect(week.kpis.visits).toEqual({ value: 318, prev: 303, delta: 0.05 })
    expect(week.kpis.bounceRate.deltaPp).toBe(-2)
    expect(week.timeseries.labels[0]).toBe('2026-10-24')
  })

  it('1 day uses hourly buckets', () => {
    const day = buildMockReport('1d')
    expect(day.timeseries.labels).toHaveLength(24)
    expect(day.timeseries.labels[13]).toBe('2026-10-30T13')
    expect(day.countries.at(-1)?.iso).toBe(OTHER_COUNTRIES_ISO)
  })

  it('every mock country exists on the map', () => {
    for (const { iso } of buildMockReport('30d').countries) expect(ISO_NUMERIC_BY_ALPHA2.has(iso)).toBe(true)
    expect(ISO_NUMERIC_BY_ALPHA2.get('ES')).toBe('724')
  })
})

describe('change direction', () => {
  it('arrow by sign, independent of trend', () => {
    expect(changeDirection(-3)).toBe('down')
    expect(changeDirection(0.12)).toBe('up')
    expect(changeDirection(0)).toBe('flat')
  })
})

describe('reported page allowlist', () => {
  it('covers every navigation page, privacy, and the resume PDFs', () => {
    const sitePaths = [...NAV_ITEMS.map((item) => item.path), PRIVACY_PATH, ...Object.values(cvFacts.resumeUrls)]
    expect([...REPORTED_PAGE_PATHS].sort()).toEqual([...new Set(sitePaths)].sort())
  })

  it('accepts only allowlisted paths', () => {
    expect(isReportedPagePath('/experience')).toBe(true)
    expect(isReportedPagePath('/buy-cheap-pills.example')).toBe(false)
    expect(isReportedPagePath('/experience/')).toBe(false)
  })

  it('schema rejects a report with a page outside the allowlist', () => {
    const report = buildMockReport('7d')
    const tampered = { ...report, pages: [...report.pages, { path: '/spam', views: 1 }] }
    expect(VisitsReportSchema.safeParse(tampered).success).toBe(false)
  })
})
