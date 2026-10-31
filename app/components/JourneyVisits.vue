<script setup lang="ts">
import { DEFAULT_VISITS_RANGE, formatKpiChange, kpiTrend, type KpiKey } from '~~/lib/visits'
import { donutArcs, endTrend, sparklinePaths } from '~~/lib/sparkline'

/**
 * Contenido de la tarjeta 6 «Visitas» del recorrido: 2 KPI, mini área de 30 días y mini donut de dispositivos
 * en SVG ligero (sin Chart.js en el Inicio), con los datos de la misma capa que la página Visitas (`useVisits`).
 * `draw` (0–1) dibuja la línea, el área y los arcos y hace contar los KPI; `pulse` resalta el botón.
 */
const props = defineProps<{ draw: number; pulse: boolean }>()

/** Lienzo de la mini área: se escala sin deformarse (misma proporción en todos los tamaños). */
const SPARK_WIDTH = 240
const SPARK_HEIGHT = 48
const DONUT_RADIUS = 16
const DONUT_STROKE = 7
const DONUT_STAGGER = 0.12
const KPI_KEYS = ['visits', 'visitors'] as const satisfies readonly KpiKey[]
const DEVICE_COLORS = ['var(--ui-primary)', 'var(--chart-2)', 'var(--chart-3)']

const { t } = useI18n({ useScope: 'local' })
const { t: tGlobal } = useI18n()
const localePath = useLocalePath()
const { language, integer, percent } = useVisitsFormat()
const { report } = useVisits(ref(DEFAULT_VISITS_RANGE))
const gradientId = useId()

const spark = computed(() => sparklinePaths(report.value?.timeseries.current ?? [], SPARK_WIDTH, SPARK_HEIGHT))
const arcs = computed(() => donutArcs(report.value?.devices.map((device) => device.value) ?? []))

const kpis = computed(() =>
  KPI_KEYS.map((key) => {
    const kpi = report.value?.kpis[key]
    return {
      key,
      label: tGlobal(`visits.kpi.${key}`),
      shown: integer(Math.round((kpi?.value ?? 0) * props.draw)),
      final: kpi ? integer(kpi.value) : '',
      change: kpi ? formatKpiChange(key, kpi.delta, language.value) : '',
      trend: kpiTrend(key, kpi?.delta ?? 0),
    }
  }),
)

const summary = computed(() => {
  const data = report.value
  if (!data) return t('loading')
  const [visits, visitors] = kpis.value
  return t('summary', {
    visits: visits?.final,
    visitsChange: visits?.change,
    visitors: visitors?.final,
    visitorsChange: visitors?.change,
    trend: t(`trend.${endTrend(data.timeseries.current)}`),
    devices: data.devices
      .map((device) => `${tGlobal(`visits.devices.names.${device.key}`)} ${percent(device.value)}`)
      .join(', '),
  })
})
</script>

<template>
  <div class="journey-visits" :data-pulse="pulse || undefined" :style="{ '--visits-draw': draw }">
    <h2 class="mt-1 font-display text-xl font-bold text-highlighted">{{ t('title') }}</h2>

    <dl class="mt-2 grid grid-cols-2 gap-3">
      <div v-for="kpi in kpis" :key="kpi.key">
        <dt class="text-xs text-muted">{{ kpi.label }}</dt>
        <dd class="flex items-baseline gap-2">
          <span class="font-display text-2xl font-bold text-highlighted tabular-nums">
            <template v-if="report">
              <span aria-hidden="true">{{ kpi.shown }}</span>
              <span class="sr-only">{{ kpi.final }}</span>
            </template>
            <span v-else class="skeleton inline-block h-[1em] w-16 rounded align-middle" />
          </span>
          <span v-if="report" class="text-xs font-medium tabular-nums" :class="`journey-visits__trend--${kpi.trend}`">
            {{ kpi.change }}
          </span>
        </dd>
      </div>
    </dl>

    <div class="mt-3 flex items-center gap-4" role="img" :aria-label="summary">
      <svg
        class="journey-visits__spark h-auto min-w-0 flex-1"
        :viewBox="`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`"
        aria-hidden="true"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--ui-primary)" stop-opacity="0.3" />
            <stop offset="1" stop-color="var(--ui-primary)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="journey-visits__area" :d="spark.area" :fill="`url(#${gradientId})`" />
        <path class="journey-visits__line" :d="spark.line" pathLength="1" />
      </svg>
      <svg class="journey-visits__donut size-12 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <circle
          v-for="(arc, index) in arcs"
          :key="index"
          cx="24"
          cy="24"
          :r="DONUT_RADIUS"
          pathLength="1"
          fill="none"
          :stroke="DEVICE_COLORS[index]"
          :stroke-width="DONUT_STROKE"
          :style="{ '--arc-length': arc.length, '--arc-start': arc.start, '--arc-delay': index * DONUT_STAGGER }"
        />
      </svg>
    </div>

    <p class="mt-2 text-xs text-muted">{{ tGlobal('visits.sampleNote') }}</p>

    <UButton
      :to="localePath({ path: '/visits', hash: '#visits-title' })"
      trailing-icon="i-lucide-arrow-right"
      class="journey-visits__cta mt-3 min-h-11"
      data-testid="journey-visits-cta"
    >
      {{ t('cta') }}
    </UButton>
  </div>
</template>

<style>
.journey-visits__line {
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: calc(1 - var(--visits-draw, 1));
}

.journey-visits__area {
  transform-box: fill-box;
  transform-origin: left;
  transform: scaleX(var(--visits-draw, 1));
}

.journey-visits__spark {
  overflow: visible;
}

/* Cada arco empieza arriba (−90°) en su sitio y se dibuja escalonado según `--visits-draw`. */
.journey-visits__donut circle {
  stroke-dasharray: var(--arc-length) 1;
  stroke-dashoffset: calc(
    var(--arc-length) * (1 - clamp(0, (var(--visits-draw, 1) - var(--arc-delay)) / (1 - 2 * 0.12), 1))
  );
  transform-origin: center;
  transform: rotate(calc(var(--arc-start) * 360deg - 90deg));
}

.journey-visits__trend--better {
  color: var(--trend-better);
}

.journey-visits__trend--worse {
  color: var(--trend-worse);
}

.journey-visits__trend--flat {
  color: var(--ui-text-muted);
}

/* Foco: anillo de 2 px del color del texto y halo brand de 4 px. */
.journey-visits__cta:focus-visible {
  outline: 2px solid var(--ui-text);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--brand-vivid) 45%, transparent);
}

.journey-visits__cta {
  position: relative;
}

.journey-visits__cta::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  background: var(--brand-vivid);
  opacity: 0;
  z-index: -1;
  pointer-events: none;
}

:root[data-motion='full'] .journey-visits[data-pulse] .journey-visits__cta {
  animation: journey-visits-pulse 600ms cubic-bezier(0.4, 0, 0.2, 1) var(--visits-pulse-count, 1);
}

:root[data-motion='full'] .journey-visits[data-pulse] .journey-visits__cta::after {
  animation: journey-visits-halo 600ms cubic-bezier(0.4, 0, 0.2, 1) var(--visits-pulse-count, 1);
}

@media (min-width: 768px) {
  .journey-visits {
    --visits-pulse-count: 2;
  }
}

@keyframes journey-visits-pulse {
  50% {
    transform: scale(1.04);
  }
}

@keyframes journey-visits-halo {
  50% {
    opacity: 0.45;
  }
}
</style>

<i18n lang="json">
{
  "en": {
    "title": "Visits · last 30 days",
    "cta": "View visits",
    "loading": "Loading visits",
    "summary": "Visits, last 30 days: {visits} ({visitsChange}); visitors {visitors} ({visitorsChange}). {trend} Devices: {devices}. Sample data.",
    "trend": {
      "rising": "Trend rising at the end of the month.",
      "falling": "Trend falling at the end of the month.",
      "steady": "Steady trend at the end of the month."
    }
  },
  "es": {
    "title": "Visitas · últimos 30 días",
    "cta": "Ver visitas",
    "loading": "Cargando visitas",
    "summary": "Visitas, últimos 30 días: {visits} ({visitsChange}); visitantes {visitors} ({visitorsChange}). {trend} Dispositivos: {devices}. Datos de ejemplo.",
    "trend": {
      "rising": "Tendencia al alza a final de mes.",
      "falling": "Tendencia a la baja a final de mes.",
      "steady": "Tendencia estable a final de mes."
    }
  }
}
</i18n>
