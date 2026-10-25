<script lang="ts">
import { Chart as ChartJS, Filler, LineElement, PointElement, RadialLinearScale } from 'chart.js'

// Solo lo que usa el radar (el controlador lo registra `vue-chartjs`): sin tooltip ni leyenda, sin cifras.
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler)

/** Un eje del radar. `level` va de 0 a `MAX_SKILL_LEVEL` y nunca se muestra: es un perfil relativo. */
export interface SkillAxis {
  id: string
  label: string
  level: number
}

export const MAX_SKILL_LEVEL = 5
</script>

<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { Radar } from 'vue-chartjs'
import { isMotionReduced } from './ReduceMotionToggle.vue'

/** Radar «Skill profile» sin números: solo los nombres de los ejes y la nota gris «Relative profile». */
const props = defineProps<{ axes: SkillAxis[] }>()

const { t } = useI18n({ useScope: 'local' })
const colorMode = useColorMode()

const CHART_DRAW_DURATION_MS = 700
const AREA_FILL_ALPHA_HEX = '33' // ≈ 20 % de opacidad sobre el color de la serie (#RRGGBBAA)
const POINT_RADIUS_PX = 3
const LINE_WIDTH_PX = 2
const POINT_LABEL_FONT_SIZE_PX = 12

interface ThemeColors {
  series: string
  grid: string
  label: string
  font: string
}

/** Chart.js pinta en canvas y no entiende `var(--x)`: leemos los tokens del tema ya resueltos. */
function readThemeColors(): ThemeColors {
  const rootStyle = getComputedStyle(document.documentElement)
  const token = (name: string) => rootStyle.getPropertyValue(name).trim()
  return {
    series: token('--chart-1'),
    grid: token('--ui-border'),
    label: token('--ui-text-muted'),
    font: getComputedStyle(document.body).fontFamily,
  }
}

const themeColors = ref<ThemeColors>()

onMounted(() => {
  themeColors.value = readThemeColors()
  // La clase `.dark` cambia tras el render: esperamos al siguiente tick para leer los tokens nuevos.
  watch(
    () => colorMode.value,
    async () => {
      await nextTick()
      themeColors.value = readThemeColors()
    },
  )
})

const chartData = computed<ChartData<'radar'>>(() => ({
  labels: props.axes.map((axis) => axis.label),
  datasets: [
    {
      data: props.axes.map((axis) => axis.level),
      borderColor: themeColors.value?.series,
      backgroundColor: `${themeColors.value?.series}${AREA_FILL_ALPHA_HEX}`,
      pointBackgroundColor: themeColors.value?.series,
      pointRadius: POINT_RADIUS_PX,
      borderWidth: LINE_WIDTH_PX,
      fill: true,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'radar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: isMotionReduced() ? false : { duration: CHART_DRAW_DURATION_MS },
  events: [], // sin hover ni tooltip: no hay cifras que enseñar
  scales: {
    r: {
      min: 0,
      max: MAX_SKILL_LEVEL,
      ticks: { display: false },
      grid: { color: themeColors.value?.grid },
      angleLines: { color: themeColors.value?.grid },
      pointLabels: {
        color: themeColors.value?.label,
        font: { family: themeColors.value?.font, size: POINT_LABEL_FONT_SIZE_PX },
      },
    },
  },
}))

const accessibleLabel = computed(() => t('ariaLabel', { axes: props.axes.map((axis) => axis.label).join(', ') }))
</script>

<template>
  <Panel :title="t('title')" :note="t('note')">
    <!-- Alto fijo: el hueco existe antes de que el canvas se pinte (CLS 0). -->
    <div class="h-64 md:h-72">
      <Radar v-if="themeColors" :data="chartData" :options="chartOptions" :aria-label="accessibleLabel" />
    </div>
  </Panel>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Skill profile",
    "note": "Relative profile",
    "ariaLabel": "Relative skill profile radar, without figures. Axes: {axes}."
  },
  "es": {
    "title": "Perfil de habilidades",
    "note": "Perfil relativo",
    "ariaLabel": "Radar del perfil relativo de habilidades, sin cifras. Ejes: {axes}."
  }
}
</i18n>
