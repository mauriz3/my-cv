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

    <div class="grid items-stretch gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(14rem,18rem)] md:gap-8">
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

    <aside class="flex items-center justify-center">
      <div class="education-orbit">
        <figure class="education-orbit__figure" aria-hidden="true">
          <svg class="education-orbit__svg" viewBox="0 0 320 320">
            <rect class="education-orbit__anchor" width="320" height="320" />
            <path class="education-orbit__bezel" d="M 201.9 13.89 A 152 152 0 1 1 118.1 13.89" pathLength="100" />
            <g class="education-orbit__slow">
              <rect class="education-orbit__anchor" width="320" height="320" />
              <path class="education-orbit__outer" d="M 220.09 46.98 A 128 128 0 1 1 64.88 74.35" />
              <path class="education-orbit__lip" d="M 67.92 71.08 A 128 128 0 0 1 133.39 34.8" />
              <circle class="education-orbit__glow education-orbit__glow--amber" cx="124.72" cy="283.04" r="14" />
              <circle class="education-orbit__body education-orbit__body--amber" cx="124.72" cy="283.04" r="5.5" />
              <circle class="education-orbit__comet" cx="41.32" cy="112.05" r="1.6" opacity="0.25" />
              <circle class="education-orbit__comet" cx="59.13" cy="81.2" r="2.1" opacity="0.4" />
              <circle class="education-orbit__comet" cx="81.2" cy="59.13" r="2.8" opacity="0.6" />
              <circle class="education-orbit__comet" cx="103.89" cy="44.95" r="3.4" opacity="0.82" />
              <circle class="education-orbit__comet" cx="124.72" cy="36.96" r="4.6" />
            </g>
            <g class="education-orbit__mid">
              <rect class="education-orbit__anchor" width="320" height="320" />
              <path class="education-orbit__middle" d="M 146.36 257.05 A 98 98 0 1 1 237.23 220.33" />
              <path class="education-orbit__middle-soft" d="M 228.08 230.5 A 98 98 0 0 1 166.84 257.76" />
              <circle class="education-orbit__glow education-orbit__glow--brand" cx="232.83" cy="94.43" r="11" />
              <circle class="education-orbit__body education-orbit__body--brand" cx="232.83" cy="94.43" r="4" />
            </g>
            <g class="education-orbit__fast">
              <rect class="education-orbit__anchor" width="320" height="320" />
              <path class="education-orbit__inner" d="M 103.63 198.03 A 68 68 0 1 1 174.14 226.51" />
              <circle class="education-orbit__body education-orbit__body--teal" cx="107.91" cy="116.29" r="3.2" />
            </g>
          </svg>
        </figure>
        <p class="education-orbit__copy">{{ t('education.continues') }}</p>
      </div>
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
  position: relative;
  width: min(100%, 18rem);
  aspect-ratio: 1;
}

.education-orbit__figure,
.education-orbit__svg {
  display: block;
  width: 100%;
  height: auto;
}

.education-orbit__svg {
  overflow: visible;
}

.education-orbit__anchor {
  fill: none;
}

.education-orbit__bezel,
.education-orbit__outer,
.education-orbit__lip,
.education-orbit__middle,
.education-orbit__middle-soft,
.education-orbit__inner {
  fill: none;
  stroke-linecap: round;
}

.education-orbit__bezel {
  stroke: color-mix(in srgb, var(--ui-text-muted) 50%, transparent);
  stroke-width: 1.25;
  stroke-dasharray: 0.7 1.55;
}

.education-orbit__outer {
  stroke: color-mix(in srgb, var(--ui-text-muted) 75%, transparent);
  stroke-width: 1.35;
  stroke-dasharray: 1.2 6.5;
}

.education-orbit__lip {
  stroke: var(--accent);
  stroke-width: 4;
}

.education-orbit__middle {
  stroke: var(--chart-1);
  stroke-width: 1.75;
}

.education-orbit__middle-soft {
  stroke: var(--chart-1);
  stroke-opacity: 0.35;
  stroke-width: 1;
  stroke-dasharray: 1.5 5;
}

.education-orbit__inner {
  stroke: var(--chart-3);
  stroke-width: 1.4;
  stroke-dasharray: 2 6;
}

.education-orbit__body--amber { fill: var(--accent); }
.education-orbit__body--brand { fill: var(--chart-1); }
.education-orbit__body--teal { fill: var(--chart-3); }
.education-orbit__comet { fill: var(--chart-1); }

.education-orbit__glow--amber {
  fill: var(--accent);
  opacity: 0.16;
}

.education-orbit__glow--brand {
  fill: var(--chart-1);
  opacity: 0.16;
}

.education-orbit__slow,
.education-orbit__mid,
.education-orbit__fast {
  transform-box: view-box;
  transform-origin: center;
}

:root[data-motion='full'] .education-orbit__slow {
  animation: education-orbit-spin 28s linear infinite;
}

:root[data-motion='full'] .education-orbit__mid {
  animation: education-orbit-spin 14s linear infinite reverse;
}

:root[data-motion='full'] .education-orbit__fast {
  animation: education-orbit-spin 9.333s linear infinite;
}

@keyframes education-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

.education-orbit__copy {
  position: absolute;
  inset: 27%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--ui-text);
}
</style>
