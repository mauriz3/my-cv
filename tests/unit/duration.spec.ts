import { describe, expect, it } from 'vitest'
import { durationOf, formatDuration } from '../../lib/duration'

const NOW = new Date(2026, 9, 31) // octubre de 2026

describe('durationOf', () => {
  it('menos de un año: meses', () => {
    expect(durationOf({ start: '2026-05', end: '2026-10' }, NOW)).toEqual({ unit: 'month', count: 5 })
    expect(durationOf({ start: '2025-11', end: '2026-10' }, NOW)).toEqual({ unit: 'month', count: 11 })
  })

  it('un año o más: años completos, sin redondear hacia arriba', () => {
    expect(durationOf({ start: '2025-10', end: '2026-10' }, NOW)).toEqual({ unit: 'year', count: 1 })
    expect(durationOf({ start: '2016-02', end: '2022-02' }, NOW)).toEqual({ unit: 'year', count: 6 })
    expect(durationOf({ start: '2022-02', end: null }, NOW)).toEqual({ unit: 'year', count: 4 })
  })

  it('un puesto en curso cuenta hasta hoy', () => {
    expect(durationOf({ start: '2026-07', end: null }, NOW)).toEqual({ unit: 'month', count: 3 })
  })

  it('sin duración para una fecha única o un periodo vacío', () => {
    expect(durationOf({ start: '2014', end: '2014' }, NOW)).toBeNull()
    expect(durationOf({ start: '2026-10', end: null }, NOW)).toBeNull()
  })
})

describe('formatDuration', () => {
  it('inglés con singular y plural', () => {
    expect(formatDuration({ unit: 'year', count: 1 }, 'en')).toBe('1 year')
    expect(formatDuration({ unit: 'year', count: 4 }, 'en')).toBe('4 years')
    expect(formatDuration({ unit: 'month', count: 1 }, 'en')).toBe('1 month')
    expect(formatDuration({ unit: 'month', count: 5 }, 'en')).toBe('5 months')
  })

  it('español con singular y plural', () => {
    expect(formatDuration({ unit: 'year', count: 1 }, 'es')).toBe('1 año')
    expect(formatDuration({ unit: 'year', count: 4 }, 'es')).toBe('4 años')
    expect(formatDuration({ unit: 'month', count: 1 }, 'es')).toBe('1 mes')
    expect(formatDuration({ unit: 'month', count: 5 }, 'es')).toBe('5 meses')
  })
})
