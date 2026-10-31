<script setup lang="ts">
import {
  ArcElement,
  Chart as ChartJS,
  PolarAreaController,
  RadialLinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Chart } from 'vue-chartjs'
import { withAlpha, type VisitsReport } from '~~/lib/visits'

ChartJS.register(PolarAreaController, ArcElement, RadialLinearScale, Tooltip, finishAnimationsWhenDisabled)

/** Fuentes de tráfico (área polar, sin marcas en el eje radial). */
const props = defineProps<{ sources: VisitsReport['sources'] }>()

const DRAW_DURATION_MS = 800
const SEGMENT_ALPHA = 0.85

const { t } = useI18n()
const { percent } = useVisitsFormat()
const { theme, updateMode } = useChartTheme()
const { isReduced } = useMotion()
const legend = useLegendToggle()

const items = computed(() =>
  props.sources.map((source, index) => ({
    ...source,
    label: t(`visits.sources.names.${source.key}`),
    share: percent(source.value),
    color: theme.value?.series[index] ?? 'currentColor',
    hidden: legend.isHidden(source.key),
  })),
)
const visibleItems = computed(() => items.value.filter((item) => !item.hidden))

const chartData = computed<ChartData<'polarArea'>>(() => ({
  labels: visibleItems.value.map((item) => item.label),
  datasets: [
    {
      data: visibleItems.value.map((item) => item.value),
      backgroundColor: visibleItems.value.map((item) => withAlpha(item.color, SEGMENT_ALPHA)),
      borderColor: theme.value?.surface,
      borderWidth: 2,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'polarArea'>>(() => {
  if (!theme.value) return {}
  const base = baseChartOptions(theme.value, isReduced.value, DRAW_DURATION_MS)
  return {
    ...base,
    scales: { r: { ticks: { display: false }, grid: { color: theme.value.grid }, angleLines: { display: false } } },
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins.tooltip,
        callbacks: { label: (item) => ` ${item.label}: ${percent(item.parsed.r)}` },
      },
    },
  }
})

const summary = computed(() =>
  t('visits.sources.summary', { list: items.value.map((item) => `${item.label} ${item.share}`).join(', ') }),
)
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="relative min-h-0 flex-1">
      <Chart
        v-if="theme"
        type="polarArea"
        :data="chartData"
        :options="chartOptions"
        :update-mode="updateMode"
        :aria-label="summary"
      />
    </div>
    <ChartLegend
      :items="items.map(({ label, color, share, hidden }) => ({ label, color, value: share, hidden }))"
      @toggle="(index) => legend.toggle(sources[index]?.key)"
    />
  </div>
</template>
