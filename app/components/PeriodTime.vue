<script setup lang="ts">
import { durationOf, formatDuration } from '~~/lib/duration'
import { formatPartialDate, isSingleDate, type Period } from '~~/lib/period'

/**
 * Periodo con `<time>` y fechas según el idioma activo. `end: null` = «Present / Actualidad».
 * Con `showDuration` añade entre paréntesis la duración (meses si es menos de un año; años si es más).
 */
const props = defineProps<{ period: Period; showDuration?: boolean }>()
const { t, locale } = useI18n()

const format = (partialDate: string) => formatPartialDate(partialDate, locale.value)
const showsSingleDate = computed(() => isSingleDate(props.period))
const duration = computed(() => {
  const found = props.showDuration ? durationOf(props.period, new Date()) : null
  return found ? formatDuration(found, locale.value) : null
})
</script>

<template>
  <span class="text-sm text-muted tabular-nums">
    <time :datetime="period.start">{{ format(period.start) }}</time>
    <template v-if="!showsSingleDate">
      <span aria-hidden="true"> – </span>
      <span class="sr-only"> {{ t('period.to') }} </span>
      <time v-if="period.end" :datetime="period.end">{{ format(period.end) }}</time>
      <span v-else>{{ t('period.present') }}</span>
    </template>
    <span v-if="duration" data-testid="period-duration"> ({{ duration }})</span>
  </span>
</template>
