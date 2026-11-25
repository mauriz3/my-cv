<script setup lang="ts">
import { skillAreaColor } from '~/utils/skillAreaColor'

const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.skills'))

const selectedArea = ref<string>(ALL_FILTER_ID)

const visibleAreas = computed(() =>
  selectedArea.value === ALL_FILTER_ID
    ? cv.value.skillAreas
    : cv.value.skillAreas.filter((area) => area.id === selectedArea.value),
)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.skills')" :subtitle="t('skills.subtitle')" />

    <div class="grid items-stretch gap-4 md:grid-cols-2">
      <SkillChart :axes="cv.skillProfile" class="h-full" data-testid="skill-radar" />
      <YearsPerArea class="h-full" data-testid="years-per-area" />
    </div>

    <Panel :title="t('skills.toolsTitle')">
      <SkillAreaFilter v-model="selectedArea" />
      <div class="mt-5 space-y-5" aria-live="polite" data-testid="skill-list">
        <section
          v-for="(area, index) in visibleAreas"
          :key="area.id"
          class="space-y-3"
          :class="index > 0 ? 'border-t border-default pt-5' : undefined"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold" :style="{ color: skillAreaColor(area.id) }">
            <span class="size-2.5 rounded-full" :style="{ background: skillAreaColor(area.id) }" aria-hidden="true" />
            {{ area.name }}
          </h3>
          <ul class="flex flex-wrap gap-2">
            <li v-for="skill in area.skills" :key="skill">
              <UBadge color="neutral" variant="subtle" :label="skill" />
            </li>
          </ul>
        </section>
      </div>
    </Panel>
  </div>
</template>
