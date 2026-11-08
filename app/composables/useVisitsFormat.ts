import { NAV_ITEMS } from '~/utils/navigation'
import {
  OTHER_COUNTRIES_ISO,
  formatCountry,
  formatInteger,
  formatShare,
  formatTimeLabel,
  formatWeekDay,
  type VisitsRange,
  type WeekDay,
} from '~~/lib/visits'

const PERCENT = 100
const PDF_EXTENSION = '.pdf'

/** Texts of the Visits page in the active language (graphs, tables and summaries share the same). */
export function useVisitsFormat() {
  const { t, localeProperties } = useI18n()
  /** BCP 47 tag (`en-GB`, `es-ES`) for Intl formatters. */
  const language = computed(() => localeProperties.value.language ?? 'en-GB')

  const integer = (value: number) => formatInteger(value, language.value)
  /** Repartos que llegan en % enteros (58 → «58 %»). */
  const percent = (value: number) => formatShare(value / PERCENT, language.value)

  const timeLabel = (isoLabel: string, range: VisitsRange) => formatTimeLabel(isoLabel, range, language.value)
  const weekDay = (day: WeekDay) => formatWeekDay(day, language.value)
  const slotLabel = (slot: string) => `${slot}h`

  const countryName = (iso: string) =>
    iso === OTHER_COUNTRIES_ISO ? t('visits.countries.other') : formatCountry(iso, language.value)

  /** Site paths with the name of their section (“/experience→”); the PDF, “CV (PDF)”. */
  function pageName(path: string) {
    if (path.endsWith(PDF_EXTENSION)) return t('visits.pages.resume')
    const navItem = NAV_ITEMS.find((item) => item.path === path)
    return navItem ? t(`nav.${navItem.id}`) : path
  }

  return { language, integer, percent, timeLabel, weekDay, slotLabel, countryName, pageName }
}
