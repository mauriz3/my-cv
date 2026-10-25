<script setup lang="ts">
import { formatPartialDate, isSingleDate, type Period } from '~~/lib/period'

/** Periodo con `<time>` y fechas según el idioma activo. `end: null` = «Present / Actualidad». */
const props = defineProps<{ period: Period }>()
const { t, locale } = useI18n()

const format = (partialDate: string) => formatPartialDate(partialDate, locale.value)
const showsSingleDate = computed(() => isSingleDate(props.period))
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
  </span>
</template>
