import type { VisitsReport } from '~~/lib/visits'

export interface VisitsTable {
  caption: string
  columns: string[]
  rows: string[][]
}

/** Tablas «Ver tabla» de cada gráfica de Visitas: los mismos datos en texto (alternativa accesible). */
export function useVisitsTables(report: Ref<VisitsReport | undefined>) {
  const { t } = useI18n()
  const { integer, percent, timeLabel, weekDay, slotLabel, countryName, pageName } = useVisitsFormat()

  return computed(() => {
    if (!report.value) return undefined
    const { range, timeseries, devices, countries, sources, pages, hours } = report.value
    const caption = (card: string) => `${t(`visits.${card}.title`)} · ${t(`visits.range.${range}`)}`

    return {
      timeline: {
        caption: caption('timeline'),
        columns: [t(`visits.timeline.column.${range}`), t('visits.timeline.current'), t('visits.timeline.previous')],
        rows: timeseries.labels.map((label, index) => [
          timeLabel(label, range),
          integer(timeseries.current[index] ?? 0),
          integer(timeseries.previous[index] ?? 0),
        ]),
      },
      devices: {
        caption: caption('devices'),
        columns: [t('visits.devices.column'), t('visits.share')],
        rows: devices.map((device) => [t(`visits.devices.names.${device.key}`), percent(device.value)]),
      },
      countries: {
        caption: caption('countries'),
        columns: [t('visits.countries.column'), t('visits.kpi.visits')],
        rows: countries.map((country) => [countryName(country.iso), integer(country.visits)]),
      },
      sources: {
        caption: caption('sources'),
        columns: [t('visits.sources.column'), t('visits.share')],
        rows: sources.map((source) => [t(`visits.sources.names.${source.key}`), percent(source.value)]),
      },
      pages: {
        caption: caption('pages'),
        columns: [t('visits.pages.column'), t('visits.pages.views')],
        rows: pages.map((page) => [pageName(page.path), integer(page.views)]),
      },
      hours: {
        caption: caption('hours'),
        columns: [t('visits.hours.column'), ...hours.slots.map(slotLabel)],
        rows: hours.values.map((row, index) => [weekDay(hours.days[index] ?? 'mon'), ...row.map(integer)]),
      },
    } satisfies Record<string, VisitsTable>
  })
}
