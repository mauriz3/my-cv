<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.experience'))
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.experience')" :subtitle="t('experience.subtitle')" />

    <ol class="relative space-y-4 border-l border-default pl-6" data-testid="experience-timeline">
      <li v-for="job in cv.experience" :key="job.id" class="relative">
        <span class="absolute top-6 -left-[calc(1.5rem+5px)] size-2.5 rounded-full bg-primary" aria-hidden="true" />
        <UCard as="article" :aria-labelledby="`job-${job.id}`">
          <PeriodTime :period="job.period" show-duration />
          <h2 :id="`job-${job.id}`" class="mt-1 text-lg font-semibold text-highlighted">{{ job.role }}</h2>
          <p class="text-sm">
            <ExternalLink :href="job.companyUrl">{{ job.company }}</ExternalLink>
            <span v-if="job.location" class="text-muted"> · {{ job.location }}</span>
          </p>
          <p class="mt-3 max-w-prose text-muted">{{ job.summary }}</p>
          <ul v-if="job.highlights.length" class="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li v-for="highlight in job.highlights" :key="highlight">{{ highlight }}</li>
          </ul>
          <TechnologyChips :groups="job.technologyGroups" class="mt-4" />
        </UCard>
      </li>
    </ol>
  </div>
</template>
