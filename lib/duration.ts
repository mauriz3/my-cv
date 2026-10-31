import { isSingleDate, type Period } from './period'
import { monthsInPeriod } from './years'

const MONTHS_PER_YEAR = 12

export type DurationUnit = 'month' | 'year'

export interface Duration {
  unit: DurationUnit
  count: number
}

/**
 * Duración de un puesto: meses si es menos de un año; años completos si es más.
 * Devuelve `null` si no hay duración que mostrar (fecha única o menos de un mes).
 */
export function durationOf(period: Period, now: Date): Duration | null {
  if (isSingleDate(period)) return null
  const months = monthsInPeriod(period, now)
  if (months < 1) return null
  if (months < MONTHS_PER_YEAR) return { unit: 'month', count: months }
  return { unit: 'year', count: Math.floor(months / MONTHS_PER_YEAR) }
}

/** `{ year, 4 }` → «4 years» / «4 años»; `{ month, 1 }` → «1 month» / «1 mes» (pluralización de Intl). */
export function formatDuration({ unit, count }: Duration, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(count)
}
