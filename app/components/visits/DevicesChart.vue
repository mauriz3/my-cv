<script setup lang="ts">
import { ArcElement, Chart as ChartJS, DoughnutController, Tooltip, type ChartData, type ChartOptions } from 'chart.js'
import { Chart } from 'vue-chartjs'
import type { VisitsReport } from '~~/lib/visits'

ChartJS.register(DoughnutController, ArcElement, Tooltip, finishAnimationsWhenDisabled)

/** Reparto por dispositivo (anillo con el total de visitas en el centro). */
const props = defineProps<{ devices: VisitsReport['devices']; totalVisits: number }>()

const DRAW_DURATION_MS = 800
const CUTOUT = '70%'
const SEGMENT_BORDER_PX = 2

const { t } = useI18n()
const { integer, percent } = useVisitsFormat()
const { theme, updateMode: themeUpdateMode } = useChartTheme()
const { isReduced } = useMotion()
const { chartRef, updateMode } = useChartPlayback(DRAW_DURATION_MS, themeUpdateMode)
const legend = useLegendToggle()

const items = computed(() =>
  props.devices.map((device, index) => ({
    ...device,
    label: t(`visits.devices.names.${device.key}`),
    share: percent(device.value),
    color: theme.value?.series[index] ?? 'currentColor',
    hidden: legend.isHidden(device.key),
  })),
)
const visibleItems = computed(() => items.value.filter((item) => !item.hidden))
const shownSegments = computed(() => visibleItems.value.filter((item) => item.value > 0).length)

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: visibleItems.value.map((item) => item.label),
  datasets: [
    {
      data: visibleItems.value.map((item) => item.value),
      backgroundColor: visibleItems.value.map((item) => item.color),
      borderColor: theme.value?.surface,
      // El borde solo separa segmentos: con uno solo (p. ej. «Móvil 100 %») o a 0 dejaría una raya en el anillo.
      borderWidth: visibleItems.value.map((item) => (shownSegments.value > 1 && item.value > 0 ? SEGMENT_BORDER_PX : 0)),
    },
  ],
}))

const chartOptions = computed<ChartOptions<'doughnut'>>(() => {
  if (!theme.value) return {}
  const base = baseChartOptions(theme.value, isReduced.value, DRAW_DURATION_MS)
  return {
    ...base,
    cutout: CUTOUT,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins.tooltip,
        callbacks: { label: (item) => ` ${item.label}: ${percent(item.parsed)}` },
      },
    },
  }
})

const summary = computed(() =>
  t('visits.devices.summary', { list: items.value.map((item) => `${item.label} ${item.share}`).join(', ') }),
)
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="relative min-h-0 flex-1">
      <Chart
        v-if="theme"
        ref="chartRef"
        type="doughnut"
        :data="chartData"
        :options="chartOptions"
        :update-mode="updateMode"
        :aria-label="summary"
      />
      <p class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span class="font-display text-xl font-bold text-highlighted tabular-nums">
          {{ integer(totalVisits) }}
        </span>
        <span class="text-xs text-muted">{{ t('visits.devices.total') }}</span>
      </p>
    </div>
    <ChartLegend
      :items="items.map(({ label, color, share, hidden }) => ({ label, color, value: share, hidden }))"
      @toggle="(index) => legend.toggle(devices[index]?.key)"
    />
  </div>
</template>
