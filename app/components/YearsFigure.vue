<script setup lang="ts">
import type { Period } from '~~/lib/period'
import { yearsInPeriods } from '~~/lib/years'

/**
 * Years of experience calculated from dates (`lib/years.ts`), never handwritten.
 * If any period is still open, "8+" is displayed (and counting); if it is already over, "~2" (approximate).
 * `progress`: cuenta ligada al scroll (ver AnimatedNumber).
 */
const props = withDefaults(defineProps<{ periods: Period[]; countUp?: boolean; progress?: number }>(), {
  countUp: false,
  progress: undefined,
})

const ONGOING_SUFFIX = '+'
const APPROXIMATE_PREFIX = '~'

const isOngoing = computed(() => props.periods.some((period) => period.end === null))
const years = computed(() => yearsInPeriods(props.periods, new Date()))
const shownYears = computed(() => (isOngoing.value ? Math.floor(years.value) : Math.round(years.value)))
</script>

<template>
  <span>
    <template v-if="!isOngoing">{{ APPROXIMATE_PREFIX }}</template>
    <AnimatedNumber :value="shownYears" :animate="countUp" :progress="progress" />
    <template v-if="isOngoing">{{ ONGOING_SUFFIX }}</template>
  </span>
</template>
