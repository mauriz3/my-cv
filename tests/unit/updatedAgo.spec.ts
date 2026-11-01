import { describe, expect, it } from 'vitest'
import { ageOf, formatUpdatedAgo } from '../../lib/updatedAgo'

const NOW = new Date('2026-11-01T12:00:00Z')
const before = (ms: number) => new Date(NOW.getTime() - ms)
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('ageOf (límites)', () => {
  it('menos de 1 min o en el futuro: ahora', () => {
    expect(ageOf(before(59_999), NOW)).toEqual({ unit: 'now', count: 0 })
    expect(ageOf(before(-5 * MIN), NOW)).toEqual({ unit: 'now', count: 0 })
    expect(ageOf(new Date('no es fecha'), NOW).unit).toBe('now')
  })

  it('1–59 min en minutos; 60 min ya es 1 h', () => {
    expect(ageOf(before(MIN), NOW)).toEqual({ unit: 'minute', count: 1 })
    expect(ageOf(before(59 * MIN + 59_000), NOW)).toEqual({ unit: 'minute', count: 59 })
    expect(ageOf(before(HOUR), NOW)).toEqual({ unit: 'hour', count: 1 })
  })

  it('horas redondeando hacia abajo; 24 h ya es 1 día', () => {
    expect(ageOf(before(3 * HOUR + 59 * MIN), NOW)).toEqual({ unit: 'hour', count: 3 })
    expect(ageOf(before(23 * HOUR + 59 * MIN), NOW)).toEqual({ unit: 'hour', count: 23 })
    expect(ageOf(before(DAY), NOW)).toEqual({ unit: 'day', count: 1 })
    expect(ageOf(before(10 * DAY + 5 * HOUR), NOW)).toEqual({ unit: 'day', count: 10 })
  })
})

describe('formatUpdatedAgo', () => {
  it('español', () => {
    expect(formatUpdatedAgo(before(10_000), NOW, 'es')).toBe('Datos actualizados hace un momento')
    expect(formatUpdatedAgo(before(5 * MIN), NOW, 'es')).toBe('Datos actualizados hace 5 min')
    expect(formatUpdatedAgo(before(2 * HOUR), NOW, 'es')).toBe('Datos actualizados hace 2 h')
    expect(formatUpdatedAgo(before(DAY), NOW, 'es')).toBe('Datos actualizados hace 1 día')
    expect(formatUpdatedAgo(before(3 * DAY), NOW, 'es')).toBe('Datos actualizados hace 3 días')
  })

  it('inglés (acepta la fecha ISO del contrato)', () => {
    expect(formatUpdatedAgo(before(10_000).toISOString(), NOW, 'en')).toBe('Data updated just now')
    expect(formatUpdatedAgo(before(MIN).toISOString(), NOW, 'en')).toBe('Data updated 1 min ago')
    expect(formatUpdatedAgo(before(HOUR).toISOString(), NOW, 'en')).toBe('Data updated 1 h ago')
    expect(formatUpdatedAgo(before(DAY).toISOString(), NOW, 'en')).toBe('Data updated 1 day ago')
    expect(formatUpdatedAgo(before(2 * DAY).toISOString(), NOW, 'en')).toBe('Data updated 2 days ago')
  })
})
