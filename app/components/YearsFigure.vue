<script setup lang="ts">
import type { Period } from '~~/lib/period'
import { yearsInPeriods } from '~~/lib/years'

/**
 * Años de experiencia calculados desde las fechas (`lib/years.ts`), nunca escritos a mano.
 * Si algún periodo sigue abierto se muestra «8+» (y contando); si ya terminó, «~2» (aproximado).
 */
const props = withDefaults(defineProps<{ periods: Period[]; countUp?: boolean }>(), { countUp: false })

const ONGOING_SUFFIX = '+'
const APPROXIMATE_PREFIX = '~'

const isOngoing = computed(() => props.periods.some((period) => period.end === null))
const years = computed(() => yearsInPeriods(props.periods, new Date()))
const shownYears = computed(() => (isOngoing.value ? Math.floor(years.value) : Math.round(years.value)))
</script>

<template>
  <span>
    <template v-if="!isOngoing">{{ APPROXIMATE_PREFIX }}</template>
    <AnimatedNumber :value="shownYears" :animate="countUp" />
    <template v-if="isOngoing">{{ ONGOING_SUFFIX }}</template>
  </span>
</template>
