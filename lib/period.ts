/** Period with partial dates (`YYYY` or `YYYY-MM`). `end: null` means “present”. */
export interface Period {
  start: string
  end: string | null
}

const MONTH_AND_YEAR: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric', timeZone: 'UTC' }
const YEAR_ONLY: Intl.DateTimeFormatOptions = { year: 'numeric', timeZone: 'UTC' }

/** `2022-02` → «Feb 2022» / «feb 2022»; `2014` → «2014». */
export function formatPartialDate(partialDate: string, locale: string): string {
  const [year, month] = partialDate.split('-')
  const hasMonth = month !== undefined
  const date = new Date(Date.UTC(Number(year), hasMonth ? Number(month) - 1 : 0))
  return new Intl.DateTimeFormat(locale, hasMonth ? MONTH_AND_YEAR : YEAR_ONLY).format(date)
}

/** A period that starts and ends on the same date is shown as a single date. */
export function isSingleDate(period: Period): boolean {
  return period.end === period.start
}
