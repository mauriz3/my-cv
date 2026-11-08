<script setup lang="ts">
import { changeDirection, type Trend } from '~~/lib/visits'

/**
 * Key number of visits: label, value (count up when viewed) and change compared to the previous period.
 * `loading`: same lines with grey markers (the height does not change when the data arrives).
 */
defineProps<{
  loading: boolean
  label: string
  value: number
  format: (value: number) => string
  /** Change compared to the previous period (number) and its already formatted text. */
  change: number
  changeText: string
  trend: Trend
  comparison: string
}>()

const { t } = useI18n()

/** The arrow says where it's going; the color, if it's good (on the bounce, going down is good). */
const DIRECTION_ICONS = { up: 'i-lucide-arrow-up-right', down: 'i-lucide-arrow-down-right', flat: 'i-lucide-minus' }
</script>

<template>
  <div class="visits-card rounded-xl border border-default bg-elevated p-4">
    <p class="text-sm text-muted">{{ label }}</p>
    <p class="mt-1 font-display text-2xl font-bold text-highlighted tabular-nums">
      <span v-if="loading" class="skeleton inline-block h-[1em] w-24 rounded align-middle" />
      <AnimatedNumber v-else :value="value" :format="format" animate />
    </p>
    <!-- Change and comparison in own lines: the height is the same with data and without them. -->
    <p class="mt-1 text-xs">
      <span v-if="loading" class="skeleton inline-block h-[1em] w-12 rounded align-middle" />
      <span v-else class="inline-flex items-center gap-1 font-medium tabular-nums" :class="`kpi-trend--${trend}`">
        <UIcon :name="DIRECTION_ICONS[changeDirection(change)]" class="size-3.5" aria-hidden="true" />
        {{ changeText }}
        <span class="sr-only">({{ t(`visits.trend.${trend}`) }})</span>
      </span>
    </p>
    <p class="text-xs text-muted">{{ comparison }}</p>
  </div>
</template>

<style scoped>
.kpi-trend--better {
  color: var(--trend-better);
}

.kpi-trend--worse {
  color: var(--trend-worse);
}

.kpi-trend--flat {
  color: var(--ui-text-muted);
}
</style>
