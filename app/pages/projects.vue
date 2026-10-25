<script setup lang="ts">
import { PROJECT_CATEGORIES } from '~~/data/schema'

const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.projects'))

const selectedCategory = ref<string>(ALL_FILTER_ID)

const filterOptions = computed(() => [
  { id: ALL_FILTER_ID, label: t('projects.all') },
  ...PROJECT_CATEGORIES.map((category) => ({ id: category, label: t(`projects.categories.${category}`) })),
])

const visibleProjects = computed(() =>
  selectedCategory.value === ALL_FILTER_ID
    ? cv.value.projects
    : cv.value.projects.filter((project) => project.category === selectedCategory.value),
)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.projects')" :subtitle="t('projects.subtitle')" />

    <FilterChips v-model="selectedCategory" :options="filterOptions" :label="t('projects.filterLabel')" />

    <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite" data-testid="project-grid">
      <li v-for="project in visibleProjects" :key="project.id">
        <UCard as="article" :aria-labelledby="`project-${project.id}`" class="h-full" :ui="{ body: 'p-0 sm:p-0' }">
          <img
            :src="`/${project.image}`"
            :alt="project.imageAlt"
            width="640"
            height="360"
            loading="lazy"
            decoding="async"
            class="aspect-video w-full rounded-t-[inherit] object-cover"
          >
          <div class="space-y-2 p-4">
            <h2 :id="`project-${project.id}`" class="font-semibold text-highlighted">{{ project.title }}</h2>
            <p class="text-sm text-muted">{{ project.description }}</p>
            <div class="flex items-center justify-between gap-2">
              <UBadge color="neutral" variant="subtle" :label="t(`projects.categories.${project.category}`)" />
              <ExternalLink :href="project.url" class="inline-flex items-center gap-1 text-sm">
                <UIcon name="i-lucide-external-link" class="size-4" aria-hidden="true" />
                {{ t('projects.open', { title: project.title }) }}
              </ExternalLink>
            </div>
          </div>
        </UCard>
      </li>
    </ul>
  </div>
</template>
