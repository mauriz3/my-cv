<script setup lang="ts">
const DEGREE_ID = 'ull-degree'

const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.education'))

const path = ref<HTMLElement | null>(null)
const { state: revealState } = useRevealOnce(path, 0.2)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.education')" :subtitle="t('education.subtitle')" />

    <div class="grid items-start gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(14rem,18rem)] md:gap-8">
    <section aria-labelledby="education-studies" class="space-y-3">
      <h2 id="education-studies" class="text-lg font-semibold text-highlighted">{{ t('education.studies') }}</h2>
      <ol
        ref="path"
        class="education-path relative space-y-1"
        data-testid="education-list"
        :data-reveal="revealState"
      >
        <span class="education-signal" aria-hidden="true" />
        <li
          v-for="(study, index) in cv.education"
          :key="study.id"
          class="grid grid-cols-[5.75rem_1rem_minmax(0,1fr)] gap-x-3"
        >
          <PeriodTime :period="study.period" class="pt-0.5" />
          <span class="flex justify-center pt-1.5" aria-hidden="true">
            <span
              class="rounded-full"
              :class="study.id === DEGREE_ID ? 'mt-1 size-3.5 bg-(--accent)' : 'size-2 bg-primary'"
            />
          </span>
          <article :aria-labelledby="`study-${study.id}`" :class="index < cv.education.length - 1 ? 'pb-6' : undefined">
            <h3
              :id="`study-${study.id}`"
              class="font-semibold text-highlighted"
              :class="study.id === DEGREE_ID ? 'font-display text-2xl' : 'text-base'"
            >
              {{ study.title }}
            </h3>
            <p class="text-sm">
              <ExternalLink :href="study.institutionUrl">{{ study.institution }}</ExternalLink>
            </p>
            <p v-if="study.description" class="mt-2 text-sm text-muted">{{ study.description }}</p>
          </article>
        </li>
      </ol>
    </section>

    <aside class="flex flex-col items-center justify-center gap-4 md:sticky md:top-8 md:min-h-80">
      <figure class="education-orbit" aria-hidden="true">
        <svg class="education-orbit__svg" viewBox="0 0 200 200">
          <circle class="education-orbit__track" cx="100" cy="100" r="78" pathLength="100" />
          <circle class="education-orbit__head" cx="100" cy="100" r="78" pathLength="100" />
        </svg>
      </figure>
      <p class="max-w-[16rem] text-center text-sm text-muted">{{ t('education.continues') }}</p>
    </aside>
    </div>

    <section v-if="cv.certifications.length" aria-labelledby="education-certifications" class="space-y-3">
      <h2 id="education-certifications" class="text-lg font-semibold text-highlighted">
        {{ t('education.certifications') }}
      </h2>
      <ul data-testid="certification-list">
        <li v-for="certification in cv.certifications" :key="certification.id">
          <p class="flex items-center gap-2 rounded-xl border border-default bg-elevated px-4 py-4 font-semibold text-highlighted">
            <UIcon name="i-lucide-award" class="size-5 text-(--accent)" aria-hidden="true" />
            {{ certification.name }}
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style>
.education-path::before {
  content: '';
  position: absolute;
  top: 0.6rem;
  bottom: 0.6rem;
  left: calc(5.75rem + 0.75rem + 0.5rem - 1px);
  width: 2px;
  background: color-mix(in srgb, var(--ui-primary) 35%, transparent);
}

.education-signal {
  position: absolute;
  top: 0.35rem;
  left: calc(5.75rem + 0.75rem + 0.5rem - 4px);
  z-index: 1;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ui-primary);
  opacity: 0;
}

:root[data-motion='full'] .education-signal {
  opacity: 1;
}

:root[data-motion='full'] .education-path[data-reveal='hidden'] .education-signal {
  top: calc(100% - 0.8rem);
}

:root[data-motion='full'] .education-path[data-reveal='revealed'] .education-signal {
  animation: education-rise 800ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes education-rise {
  from {
    top: calc(100% - 0.8rem);
  }

  to {
    top: 0.35rem;
  }
}

.education-orbit {
  width: min(100%, 18rem);
  aspect-ratio: 1;
}

.education-orbit__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.education-orbit__track,
.education-orbit__head {
  fill: none;
  stroke-linecap: round;
}

.education-orbit__track {
  stroke: color-mix(in srgb, var(--ui-primary) 45%, transparent);
  stroke-width: 1.5;
  stroke-dasharray: 2.2 3.4;
}

.education-orbit__head {
  stroke: var(--accent);
  stroke-width: 3;
  stroke-dasharray: 8 92;
}

:root[data-motion='full'] .education-orbit__head {
  animation: education-continue 16s linear infinite;
}

@keyframes education-continue {
  to {
    stroke-dashoffset: -100;
  }
}
</style>
