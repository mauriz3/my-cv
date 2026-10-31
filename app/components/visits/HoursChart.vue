<script setup lang="ts">
import { CategoryScale, Chart as ChartJS, Tooltip, type ChartData, type ChartOptions } from 'chart.js'
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix'
import { Chart } from 'vue-chartjs'
import { heatAlpha, withAlpha, type VisitsReport } from '~~/lib/visits'

ChartJS.register(MatrixController, MatrixElement, CategoryScale, Tooltip, finishAnimationsWhenDisabled)

/** Mapa de calor día × franja de 3 h (escala secuencial del azul vivo). */
const props = defineProps<{ hours: VisitsReport['hours'] }>()

const DRAW_DURATION_MS = 600
const CELL_GAP_PX = 3
const CELL_RADIUS_PX = 3
const LEGEND_STEPS = [0.1, 0.4, 0.7, 1]

interface Cell {
  x: string
  y: string
  v: number
}

const { t } = useI18n()
const { integer, weekDay, slotLabel } = useVisitsFormat()
const { theme, updateMode } = useChartTheme()
const { isReduced } = useMotion()

const dayLabels = computed(() => props.hours.days.map(weekDay))
const slotLabels = computed(() => props.hours.slots.map(slotLabel))
const cells = computed<Cell[]>(() =>
  props.hours.values.flatMap((row, dayIndex) =>
    row.map((value, slotIndex) => ({
      x: slotLabels.value[slotIndex] ?? '',
      y: dayLabels.value[dayIndex] ?? '',
      v: value,
    })),
  ),
)
const maxValue = computed(() => Math.max(0, ...cells.value.map((cell) => cell.v)))

const chartData = computed<ChartData<'matrix', Cell[]>>(() => ({
  datasets: [
    {
      label: t('visits.hours.title'),
      data: cells.value,
      backgroundColor: (context) =>
        theme.value
          ? withAlpha(theme.value.sequential, heatAlpha((context.raw as Cell | undefined)?.v ?? 0, maxValue.value))
          : 'transparent',
      borderRadius: CELL_RADIUS_PX,
      width: ({ chart }) => (chart.chartArea?.width ?? 0) / slotLabels.value.length - CELL_GAP_PX,
      height: ({ chart }) => (chart.chartArea?.height ?? 0) / dayLabels.value.length - CELL_GAP_PX,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'matrix'>>(() => {
  if (!theme.value) return {}
  const base = baseChartOptions(theme.value, isReduced.value, DRAW_DURATION_MS)
  const axis = categoryAxis(theme.value)
  return {
    ...base,
    scales: {
      x: { ...axis, type: 'category', labels: slotLabels.value, offset: true, border: { display: false } },
      y: {
        ...axis,
        type: 'category',
        labels: dayLabels.value,
        offset: true,
        reverse: true,
        border: { display: false },
      },
    },
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins.tooltip,
        callbacks: {
          title: (items) => {
            const cell = items[0]?.raw as Cell | undefined
            return cell ? `${cell.y} · ${cell.x}` : ''
          },
          label: (item) => ` ${integer((item.raw as Cell).v)}`,
        },
      },
    },
  }
})

const summary = computed(() => {
  const busiest = cells.value.reduce<Cell | undefined>(
    (best, cell) => (!best || cell.v > best.v ? cell : best),
    undefined,
  )
  return t('visits.hours.summary', { day: busiest?.y ?? '', slot: busiest?.x ?? '', value: integer(busiest?.v ?? 0) })
})
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="relative min-h-0 flex-1">
      <Chart
        v-if="theme"
        type="matrix"
        :data="chartData"
        :options="chartOptions"
        :update-mode="updateMode"
        :aria-label="summary"
      />
    </div>
    <!-- Escala de color (de menos a más visitas). -->
    <p class="flex min-h-9 items-center justify-center gap-2 text-xs text-muted" aria-hidden="true">
      {{ t('visits.hours.less') }}
      <span
        v-for="alpha in LEGEND_STEPS"
        :key="alpha"
        class="size-3 rounded-sm"
        :style="{ background: theme && withAlpha(theme.sequential, alpha) }"
      />
      {{ t('visits.hours.more') }}
    </p>
  </div>
</template>
