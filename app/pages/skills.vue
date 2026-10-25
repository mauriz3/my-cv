<script setup lang="ts">
import { yearsLabel } from '~~/lib/years'

const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.skills'))

/** Ejes del radar (Figma). Solo nombres: el radar es un perfil relativo, sin cifras. */
const RADAR_AXES = ['frontend', 'backend', 'apisData', 'cicd', 'testing', 'uxUi'] as const

const selectedArea = ref<string>(ALL_FILTER_ID)
const today = new Date()

const filterOptions = computed(() => [
  { id: ALL_FILTER_ID, label: t('skills.all') },
  ...cv.value.skillAreas.map((area) => ({ id: area.id, label: area.name })),
])

const visibleSkills = computed(() => {
  const areas =
    selectedArea.value === ALL_FILTER_ID
      ? cv.value.skillAreas
      : cv.value.skillAreas.filter((area) => area.id === selectedArea.value)
  return [...new Set(areas.flatMap((area) => area.skills))]
})

const yearsPerArea = computed(() =>
  cv.value.skillAreas.map((area) => ({ id: area.id, name: area.name, label: yearsLabel(area.periods, today) })),
)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.skills')" :subtitle="t('skills.subtitle')" />

    <FilterChips v-model="selectedArea" :options="filterOptions" :label="t('skills.filterLabel')" />

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard as="section" aria-labelledby="skills-radar" data-testid="skill-radar">
        <div class="flex items-baseline justify-between gap-2">
          <h2 id="skills-radar" class="font-semibold text-highlighted">{{ t('skills.radarTitle') }}</h2>
          <p class="text-xs text-muted">{{ t('skills.radarNote') }}</p>
        </div>
        <!-- SkillChart (radar sin números): lo hace Programador2. Esta lista de ejes queda como texto alternativo. -->
        <ul class="mt-3 flex flex-wrap gap-2 text-sm text-muted">
          <li v-for="axis in RADAR_AXES" :key="axis">{{ t(`skills.radarAxes.${axis}`) }}</li>
        </ul>
      </UCard>

      <UCard as="section" aria-labelledby="skills-years" data-testid="years-per-area">
        <h2 id="skills-years" class="font-semibold text-highlighted">{{ t('skills.yearsTitle') }}</h2>
        <!-- Barras por área: las puede sustituir el componente de Programador2. -->
        <dl class="mt-3 space-y-2">
          <div v-for="area in yearsPerArea" :key="area.id" class="flex justify-between gap-4 text-sm">
            <dt>{{ area.name }}</dt>
            <dd class="font-medium tabular-nums">{{ t('skills.yearsValue', { years: area.label }) }}</dd>
          </div>
        </dl>
        <p class="mt-3 text-xs text-muted">{{ t('skills.yearsNote') }}</p>
      </UCard>
    </div>

    <UCard as="section" aria-labelledby="skills-tools">
      <h2 id="skills-tools" class="font-semibold text-highlighted">{{ t('skills.toolsTitle') }}</h2>
      <ul class="mt-3 flex flex-wrap gap-2" aria-live="polite" data-testid="skill-list">
        <li v-for="skill in visibleSkills" :key="skill">
          <UBadge color="neutral" variant="subtle" :label="skill" />
        </li>
      </ul>
    </UCard>
  </div>
</template>
