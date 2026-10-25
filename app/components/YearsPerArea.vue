<script setup lang="ts">
import { yearsInPeriods } from '~~/lib/years'

/**
 * Panel «Years per area»: una barra por área con sus años calculados desde las fechas.
 * Las áreas que ya terminaron (p. ej. DevOps) se muestran atenuadas.
 */
const { t, locale } = useI18n({ useScope: 'local' })
const cv = useCv()

const FULL_WIDTH_PERCENT = 100

const today = new Date()
const computedOn = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(today),
)

const areas = computed(() => {
  const withYears = cv.value.skillAreas.map((area) => ({
    ...area,
    years: yearsInPeriods(area.periods, today),
    isOngoing: area.periods.some((period) => period.end === null),
  }))
  const maxYears = Math.max(...withYears.map((area) => area.years))
  return withYears.map((area) => ({
    ...area,
    barWidth: `${(area.years / maxYears) * FULL_WIDTH_PERCENT}%`,
  }))
})
</script>

<template>
  <Panel :title="t('title')">
    <ul class="space-y-3">
      <li v-for="area in areas" :key="area.id" class="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
        <span>{{ area.name }}</span>
        <span class="h-2 overflow-hidden rounded-full bg-accented" aria-hidden="true">
          <span
            class="block h-full rounded-full"
            :class="area.isOngoing ? 'bg-primary' : 'bg-primary/40'"
            :style="{ width: area.barWidth }"
          />
        </span>
        <span class="font-semibold tabular-nums">
          <YearsFigure :periods="area.periods" /> {{ t('yearsUnit') }}
        </span>
      </li>
    </ul>
    <p class="mt-3 text-xs text-muted">{{ t('note', { date: computedOn }) }}</p>
  </Panel>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Years per area",
    "yearsUnit": "yrs",
    "note": "Computed from role dates ({date}). Areas that ended are shown muted."
  },
  "es": {
    "title": "Años por área",
    "yearsUnit": "años",
    "note": "Calculado desde las fechas de cada puesto ({date}). Las áreas ya terminadas aparecen atenuadas."
  }
}
</i18n>
