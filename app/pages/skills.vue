<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.skills'))

const selectedArea = ref<string>(ALL_FILTER_ID)

const visibleSkills = computed(() => {
  const areas =
    selectedArea.value === ALL_FILTER_ID
      ? cv.value.skillAreas
      : cv.value.skillAreas.filter((area) => area.id === selectedArea.value)
  return [...new Set(areas.flatMap((area) => area.skills))]
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.skills')" :subtitle="t('skills.subtitle')" />

    <SkillAreaFilter v-model="selectedArea" />

    <div class="grid gap-4 lg:grid-cols-2">
      <SkillChart :axes="cv.skillProfile" data-testid="skill-radar" />
      <YearsPerArea data-testid="years-per-area" />
    </div>

    <Panel :title="t('skills.toolsTitle')">
      <ul class="flex flex-wrap gap-2" aria-live="polite" data-testid="skill-list">
        <li v-for="skill in visibleSkills" :key="skill">
          <UBadge color="neutral" variant="subtle" :label="skill" />
        </li>
      </ul>
    </Panel>
  </div>
</template>
