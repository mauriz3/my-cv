import type { Period } from './period'

const MONTHS_PER_YEAR = 12
const DECIMALS_FACTOR = 10 // un decimal

/** Convierte `YYYY` o `YYYY-MM` en meses absolutos. El año solo se toma como enero. */
export function toMonthIndex(partialDate: string): number {
  const [year, month = '01'] = partialDate.split('-')
  return Number(year) * MONTHS_PER_YEAR + (Number(month) - 1)
}

function currentMonthIndex(now: Date): number {
  return now.getFullYear() * MONTHS_PER_YEAR + now.getMonth()
}

/** Meses cubiertos por un periodo. `end: null` llega hasta `now`. */
export function monthsInPeriod(period: Period, now: Date): number {
  const end = period.end === null ? currentMonthIndex(now) : toMonthIndex(period.end)
  return Math.max(0, end - toMonthIndex(period.start))
}

/** Años (con un decimal) sumando varios periodos. */
export function yearsInPeriods(periods: Period[], now: Date): number {
  const totalMonths = periods.reduce((sum, period) => sum + monthsInPeriod(period, now), 0)
  return Math.round((totalMonths / MONTHS_PER_YEAR) * DECIMALS_FACTOR) / DECIMALS_FACTOR
}

/**
 * Etiqueta corta de años para la interfaz: un área todavía abierta muestra el mínimo con «+»
 * (8,7 → «8+»); una cerrada, el valor aproximado (2 → «~2»).
 */
export function yearsLabel(periods: Period[], now: Date): string {
  const years = yearsInPeriods(periods, now)
  const isOngoing = periods.some((period) => period.end === null)
  return isOngoing ? `${Math.floor(years)}+` : `~${Math.round(years)}`
}
