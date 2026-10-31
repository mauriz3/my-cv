<script setup lang="ts">
import { changeDirection, type Trend } from '~~/lib/visits'

/**
 * Cifra clave de Visitas: etiqueta, valor (cuenta hacia arriba al verse) y cambio frente al periodo anterior.
 * `loading`: mismas líneas con marcadores grises (el alto no cambia al llegar los datos).
 */
defineProps<{
  loading: boolean
  label: string
  value: number
  format: (value: number) => string
  /** Cambio frente al periodo anterior (número) y su texto ya formateado. */
  change: number
  changeText: string
  trend: Trend
  comparison: string
}>()

const { t } = useI18n()

/** La flecha dice hacia dónde va; el color, si es bueno (en el rebote, bajar es bueno). */
const DIRECTION_ICONS = { up: 'i-lucide-arrow-up-right', down: 'i-lucide-arrow-down-right', flat: 'i-lucide-minus' }
</script>

<template>
  <div class="visits-card rounded-xl border border-default bg-elevated p-4">
    <p class="text-sm text-muted">{{ label }}</p>
    <p class="mt-1 font-display text-2xl font-bold text-highlighted tabular-nums">
      <span v-if="loading" class="skeleton inline-block h-[1em] w-24 rounded align-middle" />
      <AnimatedNumber v-else :value="value" :format="format" animate />
    </p>
    <!-- Cambio y comparación en líneas propias: el alto es el mismo con datos y sin ellos. -->
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
