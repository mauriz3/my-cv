<script setup lang="ts">
import { Chart as ChartJS, PointElement, Tooltip, type ChartData, type ChartOptions } from 'chart.js'
import { BubbleMapController, GeoFeature, ProjectionScale, SizeScale, topojson } from 'chartjs-chart-geo'
import { geoCentroid } from 'd3-geo'
import { Chart } from 'vue-chartjs'
import worldAtlas from 'world-atlas/countries-110m.json'
import { ISO_NUMERIC_BY_ALPHA2 } from '~~/lib/countryCodes'
import { OTHER_COUNTRIES_ISO, heatAlpha, withAlpha, type VisitsReport } from '~~/lib/visits'

ChartJS.register(
  BubbleMapController,
  GeoFeature,
  PointElement,
  ProjectionScale,
  SizeScale,
  Tooltip,
  finishAnimationsWhenDisabled,
)

/** Mapa de burbujas por país (proyección Equal Earth, mapa empaquetado en local) y su ranking al lado. */
const props = defineProps<{ countries: VisitsReport['countries'] }>()

const DRAW_DURATION_MS = 700
const BUBBLE_SIZE_RANGE_PX: [number, number] = [4, 24]
const ANTARCTICA_ID = '010' // fuera del contorno: solo restaría alto al mapa

type Atlas = Parameters<typeof topojson.feature>[0]
const atlas = worldAtlas as unknown as Atlas
const countryFeatures = (() => {
  const collection = topojson.feature(atlas, atlas.objects.countries!)
  return 'features' in collection ? collection.features.filter((feature) => feature.id !== ANTARCTICA_ID) : []
})()
const featureById = new Map(countryFeatures.map((feature) => [String(feature.id), feature]))

const { t } = useI18n()
const { integer, countryName } = useVisitsFormat()
const { theme, updateMode } = useChartTheme()
const { isReduced } = useMotion()

const maxVisits = computed(() => Math.max(1, ...props.countries.map((country) => country.visits)))

/** Burbujas en el centroide de cada país conocido («Otros» no tiene lugar en el mapa). */
const bubbles = computed(() =>
  props.countries.flatMap((country) => {
    const feature = featureById.get(ISO_NUMERIC_BY_ALPHA2.get(country.iso) ?? '')
    if (country.iso === OTHER_COUNTRIES_ISO || !feature) return []
    const [longitude, latitude] = geoCentroid(feature)
    return [{ longitude, latitude, value: country.visits, name: countryName(country.iso) }]
  }),
)

const chartData = computed<ChartData<'bubbleMap'>>(() => ({
  labels: bubbles.value.map((bubble) => bubble.name),
  datasets: [
    {
      label: t('visits.countries.title'),
      outline: countryFeatures,
      showOutline: true,
      data: bubbles.value,
      backgroundColor: theme.value && withAlpha(theme.value.sequential, 0.7),
      borderColor: theme.value?.sequential,
      outlineBackgroundColor: theme.value && withAlpha(theme.value.muted, 0.12),
      outlineBorderColor: theme.value?.grid,
      outlineBorderWidth: 0.5,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'bubbleMap'>>(() => {
  if (!theme.value) return {}
  const base = baseChartOptions(theme.value, isReduced.value, DRAW_DURATION_MS)
  return {
    ...base,
    scales: {
      projection: { axis: 'x', projection: 'equalEarth' },
      size: { axis: 'x', size: BUBBLE_SIZE_RANGE_PX, display: false },
    },
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins.tooltip,
        callbacks: {
          title: () => '',
          label: (item) =>
            ` ${item.chart.data.labels?.[item.dataIndex] ?? ''}: ${integer((item.raw as { value: number }).value)}`,
        },
      },
    },
  }
})

const summary = computed(() =>
  t('visits.countries.summary', {
    list: props.countries.map((country) => `${countryName(country.iso)} ${integer(country.visits)}`).join(', '),
  }),
)
</script>

<template>
  <div class="grid h-full gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
    <div class="relative h-[200px] md:h-full">
      <Chart
        v-if="theme"
        type="bubbleMap"
        :data="chartData"
        :options="chartOptions"
        :update-mode="updateMode"
        :aria-label="summary"
      />
    </div>
    <!-- Ranking: misma información en texto (también la usa el lector de pantalla). -->
    <ol class="grid content-start gap-x-4 gap-y-1 text-sm max-md:grid-cols-2">
      <li v-for="country in countries" :key="country.iso" class="flex items-center justify-between gap-2">
        <span class="flex min-w-0 items-center gap-2">
          <span
            class="size-2.5 shrink-0 rounded-full"
            :style="{ background: theme && withAlpha(theme.sequential, heatAlpha(country.visits, maxVisits)) }"
            aria-hidden="true"
          />
          <span class="truncate">{{ countryName(country.iso) }}</span>
        </span>
        <span class="text-muted tabular-nums">{{ integer(country.visits) }}</span>
      </li>
    </ol>
  </div>
</template>
