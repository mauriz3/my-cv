<script setup lang="ts">
import { yearsInPeriods } from '~~/lib/years'
import { skillAreaColor } from '~/utils/skillAreaColor'

/**
 * Years per area panel: one bar per area, colored with the chart series.
 * With animations on, the bars grow once from the left, including after the header button.
 */
const { t, locale } = useI18n({ useScope: 'local' })
const cv = useCv()

const FULL_WIDTH_PERCENT = 100
const list = ref<HTMLElement | null>(null)
const { state: revealState } = useRevealOnce(list, 0.2)

const today = new Date()
const computedOn = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(today),
)

const areas = computed(() => {
  const withYears = cv.value.skillAreas.map((area) => ({
    ...area,
    years: yearsInPeriods(area.periods, today),
  }))
  const maxYears = Math.max(...withYears.map((area) => area.years))
  return withYears.map((area) => ({
    ...area,
    barWidth: `${(area.years / maxYears) * FULL_WIDTH_PERCENT}%`,
    color: skillAreaColor(area.id),
  }))
})
</script>

<template>
  <Panel :title="t('title')" fill>
    <ul ref="list" class="flex flex-1 flex-col justify-between gap-4" :data-reveal="revealState">
      <li v-for="area in areas" :key="area.id" class="space-y-2 text-sm">
        <span class="flex items-center gap-2 font-semibold" :style="{ color: area.color }">
          <span class="size-2.5 shrink-0 rounded-full" :style="{ background: area.color }" aria-hidden="true" />
          {{ area.name }}
        </span>
        <span class="block text-xs text-muted tabular-nums">
          <YearsFigure :periods="area.periods" /> {{ t('yearsUnit') }}
        </span>
        <span class="years-track" aria-hidden="true">
          <span class="years-fill" :style="{ width: area.barWidth, background: area.color }" />
        </span>
      </li>
    </ul>
    <p class="mt-4 text-xs text-muted">{{ t('note', { date: computedOn }) }}</p>
  </Panel>
</template>

<style>
.years-track {
  display: block;
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ui-border);
}

.years-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transform-origin: left center;
}

:root[data-motion='full'] [data-reveal='hidden'] .years-fill {
  transform: scaleX(0);
}

:root[data-motion='full'] [data-reveal='revealed'] .years-fill {
  animation: years-grow 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes years-grow {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}
</style>

<i18n lang="json">
{
  "en": {
    "title": "Years per area",
    "yearsUnit": "yrs",
    "note": "Computed from role dates ({date}). The longest area sets the scale."
  },
  "es": {
    "title": "Años por área",
    "yearsUnit": "años",
    "note": "Calculado desde las fechas de cada puesto ({date}). El tramo más largo manda la escala."
  }
}
</i18n>
