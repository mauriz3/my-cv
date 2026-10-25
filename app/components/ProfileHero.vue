<script lang="ts">
/** Tarjeta de datos del hero (Now, Path, Stack…). El contenido vive en `data/` y lo pasa la página. */
export interface HeroCard {
  id: string
  label: string
  text: string
}
</script>

<script setup lang="ts">
import type { Period } from '~~/lib/period'
import { toMonthIndex } from '~~/lib/years'
import { isMotionReduced } from './ReduceMotionToggle.vue'

/**
 * Hero del Perfil: nombre (h1 real, LCP sin animar), tagline, cifras clave calculadas desde los datos,
 * CTA + redes, holograma y tarjetas. Al entrar en pantalla, tagline, cifras, CTA y tarjetas suben
 * escalonadas; sin JS o con menos movimiento se ve todo en su estado final.
 */
const props = defineProps<{ eyebrow: string; tagline: string; cards: HeroCard[] }>()

const { t, locale } = useI18n({ useScope: 'local' })
const { t: tGlobal } = useI18n()
const cv = useCv()

/** Desde que hace Back End (Octane11) su perfil es full stack: ese área marca los años «full stack». */
const FULL_STACK_AREA_ID = 'backend'
const MONTHS_PER_YEAR = 12
const REVEAL_THRESHOLD = 0.2
const REVEAL_SELECTOR = '.profile-hero__reveal'
const REVEALED_CLASS = 'is-revealed'

const CARD_ICONS: Record<string, string> = {
  now: 'i-lucide-briefcase',
  path: 'i-lucide-git-branch',
  stack: 'i-lucide-layers',
  education: 'i-lucide-graduation-cap',
  languages: 'i-lucide-globe',
  'end-to-end': 'i-lucide-user',
  'designer-eye': 'i-lucide-sparkles',
  motivation: 'i-lucide-info',
}
const DEFAULT_CARD_ICON = 'i-lucide-circle'

const monthYear = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }))

function formatPartialDate(partialDate: string): string {
  const monthIndex = toMonthIndex(partialDate)
  return monthYear.value.format(new Date(Math.floor(monthIndex / MONTHS_PER_YEAR), monthIndex % MONTHS_PER_YEAR))
}

/** Inicio más antiguo de una lista de periodos (los datos garantizan al menos uno). */
function earliestStart(periods: Period[]): string {
  return periods
    .map((period) => period.start)
    .reduce((earliest, start) => (toMonthIndex(start) < toMonthIndex(earliest) ? start : earliest))
}

/** Del primer mes con experiencia en cualquier área hasta hoy: los «años en tech». */
const techPeriods = computed<Period[]>(() => [
  { start: earliestStart(cv.value.skillAreas.flatMap((area) => area.periods)), end: null },
])

const fullStackPeriods = computed(() => {
  const area = cv.value.skillAreas.find((skillArea) => skillArea.id === FULL_STACK_AREA_ID)
  if (!area) throw new Error(`Falta el área «${FULL_STACK_AREA_ID}» en los datos del CV`)
  return area.periods
})

const countersNote = computed(() =>
  t('countersNote', {
    today: monthYear.value.format(new Date()),
    techSince: formatPartialDate(earliestStart(techPeriods.value)),
    fullStackSince: formatPartialDate(earliestStart(fullStackPeriods.value)),
  }),
)

const root = useTemplateRef<HTMLElement>('root')
const isAnimated = ref(false)
let observer: IntersectionObserver | undefined

function reveal(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    entry.target.classList.add(REVEALED_CLASS)
    observer?.unobserve(entry.target)
  }
}

onMounted(() => {
  if (isMotionReduced() || !root.value) return
  isAnimated.value = true
  observer = new IntersectionObserver(reveal, { threshold: REVEAL_THRESHOLD })
  root.value.querySelectorAll(REVEAL_SELECTOR).forEach((element) => observer?.observe(element))
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section
    ref="root"
    aria-labelledby="hero-title"
    class="profile-hero rounded-xl border border-default bg-elevated p-4 md:p-8"
    :class="{ 'is-animated': isAnimated }"
  >
    <div class="grid items-center gap-8 xl:grid-cols-[1fr_minmax(280px,440px)]">
      <div>
        <p class="font-semibold text-primary">{{ props.eyebrow }}</p>
        <h1 id="hero-title" class="mt-1 mb-3 font-display text-4xl leading-tight font-bold text-highlighted md:text-6xl">
          {{ cv.fullName }}
        </h1>
        <p class="profile-hero__reveal mb-4 max-w-prose text-lg text-muted">{{ props.tagline }}</p>

        <div class="profile-hero__reveal" style="--reveal-index: 1">
          <ul class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <li>
              <MetricCard :label="t('yearsInTech')"><YearsFigure :periods="techPeriods" count-up /></MetricCard>
            </li>
            <li>
              <MetricCard :label="t('yearsFullStack')"><YearsFigure :periods="fullStackPeriods" count-up /></MetricCard>
            </li>
            <li>
              <MetricCard :label="t('projects')"><AnimatedNumber :value="cv.projects.length" animate /></MetricCard>
            </li>
            <li>
              <MetricCard :label="t('languages')"><AnimatedNumber :value="cv.languages.length" animate /></MetricCard>
            </li>
          </ul>
          <p class="mt-2 text-xs text-muted">{{ countersNote }}</p>
        </div>

        <div class="profile-hero__reveal mt-6 flex flex-col items-start gap-3" style="--reveal-index: 2">
          <UButton
            :to="cv.resumeUrl"
            :label="tGlobal('app.downloadPdf')"
            icon="i-lucide-download"
            download
            external
            size="lg"
            class="min-h-11"
          />
          <ContactLinks labels="always" />
        </div>
      </div>

      <HoloIllustration class="mx-auto max-w-sm xl:max-w-none" />
    </div>

    <ul class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <li
        v-for="(card, index) in props.cards"
        :key="card.id"
        class="profile-hero__reveal rounded-xl border border-default bg-default p-4"
        :style="{ '--reveal-index': index }"
      >
        <p class="flex items-center gap-2 text-xs font-semibold text-muted">
          <UIcon :name="CARD_ICONS[card.id] ?? DEFAULT_CARD_ICON" class="size-4" aria-hidden="true" />
          {{ card.label }}
        </p>
        <p class="mt-2 font-medium">{{ card.text }}</p>
      </li>
    </ul>
  </section>
</template>

<style>
/* Tiempos del handoff «Hero motion» (Figma): solo opacity y transform. */
.profile-hero {
  --reveal-duration: 700ms;
  --reveal-stagger: 100ms;
  --reveal-offset: 24px;
  --reveal-ease: cubic-bezier(0.22, 1, 0.36, 1);
}

/* El estado oculto solo existe cuando el JS ha decidido animar: sin JS se ve todo. */
.profile-hero.is-animated .profile-hero__reveal {
  opacity: 0;
  transform: translateY(var(--reveal-offset));
  transition:
    opacity var(--reveal-duration) var(--reveal-ease) calc(var(--reveal-index, 0) * var(--reveal-stagger)),
    transform var(--reveal-duration) var(--reveal-ease) calc(var(--reveal-index, 0) * var(--reveal-stagger));
}

.profile-hero.is-animated .profile-hero__reveal.is-revealed,
.reduce-motion .profile-hero.is-animated .profile-hero__reveal {
  opacity: 1;
  transform: none;
}

.reduce-motion .profile-hero .profile-hero__reveal {
  transition: none;
}
</style>

<i18n lang="json">
{
  "en": {
    "yearsInTech": "Years in tech",
    "yearsFullStack": "Years full stack",
    "projects": "Projects",
    "languages": "Languages",
    "countersNote": "Computed from dates ({today}): in tech since {techSince}, full stack since {fullStackSince}. Projects listed on this site."
  },
  "es": {
    "yearsInTech": "Años en tecnología",
    "yearsFullStack": "Años full stack",
    "projects": "Proyectos",
    "languages": "Idiomas",
    "countersNote": "Calculado desde las fechas ({today}): en tecnología desde {techSince}, full stack desde {fullStackSince}. Proyectos publicados en esta web."
  }
}
</i18n>
