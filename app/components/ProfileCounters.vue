<script setup lang="ts">
import type { Period } from '~~/lib/period'
import { toMonthIndex } from '~~/lib/years'

/**
 * Cifras clave del Perfil, calculadas desde los datos (años en tecnología, años full stack,
 * proyectos e idiomas), con la nota de cómo se calculan. Cuentan de 0 al valor al entrar en pantalla.
 */
const { t, locale } = useI18n({ useScope: 'local' })
const cv = useCv()

/** Desde que hace Back End (Octane11) su perfil es full stack: ese área marca los años «full stack». */
const FULL_STACK_AREA_ID = 'backend'
const MONTHS_PER_YEAR = 12

const monthYear = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }))

function formatPartialDate(partialDate: string): string {
  const monthIndex = toMonthIndex(partialDate)
  return monthYear.value.format(new Date(Math.floor(monthIndex / MONTHS_PER_YEAR), monthIndex % MONTHS_PER_YEAR))
}

/** Inicio más antiguo de una lista de periodos (los datos garantizan al menos uno). */
function earliestStart(periods: Period[]): string {
  return periods
    .map((period) => period.start)
    .reduce((earliest, start) => (toMonthIndex(start) < toMonthIndex(earliest) ? start : earliest))
}

/** Del primer mes con experiencia en cualquier área hasta hoy: los «años en tech». */
const techPeriods = computed<Period[]>(() => [
  { start: earliestStart(cv.value.skillAreas.flatMap((area) => area.periods)), end: null },
])

const fullStackPeriods = computed(() => {
  const area = cv.value.skillAreas.find((skillArea) => skillArea.id === FULL_STACK_AREA_ID)
  if (!area) throw new Error(`Falta el área «${FULL_STACK_AREA_ID}» en los datos del CV`)
  return area.periods
})

const countersNote = computed(() =>
  t('countersNote', {
    today: monthYear.value.format(new Date()),
    techSince: formatPartialDate(earliestStart(techPeriods.value)),
    fullStackSince: formatPartialDate(earliestStart(fullStackPeriods.value)),
  }),
)
</script>

<template>
  <div>
    <ul class="profile-counters__list grid grid-cols-2 gap-3 xl:grid-cols-4">
      <li>
        <MetricCard :label="t('yearsInTech')"><YearsFigure :periods="techPeriods" count-up /></MetricCard>
      </li>
      <li>
        <MetricCard :label="t('yearsFullStack')"><YearsFigure :periods="fullStackPeriods" count-up /></MetricCard>
      </li>
      <li>
        <MetricCard :label="t('projects')"><AnimatedNumber :value="cv.projects.length" animate /></MetricCard>
      </li>
      <li>
        <MetricCard :label="t('languages')"><AnimatedNumber :value="cv.languages.length" animate /></MetricCard>
      </li>
    </ul>
    <p class="mt-2 text-xs text-muted">{{ countersNote }}</p>
  </div>
</template>

<i18n lang="json">
{
  "en": {
    "yearsInTech": "Years in tech",
    "yearsFullStack": "Years full stack",
    "projects": "Projects",
    "languages": "Languages",
    "countersNote": "Computed from dates ({today}): in tech since {techSince}, full stack since {fullStackSince}. Projects listed on this site."
  },
  "es": {
    "yearsInTech": "Años en tecnología",
    "yearsFullStack": "Años full stack",
    "projects": "Proyectos",
    "languages": "Idiomas",
    "countersNote": "Calculado desde las fechas ({today}): en tecnología desde {techSince}, full stack desde {fullStackSince}. Proyectos publicados en esta web."
  }
}
</i18n>
