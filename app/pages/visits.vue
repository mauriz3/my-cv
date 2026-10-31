<script setup lang="ts">
import {
  DEFAULT_VISITS_RANGE,
  VISITS_RANGES,
  formatDuration,
  formatKpiChange,
  isEmptyReport,
  kpiChange,
  kpiTrend,
  type KpiKey,
} from '~~/lib/visits'

/** Ancla del título: el botón «Ver visitas» del Inicio enlaza aquí y el foco llega al h1. */
const TITLE_ID = 'visits-title'
const KPI_KEYS: readonly KpiKey[] = ['visits', 'visitors', 'avgDurationSec', 'bounceRate']
const PERCENT = 100
/** Entrada escalonada de las tarjetas (4 KPI + 6 gráficas, `--stagger` 0–9). */
const CARD_ENTER_MS = 400
const CARD_STAGGER_MS = 60
const LAST_CARD_STAGGER = 9
const ENTRANCE_VARS = { '--enter-ms': `${CARD_ENTER_MS}ms`, '--stagger-ms': `${CARD_STAGGER_MS}ms` }

const { t } = useI18n()
const route = useRoute()
const { language, integer, percent } = useVisitsFormat()

usePageSeo(() => t('nav.visits'))

const range = ref(DEFAULT_VISITS_RANGE)
const { report, status, retry } = useVisits(range)
const tables = useVisitsTables(report)

const isLoading = computed(() => !report.value)
const { isEntering } = useEntranceOnce(CARD_ENTER_MS + LAST_CARD_STAGGER * CARD_STAGGER_MS)
const rangeOptions = computed(() => VISITS_RANGES.map((value) => ({ value, label: t(`visits.range.${value}`) })))

/** Valor de cada KPI como número entero para el contador (el rebote, en puntos: 0,41 → 41). */
const KPI_FORMATS: Record<KpiKey, { toCount: (value: number) => number; format: (count: number) => string }> = {
  visits: { toCount: (value) => value, format: (count) => integer(count) },
  visitors: { toCount: (value) => value, format: (count) => integer(count) },
  avgDurationSec: { toCount: (value) => value, format: formatDuration },
  bounceRate: { toCount: (value) => Math.round(value * PERCENT), format: (count) => percent(count) },
}

const kpis = computed(() =>
  KPI_KEYS.map((key) => {
    const change = report.value ? kpiChange(report.value.kpis, key) : 0
    return {
      key,
      label: t(`visits.kpi.${key}`),
      value: KPI_FORMATS[key].toCount(report.value?.kpis[key].value ?? 0),
      format: KPI_FORMATS[key].format,
      change,
      changeText: formatKpiChange(key, change, language.value),
      trend: kpiTrend(key, change),
    }
  }),
)

onMounted(() => {
  if (route.hash === `#${TITLE_ID}`) document.getElementById(TITLE_ID)?.focus()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.visits')" :subtitle="t('visits.subtitle')" :title-id="TITLE_ID" />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <p v-if="report?.sample !== false" class="flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-lucide-flask-conical" class="size-4 shrink-0" aria-hidden="true" />
        {{ t('visits.sampleNote') }}
      </p>
      <SegmentedControl
        v-model="range"
        :options="rangeOptions"
        :label="t('visits.rangeLabel')"
        class="w-full sm:w-auto sm:min-w-80"
        data-testid="visits-range"
      />
    </div>

    <div
      v-if="status === 'error'"
      role="alert"
      class="flex flex-col items-start gap-3 rounded-xl border border-default bg-elevated p-6"
      data-testid="visits-error"
    >
      <h2 class="text-base font-semibold text-highlighted">{{ t('visits.error.title') }}</h2>
      <p class="text-sm text-muted">{{ t('visits.error.description') }}</p>
      <UButton icon="i-lucide-rotate-cw" class="min-h-11" @click="retry">{{ t('visits.error.retry') }}</UButton>
    </div>

    <div
      v-else-if="report && isEmptyReport(report)"
      class="rounded-xl border border-default bg-elevated p-6 text-center"
      data-testid="visits-empty"
    >
      <h2 class="text-base font-semibold text-highlighted">{{ t('visits.empty.title') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ t('visits.empty.description') }}</p>
    </div>

    <div
      v-else
      class="space-y-4"
      :style="ENTRANCE_VARS"
      :data-entering="isEntering || undefined"
      :aria-busy="status === 'loading'"
      data-testid="visits-dashboard"
    >
      <p v-if="isLoading" class="sr-only" role="status">{{ t('visits.loading') }}</p>

      <ul class="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" :aria-label="t('visits.kpiLabel')">
        <li v-for="(kpi, index) in kpis" :key="kpi.key" :style="{ '--stagger': index }">
          <KpiCard
            :loading="isLoading"
            :label="kpi.label"
            :value="kpi.value"
            :format="kpi.format"
            :change="kpi.change"
            :change-text="kpi.changeText"
            :trend="kpi.trend"
            :comparison="t(`visits.comparison.${range}`)"
            class="h-full"
          />
        </li>
      </ul>

      <div class="grid gap-4 lg:grid-cols-6">
        <ChartCard
          :title="t('visits.timeline.title')"
          :description="t(`visits.timeline.description.${range}`)"
          :loading="isLoading"
          size="withLegend"
          class="lg:col-span-4"
          style="--stagger: 4"
          data-testid="chart-timeline"
        >
          <LazyVisitsTrendChart v-if="report" :timeseries="report.timeseries" :range="report.range" />
          <template v-if="tables" #table><DataTable v-bind="tables.timeline" /></template>
        </ChartCard>

        <ChartCard
          :title="t('visits.devices.title')"
          :description="t('visits.devices.description')"
          :loading="isLoading"
          size="withLegend"
          class="lg:col-span-2"
          style="--stagger: 5"
          data-testid="chart-devices"
        >
          <LazyVisitsDevicesChart v-if="report" :devices="report.devices" :total-visits="report.kpis.visits.value" />
          <template v-if="tables" #table><DataTable v-bind="tables.devices" /></template>
        </ChartCard>

        <ChartCard
          :title="t('visits.countries.title')"
          :description="t('visits.countries.description')"
          :loading="isLoading"
          size="withList"
          class="lg:col-span-4"
          style="--stagger: 6"
          data-testid="chart-countries"
        >
          <LazyVisitsCountriesChart v-if="report" :countries="report.countries" />
          <template v-if="tables" #table><DataTable v-bind="tables.countries" /></template>
        </ChartCard>

        <ChartCard
          :title="t('visits.sources.title')"
          :description="t('visits.sources.description')"
          :loading="isLoading"
          size="withLegend"
          class="lg:col-span-2"
          style="--stagger: 7"
          data-testid="chart-sources"
        >
          <LazyVisitsSourcesChart v-if="report" :sources="report.sources" />
          <template v-if="tables" #table><DataTable v-bind="tables.sources" /></template>
        </ChartCard>

        <ChartCard
          :title="t('visits.pages.title')"
          :description="t('visits.pages.description')"
          :loading="isLoading"
          class="lg:col-span-3"
          style="--stagger: 8"
          data-testid="chart-pages"
        >
          <LazyVisitsPagesChart v-if="report" :pages="report.pages" />
          <template v-if="tables" #table><DataTable v-bind="tables.pages" /></template>
        </ChartCard>

        <ChartCard
          :title="t('visits.hours.title')"
          :description="t('visits.hours.description')"
          :loading="isLoading"
          size="withLegend"
          class="lg:col-span-3"
          style="--stagger: 9"
          data-testid="chart-hours"
        >
          <LazyVisitsHoursChart v-if="report" :hours="report.hours" />
          <template v-if="tables" #table><DataTable v-bind="tables.hours" /></template>
        </ChartCard>
      </div>
    </div>
  </div>
</template>
