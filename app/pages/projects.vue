<script setup lang="ts">
import { PROJECT_CATEGORIES, type Cv } from '~~/data/schema'

type Project = Cv['projects'][number]

const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.projects'))

const selectedCategory = ref<string>(ALL_FILTER_ID)

const filterOptions = computed(() => [
  { id: ALL_FILTER_ID, label: t('projects.all') },
  ...PROJECT_CATEGORIES.map((category) => ({ id: category, label: t(`projects.categories.${category}`) })),
])

const selectedProject = ref<Project | null>(null)
const isDetailOpen = ref(false)

function openDetail(project: Project) {
  selectedProject.value = project
  isDetailOpen.value = true
}

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
        <UCard
          as="article"
          :aria-labelledby="`project-${project.id}`"
          class="relative h-full transition-shadow focus-within:ring-2 focus-within:ring-primary hover:shadow-md"
          :ui="{ body: 'p-0 sm:p-0' }"
        >
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
            <h2 :id="`project-${project.id}`" class="font-semibold text-highlighted">
              <!-- El botón cubre toda la tarjeta (after:inset-0) para que se pueda pulsar en cualquier parte. -->
              <button
                type="button"
                aria-haspopup="dialog"
                :data-testid="`project-open-${project.id}`"
                class="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                @click="openDetail(project)"
              >
                {{ project.title }}
              </button>
            </h2>
            <p class="text-sm text-muted">{{ project.description }}</p>
            <UBadge color="neutral" variant="subtle" :label="t(`projects.categories.${project.category}`)" />
          </div>
        </UCard>
      </li>
    </ul>

    <ProjectDetail v-if="selectedProject" v-model:open="isDetailOpen" :project="selectedProject" />
  </div>
</template>
