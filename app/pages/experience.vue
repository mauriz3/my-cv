<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.experience'))

const timeline = ref<HTMLElement | null>(null)
const { state: revealState } = useRevealOnce(timeline, 0.2)

function isCurrent(end: string | null): boolean {
  return end === null
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.experience')" :subtitle="t('experience.subtitle')" />

    <ol
      ref="timeline"
      class="experience-rail relative space-y-4"
      data-testid="experience-timeline"
      :data-reveal="revealState"
    >
      <span class="experience-signal" aria-hidden="true" />
      <li v-for="job in cv.experience" :key="job.id" class="relative pl-6">
        <span
          class="absolute top-6 -left-[5px] size-2.5 rounded-full"
          :class="isCurrent(job.period.end) ? 'bg-(--accent)' : 'bg-primary'"
          aria-hidden="true"
        />
        <article
          :aria-labelledby="`job-${job.id}`"
          class="rounded-xl border border-default bg-elevated p-4 md:p-6"
          :class="isCurrent(job.period.end) ? 'md:grid md:grid-cols-[11rem_1fr] md:gap-8' : undefined"
        >
          <PeriodTime
            :period="job.period"
            show-duration
            :class="isCurrent(job.period.end) ? 'font-semibold text-(--accent)' : undefined"
          />
          <div>
            <h2
              :id="`job-${job.id}`"
              class="font-display font-semibold text-highlighted"
              :class="isCurrent(job.period.end) ? 'text-2xl' : 'text-lg'"
            >
              {{ job.role }}
            </h2>
            <p class="text-sm">
              <ExternalLink :href="job.companyUrl">{{ job.company }}</ExternalLink>
              <span v-if="job.location" class="text-muted"> · {{ job.location }}</span>
            </p>
            <p class="mt-3 max-w-prose text-muted">{{ job.summary }}</p>
            <ul v-if="job.highlights.length" class="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li v-for="highlight in job.highlights" :key="highlight">{{ highlight }}</li>
            </ul>
            <TechnologyChips :groups="job.technologyGroups" class="mt-4" />
          </div>
        </article>
      </li>
    </ol>
  </div>
</template>

<style>
.experience-rail::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: var(--ui-border);
}

.experience-signal {
  position: absolute;
  top: 1.5rem;
  left: -5px;
  z-index: 1;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--accent);
  opacity: 0;
}

:root[data-motion='full'] .experience-signal {
  opacity: 1;
}

:root[data-motion='full'] .experience-rail[data-reveal='hidden'] .experience-signal {
  top: calc(100% - 10px);
}

:root[data-motion='full'] .experience-rail[data-reveal='revealed'] .experience-signal {
  animation: experience-arrive 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes experience-arrive {
  from {
    top: calc(100% - 10px);
  }

  to {
    top: 1.5rem;
  }
}
</style>
