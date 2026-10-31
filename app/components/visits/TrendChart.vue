<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
} from 'chart.js'
import { Chart } from 'vue-chartjs'
import { peakOf, sum, withAlpha, type VisitsRange, type VisitsReport } from '~~/lib/visits'

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  finishAnimationsWhenDisabled,
)

/** Visitas en el tiempo: periodo actual (área con degradado) y anterior (grafito discontinuo). */
const props = defineProps<{ timeseries: VisitsReport['timeseries']; range: VisitsRange }>()

const DRAW_DURATION_MS = 900
const LINE_TENSION = 0.35
const CURRENT_LINE_WIDTH_PX = 2.5
const PREVIOUS_LINE_WIDTH_PX = 2
const PREVIOUS_DASH: number[] = [6, 4]
const AREA_TOP_ALPHA = 0.28

const { t } = useI18n()
const { integer, timeLabel } = useVisitsFormat()
const { theme, updateMode } = useChartTheme()
const { isReduced } = useMotion()
const SERIES_KEYS = ['current', 'previous'] as const
const legend = useLegendToggle()

const labels = computed(() => props.timeseries.labels.map((label) => timeLabel(label, props.range)))
const seriesNames = computed(() => SERIES_KEYS.map((key) => t(`visits.timeline.${key}`)))

/** Degradado de la serie actual hacia transparente (necesita el área ya medida). */
function areaFill(context: ScriptableContext<'line'>, color: string) {
  const { ctx, chartArea } = context.chart
  if (!chartArea) return withAlpha(color, AREA_TOP_ALPHA / 2)
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, withAlpha(color, AREA_TOP_ALPHA))
  gradient.addColorStop(1, withAlpha(color, 0))
  return gradient
}

const chartData = computed<ChartData<'line'>>(() => {
  const [current, , , , previous] = theme.value?.series ?? []
  return {
    labels: labels.value,
    datasets: [
      {
        label: seriesNames.value[0],
        data: props.timeseries.current,
        borderColor: current,
        backgroundColor: (context) => areaFill(context, current ?? '#000000'),
        fill: 'origin',
        borderWidth: CURRENT_LINE_WIDTH_PX,
        hidden: legend.isHidden('current'),
      },
      {
        label: seriesNames.value[1],
        data: props.timeseries.previous,
        borderColor: previous,
        backgroundColor: previous,
        borderDash: PREVIOUS_DASH,
        fill: false,
        borderWidth: PREVIOUS_LINE_WIDTH_PX,
        hidden: legend.isHidden('previous'),
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => {
  if (!theme.value) return {}
  const base = baseChartOptions(theme.value, isReduced.value, DRAW_DURATION_MS)
  return {
    ...base,
    interaction: { mode: 'index', intersect: false },
    elements: { line: { tension: LINE_TENSION }, point: { radius: 0, hoverRadius: 4, hitRadius: 8 } },
    scales: { x: categoryAxis(theme.value), y: valueAxis(theme.value) },
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins.tooltip,
        callbacks: { label: (item) => ` ${item.dataset.label}: ${integer(item.parsed.y ?? 0)}` },
      },
    },
  }
})

const legendItems = computed(() =>
  seriesNames.value.map((label, index) => ({
    label,
    color: (index === 0 ? theme.value?.series[0] : theme.value?.series[4]) ?? 'currentColor',
    dashed: index === 1,
    hidden: legend.isHidden(SERIES_KEYS[index] ?? ''),
  })),
)

const summary = computed(() => {
  const peak = peakOf(props.timeseries.current)
  return t(`visits.timeline.summary.${props.range}`, {
    total: integer(sum(props.timeseries.current)),
    peak: integer(peak?.value ?? 0),
    at: peak ? (labels.value[peak.index] ?? '') : '',
  })
})
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="relative min-h-0 flex-1">
      <Chart
        v-if="theme"
        type="line"
        :data="chartData"
        :options="chartOptions"
        :update-mode="updateMode"
        :aria-label="summary"
      />
    </div>
    <ChartLegend :items="legendItems" @toggle="(index) => legend.toggle(SERIES_KEYS[index])" />
  </div>
</template>
