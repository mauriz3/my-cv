<script setup lang="ts">
import { PROJECT_CATEGORIES, type Cv } from '~~/data/schema'

type Project = Cv['projects'][number]

const FEATURED_ID = 'my-cv'

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

const featured = computed(() => visibleProjects.value.find((project) => project.id === FEATURED_ID) ?? null)
const rest = computed(() => visibleProjects.value.filter((project) => project.id !== featured.value?.id))

const stage = ref<HTMLElement | null>(null)
const { state: revealState } = useRevealOnce(stage, 0.2)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.projects')" :subtitle="t('projects.subtitle')" />

    <FilterChips v-model="selectedCategory" :options="filterOptions" :label="t('projects.filterLabel')" />

    <article
      v-if="featured"
      ref="stage"
      class="project-stage grid gap-4 md:grid-cols-2 md:items-center"
      :data-reveal="revealState"
      :aria-labelledby="`project-${featured.id}`"
    >
      <div class="relative overflow-hidden rounded-xl border border-default">
        <img
          :src="`/${featured.image}`"
          :alt="featured.imageAlt"
          width="640"
          height="360"
          loading="eager"
          fetchpriority="high"
          decoding="async"
          class="aspect-video w-full object-cover"
        >
        <span class="project-stage__scan" aria-hidden="true" />
      </div>
      <div class="space-y-2">
        <UBadge color="neutral" variant="subtle" :label="t(`projects.categories.${featured.category}`)" />
        <h2 :id="`project-${featured.id}`" class="font-display text-3xl font-semibold text-highlighted">
          <button
            type="button"
            aria-haspopup="dialog"
            :data-testid="`project-open-${featured.id}`"
            class="text-left focus-visible:outline-2 focus-visible:outline-primary"
            @click="openDetail(featured)"
          >
            {{ featured.title }}
          </button>
        </h2>
        <p class="text-muted">{{ featured.description }}</p>
      </div>
    </article>

    <ul
      v-if="rest.length"
      class="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-live="polite"
      data-testid="project-grid"
    >
      <li v-for="(project, index) in rest" :key="project.id" class="h-full">
        <UCard
          as="article"
          :aria-labelledby="`project-${project.id}`"
          class="relative flex h-full flex-col focus-within:ring-2 focus-within:ring-primary"
          :ui="{ root: 'flex h-full flex-col', body: 'flex flex-1 flex-col p-0 sm:p-0' }"
        >
          <img
            :src="`/${project.image}`"
            :alt="project.imageAlt"
            width="640"
            height="360"
            :loading="featured || index > 0 ? 'lazy' : 'eager'"
            :fetchpriority="featured || index > 0 ? 'auto' : 'high'"
            decoding="async"
            class="aspect-video w-full rounded-t-[inherit] object-cover"
          >
          <div class="flex flex-1 flex-col gap-2 p-4">
            <h2 :id="`project-${project.id}`" class="font-semibold text-highlighted">
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
            <UBadge
              color="neutral"
              variant="subtle"
              class="mt-auto w-fit"
              :label="t(`projects.categories.${project.category}`)"
            />
          </div>
        </UCard>
      </li>
    </ul>

    <ProjectDetail v-if="selectedProject" v-model:open="isDetailOpen" :project="selectedProject" />
  </div>
</template>

<style>
.project-stage__scan {
  position: absolute;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--brand-vivid);
  opacity: 0;
  pointer-events: none;
}

:root[data-motion='full'] .project-stage[data-reveal='revealed'] .project-stage__scan {
  opacity: 1;
  animation: project-scan 2.4s linear infinite;
}

@keyframes project-scan {
  from {
    top: 0;
  }

  to {
    top: 100%;
  }
}
</style>
