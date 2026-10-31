<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from 'chart.js'
import { Chart } from 'vue-chartjs'
import type { VisitsReport } from '~~/lib/visits'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

/** Páginas más vistas: barras horizontales con la cifra escrita al final de cada barra. */
const props = defineProps<{ pages: VisitsReport['pages'] }>()

const DRAW_DURATION_MS = 700
const BAR_RADIUS_PX = 4
const MAX_BAR_THICKNESS_PX = 18
const VALUE_LABEL_GAP_PX = 6
/** Hueco a la derecha para que quepa la cifra de la barra más larga. */
const VALUE_AXIS_GRACE = '18%'

interface ValueLabelOptions {
  color: string
  font: string
  format: (value: number) => string
}

/** Etiquetas directas (sin plugin externo): la cifra a la derecha de cada barra. */
const valueLabels: Plugin<'bar', ValueLabelOptions> = {
  id: 'valueLabels',
  afterDatasetsDraw(chart, _args, options) {
    const { ctx } = chart
    const values = chart.data.datasets[0]?.data ?? []
    ctx.save()
    ctx.fillStyle = options.color
    ctx.font = options.font
    ctx.textBaseline = 'middle'
    chart.getDatasetMeta(0).data.forEach((bar, index) => {
      ctx.fillText(options.format(Number(values[index] ?? 0)), bar.x + VALUE_LABEL_GAP_PX, bar.y)
    })
    ctx.restore()
  },
}

const { t } = useI18n()
const { integer, pageName } = useVisitsFormat()
const { theme, updateMode } = useChartTheme()
const { isReduced } = useMotion()

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.pages.map((page) => pageName(page.path)),
  datasets: [
    {
      label: t('visits.pages.views'),
      data: props.pages.map((page) => page.views),
      backgroundColor: theme.value?.series[0],
      borderRadius: BAR_RADIUS_PX,
      maxBarThickness: MAX_BAR_THICKNESS_PX,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => {
  if (!theme.value) return {}
  const base = baseChartOptions(theme.value, isReduced.value, DRAW_DURATION_MS)
  const font = chartFont(theme.value)
  return {
    ...base,
    indexAxis: 'y',
    scales: {
      x: { ...valueAxis(theme.value), grace: VALUE_AXIS_GRACE, ticks: { display: false }, grid: { display: false } },
      y: categoryAxis(theme.value),
    },
    plugins: {
      ...base.plugins,
      valueLabels: { color: theme.value.text, font: `${font.size}px ${font.family}`, format: integer },
    } as ChartOptions<'bar'>['plugins'],
  }
})

const summary = computed(() =>
  t('visits.pages.summary', {
    list: props.pages.map((page) => `${pageName(page.path)} ${integer(page.views)}`).join(', '),
  }),
)
</script>

<template>
  <div class="relative h-full">
    <Chart
      v-if="theme"
      type="bar"
      :data="chartData"
      :options="chartOptions"
      :plugins="[valueLabels]"
      :update-mode="updateMode"
      :aria-label="summary"
    />
  </div>
</template>
