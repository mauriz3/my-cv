import type { Period } from './period'

const MONTHS_PER_YEAR = 12
const DECIMALS_FACTOR = 10 // one decimal place

/** Converts `YYYY` or `YYYY-MM` to absolute months. Year-only is treated as January. */
export function toMonthIndex(partialDate: string): number {
  const [year, month = '01'] = partialDate.split('-')
  return Number(year) * MONTHS_PER_YEAR + (Number(month) - 1)
}

function currentMonthIndex(now: Date): number {
  return now.getFullYear() * MONTHS_PER_YEAR + now.getMonth()
}

/** Months covered by a period. `end: null` runs through `now`. */
export function monthsInPeriod(period: Period, now: Date): number {
  const end = period.end === null ? currentMonthIndex(now) : toMonthIndex(period.end)
  return Math.max(0, end - toMonthIndex(period.start))
}

/** Years (one decimal) by summing several periods. */
export function yearsInPeriods(periods: Period[], now: Date): number {
  const totalMonths = periods.reduce((sum, period) => sum + monthsInPeriod(period, now), 0)
  return Math.round((totalMonths / MONTHS_PER_YEAR) * DECIMALS_FACTOR) / DECIMALS_FACTOR
}
