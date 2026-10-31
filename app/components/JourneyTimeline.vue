<script setup lang="ts">
import { JOURNEY_POINTS, pointPosition, type MarkerState } from '~~/lib/journey'

/**
 * Timeline del recorrido: 5 marcadores (hecho · actual · pendiente) y la línea de progreso,
 * que crece con `--journey-position`. Es un apoyo visual: la información está en las tarjetas.
 */
defineProps<{ markerStates: MarkerState[] }>()

const { t } = useI18n()
</script>

<template>
  <div class="journey__timeline" aria-hidden="true">
    <span class="journey__rail"><span class="journey__progress" /></span>
    <ol class="journey__markers">
      <li
        v-for="(point, index) in JOURNEY_POINTS"
        :key="point.id"
        class="journey__marker"
        :data-state="markerStates[index]"
        :style="{ '--point-position': pointPosition(index) }"
      >
        <span class="journey__dot" />
        <span class="journey__marker-label">{{ index + 1 }} · {{ t(`nav.${point.id}`) }}</span>
      </li>
    </ol>
  </div>
</template>
