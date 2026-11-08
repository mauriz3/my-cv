<script setup lang="ts">
import {
  JOURNEY_POINTS,
  LAST_POINT_INDEX,
  cardStateAt,
  isPointing,
  journeyTimingCssVars,
  markerStateAt,
} from '~~/lib/journey'
import { mobileCardStateAt, pointingArmOf } from '~~/lib/mobileJourney'
import { yearsInPeriods } from '~~/lib/years'

/**
 * Start as tour (Hologram C): the hologram walks along a 6-point timeline (Profile, Skills,
 * Experience, Education, Projects, Visits) and in each one stops, points and shows his card. Logic: `lib/journey.ts`.
 * With pin: 720vh on desktop (horizontal timeline) and 480vh on tablet (vertical). On mobile, 420svh with the
 * hologram above and a single card below that changes on the site, all linked to the scroll (`lib/mobileJourney.ts`):
 * las 6 tarjetas siguen en el DOM (las ocultas, solo con opacidad: los lectores de pantalla las leen todas)
 * y la que recibe el foco del teclado se muestra en lugar de la actual.
 * The 6th (Visits) is the only one with action: mini-graphics, KPIs that count and "View visits" button; it does not go out.
 * Without JS, with reduced movement or if the guards of the mobile fail: fixed hologram and the 6 visible cards.
 * The name is the real h1, on card 1, visible from the load and not animated (LCP).
 * Tanda F: las tarjetas 1–5 llevan microanimaciones ligadas al scroll (`useCardMotion`, `lib/cardMotion.ts`):
 * Profile anima su contenido (escalonado y KPI que cuentan) y Skills–Projects un icono en la esquina.
 */
const { t } = useI18n({ useScope: 'local' })
const { t: tGlobal } = useI18n()
const cv = useCv()

/** Technologies that fit on the Skills card (the rest is in your section). */
const SKILL_CHIP_LIMIT = 9
/** Degree that summarizes the training. */
const DEGREE_ID = 'ull-degree'
const TIMING_CSS_VARS = journeyTimingCssVars()

const section = useTemplateRef<HTMLElement>('section')
const { isMobilePinned } = useMobilePin(section)
const cardMotion = useCardMotion(isMobilePinned, section)
const { state, isStepping, isOnScreen, isPageHidden, visitsDraw, revealLastPoint } = useJourney(section, isMobilePinned, {
  onFrame: cardMotion.paint,
})
provide(PROFILE_COUNT_KEY, cardMotion.profileCount)
const { isReduced } = useMotion()
watch(isReduced, (reduced) => {
  if (reduced) cardMotion.reset(section.value)
})
/** Advance of the `name` element of a card (`useCardMotion` variables; without them, end state). */
const fx = (name: string) => ({ '--fx': `var(--fx-${name}, 1)` })

const currentPoint = computed(() => JOURNEY_POINTS[state.value.pointIndex]!)
const markerStates = computed(() => JOURNEY_POINTS.map((_, index) => markerStateAt(index, state.value)))
const cardStates = computed(() =>
  JOURNEY_POINTS.map((_, index) =>
    isMobilePinned.value ? mobileCardStateAt(index, state.value) : cardStateAt(index, state.value),
  ),
)
const visitsCard = useVisitsCardDraw({
  cardState: computed(() => cardStates.value[LAST_POINT_INDEX]!),
  isMobilePinned,
  mobileDraw: visitsDraw,
})
const sectionLabel = (index: number) => tGlobal(`nav.${JOURNEY_POINTS[index]!.id}`)
const status = computed(() => t('status', { point: state.value.pointIndex + 1, total: JOURNEY_POINTS.length }))
/** «Profile» parado en un punto; «Skills → Experience» mientras camina entre dos. */
const stageTitle = computed(() => {
  const { pointIndex, phase } = state.value
  const current = sectionLabel(pointIndex)
  return phase === 'walk' && pointIndex > 0 ? `${sectionLabel(pointIndex - 1)} → ${current}` : current
})

const relativeProfile = computed(() => cv.value.skillProfile.map((axis) => axis.label).join(' · '))
const skillChips = computed(() =>
  [...new Set(cv.value.skillAreas.flatMap((area) => area.skills))].slice(0, SKILL_CHIP_LIMIT),
)
const flashSkillSet = computed(
  () => new Set(cv.value.skillAreas.find((area) => area.id === 'frontend')?.skills ?? []),
)
const today = new Date()
const areasByYears = computed(() =>
  [...cv.value.skillAreas].sort((a, b) => yearsInPeriods(b.periods, today) - yearsInPeriods(a.periods, today)),
)

const currentJob = computed(() => cv.value.experience[0]!)
const previousJob = computed(() => cv.value.experience[1])
const earlierCompanies = computed(() => cv.value.experience.slice(2).map((job) => job.company))

const degree = computed(() => cv.value.education.find((study) => study.id === DEGREE_ID) ?? cv.value.education[0]!)
const courses = computed(() =>
  cv.value.education.filter((study) => study.id !== degree.value.id).map((study) => study.title),
)
</script>

<template>
  <section
    ref="section"
    class="journey"
    :class="{ 'is-on-screen': isOnScreen }"
    :style="TIMING_CSS_VARS"
    :data-phase="state.phase"
    :data-facing="currentPoint.cardSide"
    :data-point="currentPoint.id"
    :data-arm="pointingArmOf(state.pointIndex)"
    aria-labelledby="hero-title"
    data-testid="profile-journey"
  >
    <div class="journey__stage">
      <div class="journey__status" aria-hidden="true">
        <p class="text-xs font-medium text-primary">{{ status }}</p>
        <p class="font-display text-3xl font-bold text-highlighted">{{ stageTitle }}</p>
      </div>

      <JourneyTimeline :marker-states="markerStates" />

      <div class="journey__walker">
        <div class="journey__holo">
          <HoloFigure
            :walking="state.phase === 'walk'"
            :stepping="isStepping"
            :pointing="isPointing(state.phase) && !isMobilePinned"
            :breathing="state.phase === 'read'"
            :paused="!isOnScreen || isPageHidden"
          />
          <span class="journey__curtain" aria-hidden="true" />
          <span class="journey__ray" aria-hidden="true" />
        </div>
        <span class="journey__line" aria-hidden="true" />
      </div>

      <ol class="journey__cards">
        <JourneyCard :index="0" :state="cardStates[0]!">
          <template #title>
            <h1 id="hero-title" class="profile-card__name mt-1 font-display text-3xl leading-tight font-bold text-highlighted">
              {{ cv.fullName }}
            </h1>
            <p class="card-fx profile-card__headline" :style="fx('headline')">{{ cv.headline }}</p>
          </template>
          <p class="card-fx profile-card__pillars" :style="fx('tagline')">{{ t('profilePillars') }}</p>
          <p class="sr-only">{{ cv.tagline }}</p>
          <div class="profile-card__body">
            <ProfileCounters note-sr-only />
            <div class="profile-card__actions">
              <UButton
                :to="cv.resumeUrl"
                :label="tGlobal('app.downloadPdf')"
                icon="i-lucide-download"
                download
                external
                block
                class="profile-card__cta min-h-11"
              />
              <ContactLinks labels="always" :pick="['LinkedIn']" layout="block" class="profile-card__social" />
            </div>
          </div>
        </JourneyCard>

        <JourneyCard :index="1" :state="cardStates[1]!">
          <template #title>
            <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
              {{ t('skillProfile') }}
            </h2>
          </template>
          <p class="mt-1 text-sm text-muted">{{ t('relativeProfile') }}: {{ relativeProfile }}</p>
          <p class="mt-1 text-sm text-muted">
            {{ t('yearsPerArea') }}:
            <template v-for="(area, index) in areasByYears" :key="area.id">
              <span v-if="index > 0" aria-hidden="true"> · </span>
              <span class="whitespace-nowrap">{{ area.name }} <YearsFigure :periods="area.periods" /></span>
            </template>
          </p>
          <ul class="mt-2 flex flex-wrap gap-1.5">
            <li
              v-for="skill in skillChips"
              :key="skill"
              class="journey-skill-chip"
              :data-flash-area="flashSkillSet.has(skill) || undefined"
            >
              <UBadge color="neutral" variant="subtle" :label="skill" />
            </li>
          </ul>
        </JourneyCard>

        <JourneyCard :index="2" :state="cardStates[2]!">
          <template #title>
            <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
              {{ currentJob.company }} ·
              <PeriodTime :period="currentJob.period" class="text-xl! text-highlighted!" />
            </h2>
          </template>
          <p class="mt-1 text-sm">{{ currentJob.role }}</p>
          <p v-if="previousJob" class="mt-1 text-sm text-muted">
            {{ previousJob.company }} · {{ previousJob.role }} ·
            <PeriodTime :period="previousJob.period" />
          </p>
          <p v-if="earlierCompanies.length" class="mt-1 text-sm text-muted">
            {{
              t(
                'earlierRoles',
                {
                  count: earlierCompanies.length,
                  companies: earlierCompanies.join(', '),
                },
                earlierCompanies.length,
              )
            }}
          </p>
        </JourneyCard>

        <JourneyCard :index="3" :state="cardStates[3]!">
          <template #title>
            <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
              {{ degree.title }}
            </h2>
          </template>
          <p class="mt-1 text-sm">{{ degree.institution }} · <PeriodTime :period="degree.period" /></p>
          <div v-if="cv.certifications.length" class="card-fx mt-2" :style="fx('cert')">
            <p class="text-xs font-medium text-muted">{{ tGlobal('education.certifications') }}</p>
            <p class="mt-0.5 text-sm text-muted">
              {{ cv.certifications.map((item) => item.name).join(' · ') }}
            </p>
          </div>
          <div v-if="courses.length" class="card-fx mt-2" :style="fx('courses')">
            <p class="text-xs font-medium text-muted">{{ t('courses') }}</p>
            <p class="mt-0.5 text-sm text-muted">{{ courses.join(' · ') }}</p>
          </div>
        </JourneyCard>

        <JourneyCard :index="4" :state="cardStates[4]!">
          <template #title>
            <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
              {{ t('projectCount', { count: cv.projects.length }, cv.projects.length) }}
            </h2>
          </template>
          <p class="mt-1 text-sm text-muted">{{ t('projectsHint') }}</p>
          <ul class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="project in cv.projects" :key="project.id">
              <UBadge color="neutral" variant="subtle" :label="project.title" />
            </li>
          </ul>
        </JourneyCard>

        <JourneyCard :index="5" :state="cardStates[5]!" own-action @focusin="revealLastPoint">
          <JourneyVisits :draw="visitsCard.draw.value" :pulse="visitsCard.pulse.value" />
        </JourneyCard>
      </ol>
    </div>
  </section>
</template>

<style>
/*
 * Geometry of the path. The hand of the hologram (arm at −100°) is at `--hand-reach` × high from the center
 * and a `--hand-rise' × high off the ground: this is where the projection line and the card are born.
 */
.journey {
  /* The tour begins and ends half a hologram (width = height / 2) from the edge: it is never cut. */
  --journey-inset: calc(var(--holo-height) / 4 + 1rem);
  --journey-floor: 5.5rem;
  --holo-height: 42cqh;
  --hand-reach: 0.335;
  --hand-rise: 0.77;
  --line-length: 2rem;
  --facing: 1;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-leave: cubic-bezier(0.4, 0, 1, 1);
}

.journey[data-facing='start'] {
  --facing: -1;
}

/* Static version (mobile, no JS or reduced movement): fixed hologram and all 6 cards in order. */
.journey__stage {
  position: relative;
  display: grid;
  gap: 1rem;
  padding: 4rem 1rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg-elevated);
}

.journey__status,
.journey__line,
.journey__timeline,
.journey__curtain,
.journey__ray {
  display: none;
}

.journey__walker {
  justify-self: center;
  width: min(140px, 40vw);
}

.journey__cards {
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .journey__stage {
    grid-template-columns: minmax(140px, 24%) minmax(0, 1fr);
    align-items: start;
    padding: 4rem 1.5rem 1.5rem;
  }

  .journey__walker {
    position: sticky;
    top: 2rem;
    width: 100%;
  }
}

@media (min-width: 1280px) {
  .journey__stage {
    padding-top: 1.5rem;
  }

  .journey__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Timeline (marcadores hecho · actual · pendiente). */
.journey__rail {
  position: absolute;
  background: var(--ui-border);
}

.journey__progress {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--ui-primary);
}

.journey__marker {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
}

.journey__dot {
  width: 16px;
  height: 16px;
  flex: none;
  border: 2px solid var(--marker-pending);
  border-radius: 9999px;
  background: var(--ui-bg-elevated);
}

.journey__marker[data-state='done'] .journey__dot {
  border-color: var(--ui-primary);
  background: var(--ui-primary);
}

.journey__marker[data-state='current'] {
  color: var(--ui-text-highlighted);
  font-weight: 600;
}

.journey__marker[data-state='current'] .journey__dot {
  border-color: var(--marker-current);
  background: var(--marker-current);
  box-shadow: 0 0 0 5px var(--brand-soft);
}

/* With movement: compact dotted timeline also on mobile. */
@media (max-width: 767.98px) {
  :root[data-motion='full'] .journey__timeline {
    display: block;
    position: relative;
    height: 2.75rem;
    margin-inline: 1rem;
  }

  :root[data-motion='full'] .journey__rail {
    inset: 7px 0 auto;
    height: 2px;
  }

  :root[data-motion='full'] .journey__progress {
    transform-origin: left;
    transform: scaleX(var(--journey-position, 0));
  }

  :root[data-motion='full'] .journey__marker {
    left: calc(var(--point-position) * 100%);
    top: 0;
    flex-direction: column;
    translate: -50% 0;
  }

  :root[data-motion='full'] .journey__marker:not([data-state='current']) .journey__marker-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}

/*
 * Mobile with pin (spec "movil-scroll.md"): sticky scenario with the hologram above and A card below that changes
 * on site. Guards: mobile width, window height 520-950 px (same values as MOBILE_pin_QUERY),
 * movimiento activo y que las tarjetas quepan (`data-cards-fit`, lo pone useMobilePin).
 * El JS escribe las variables del fotograma (lib/mobileJourney.ts); sus valores por defecto son los de p = 0:
 * hologram to materialize and card 1 visible (carries the h1). The scenario discounts the bottom navigation bar.
 */
@media (max-width: 767.98px) and (min-height: 520px) and (max-height: 950px) {
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) {
    --holo-height: 26cqh;
    /* Room for 1.12 scale (grows upward from the feet). */
    --holo-top: 1.75rem;
    --timeline-top: calc(var(--holo-top) + var(--holo-height) + 0.5rem);
    --cards-top: calc(var(--timeline-top) + 3.25rem);
    /* Mano con el brazo a 55° y el zoom de 1,12, en fracciones del alto del holograma. */
    --mobile-hand-reach: 0.36;
    --mobile-hand-drop: 0.34;
    --arm-direction: 1;

    height: var(--journey-height-mobile);
  }

  :root[data-motion='full'] .journey[data-arm='left']:not([data-cards-fit='false']) {
    --arm-direction: -1;
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__stage {
    position: sticky;
    top: 0;
    display: block;
    height: calc(100svh - var(--size-bottom-bar));
    padding: 0;
    overflow: clip;
    contain: layout paint;
    container-type: size;
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__walker {
    position: absolute;
    top: var(--holo-top);
    left: 50%;
    justify-self: auto;
    width: 0;
    height: var(--holo-height);
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__holo {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    aspect-ratio: 1 / 2;
    translate: -50% var(--holo-shift, 0px);
    scale: var(--holo-scale, 1.2);
    transform-origin: 50% 100%;
    opacity: var(--holo-reveal, 0);
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__holo .holo {
    height: 100%;
  }

  /* Entrada «materializa»: la cortina (color del fondo) se retira de abajo arriba y el rayo sigue su borde. */
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__curtain {
    display: block;
    position: absolute;
    inset: 0;
    background: var(--ui-bg-elevated);
    transform-origin: top;
    transform: scaleY(var(--curtain, 1));
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__ray {
    display: block;
    position: absolute;
    inset: 0;
    border-top: 2px solid var(--color-brand-400);
    opacity: var(--ray-opacity, 1);
    transform: translateY(calc(var(--curtain, 1) * 100%));
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .holo__lines {
    opacity: var(--scanlines-opacity, 1);
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .holo__cone {
    opacity: var(--glow-opacity, 0);
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .holo__base {
    opacity: var(--glow-opacity, 0);
    scale: var(--glow-scale, 0.6);
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .holo__arm--right {
    rotate: var(--arm-right, 0deg);
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .holo__arm--left {
    rotate: var(--arm-left, 0deg);
  }

  /* Projection line: low from hand to card. */
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__line {
    display: block;
    position: absolute;
    top: calc(var(--holo-height) * var(--mobile-hand-drop));
    left: calc(var(--arm-direction) * var(--holo-height) * var(--mobile-hand-reach));
    height: calc(var(--cards-top) - var(--holo-top) - var(--holo-height) * var(--mobile-hand-drop));
    border-left: 2px dashed var(--brand-vivid);
    transform-origin: top;
    transform: scaleY(var(--line-scale, 0));
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__timeline {
    position: absolute;
    top: var(--timeline-top);
    /* Margin so that the centered label of the first and last point is not cut. */
    right: 3rem;
    left: 3rem;
    margin: 0;
    opacity: var(--timeline-opacity, 0);
  }

  :root[data-motion='full']
    .journey:not([data-cards-fit='false'])
    .journey__marker[data-state='current']
    .journey__dot {
    scale: 1.4;
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__dot {
    transition: scale var(--stop-duration) var(--ease-out);
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__cards {
    position: absolute;
    inset: var(--cards-top) 0.5rem max(1.25rem, env(safe-area-inset-bottom, 0px));
    display: block;
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__card[data-point-index='0'] > article {
    min-height: unset;
    max-height: min(58cqh, calc(100svh - var(--holo-height, 26cqh) - 5.5rem));
    padding-bottom: 0.5rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__card {
    position: absolute;
    inset: 0 0 auto;
    opacity: 0;
    pointer-events: none;
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__card > article {
    min-height: 36cqh;
  }

  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__card[data-state='current'] {
    opacity: var(--card-opacity, 1);
    translate: 0 var(--card-shift, 0px);
    scale: var(--card-scale, 1);
    pointer-events: auto;
  }

  /* With the keyboard: you can see the card that has the focus, instead of the current one. */
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__cards:focus-within .journey__card {
    opacity: 0;
    pointer-events: none;
  }

  :root[data-motion='full']
    .journey:not([data-cards-fit='false'])
    .journey__cards:focus-within
    .journey__card:focus-within {
    opacity: 1;
    translate: none;
    scale: none;
    pointer-events: auto;
  }

  :root[data-motion='full']
    .journey.is-on-screen:not([data-cards-fit='false'])
    :is(.journey__holo, .journey__curtain, .journey__line, .journey__card[data-state='current'], .holo__arm) {
    will-change: transform, opacity;
  }
}

/*
 * Tanda F: con pin, Profile carga en su estado inicial (p = 0), ya visible, y se asienta con el primer scroll.
 * It is fixed in the CSS so that it does not jump when hydrating; `useCardMotion` overwrites it online.
 */
@media (min-width: 768px) {
  :root[data-motion='full'] .journey__card[data-point-index='0'] {
    --fx-eyebrow: 1;
    --fx-headline: 1;
    --fx-tagline: 1;
    --fx-kpi-0: 0;
    --fx-kpi-1: 0;
    --fx-kpi-2: 0;
    --fx-actions: 0;
    --fx-note: 0;
    --fx-glow: 0;
  }
}

@media (max-width: 767.98px) and (min-height: 520px) and (max-height: 950px) {
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__card[data-point-index='0'] {
    --fx-eyebrow: 1;
    --fx-headline: 1;
    --fx-tagline: 1;
    --fx-kpi-0: 0;
    --fx-kpi-1: 0;
    --fx-kpi-2: 0;
    --fx-actions: 0;
    --fx-note: 0;
    --fx-glow: 0;
  }
}

/* With pin (tablet and desk, with movement): sticky scenario of a screen. */
@media (min-width: 768px) {
  :root[data-motion='full'] .journey {
    height: var(--journey-height-tablet);
  }

  :root[data-motion='full'] .journey__stage {
    position: sticky;
    top: 0;
    display: block;
    height: 100vh;
    padding: 0;
    overflow: clip;
    container-type: size;
  }

  :root[data-motion='full'] .journey__status {
    display: block;
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    right: 12rem;
  }

  :root[data-motion='full'] .journey__timeline {
    display: block;
    position: absolute;
  }

  :root[data-motion='full'] .journey__walker {
    position: absolute;
    justify-self: auto;
    width: auto;
  }

  :root[data-motion='full'] .journey.is-on-screen .journey__walker {
    will-change: transform;
  }

  :root[data-motion='full'] .journey__holo {
    position: absolute;
    height: var(--holo-height);
    aspect-ratio: 1 / 2;
  }

  :root[data-motion='full'] .journey__holo .holo {
    height: 100%;
  }

  :root[data-motion='full'] .journey__line {
    display: block;
    position: absolute;
    width: var(--line-length);
    border-top: 2px dashed var(--brand-vivid);
    opacity: 0;
    transform: scaleX(0);
    transition:
      transform var(--leave-duration) var(--ease-leave),
      opacity var(--leave-duration) var(--ease-leave);
  }

  :root[data-motion='full'] .journey:is([data-phase='reveal'], [data-phase='read']) .journey__line {
    opacity: 1;
    transform: none;
    transition:
      transform var(--line-duration) var(--ease-out) var(--line-delay),
      opacity var(--line-duration) var(--ease-out) var(--line-delay);
  }

  :root[data-motion='full'] .journey__cards {
    position: absolute;
    inset: 0;
    display: block;
    pointer-events: none;
  }

  :root[data-motion='full'] .journey__card {
    position: absolute;
    opacity: 0;
    transform: translateY(12px) scale(0.98);
    transition:
      opacity var(--leave-duration) var(--ease-leave),
      transform var(--leave-duration) var(--ease-leave);
  }

  :root[data-motion='full'] .journey__card[data-state='past'] {
    transform: translateY(-8px);
  }

  /* The current point card, or whichever receives the keyboard focus. */
  :root[data-motion='full'] .journey__card:is([data-state='current'], :focus-within) {
    opacity: 1;
    transform: none;
    pointer-events: auto;
    transition:
      opacity var(--card-duration) var(--ease-out) var(--card-delay),
      transform var(--card-duration) var(--ease-out) var(--card-delay);
  }

  /* Tablet: vertical timeline on the left; the hologram goes down it and the card comes out on the right. */
  :root[data-motion='full'] .journey {
    --track-top: 7rem;
    --track-bottom: 2.5rem;
    --walker-left: 11rem;
    --holo-height: 22cqh;
  }

  :root[data-motion='full'] .journey__timeline {
    top: var(--track-top);
    bottom: var(--track-bottom);
    left: 1.5rem;
    width: 9rem;
  }

  :root[data-motion='full'] .journey__rail {
    inset: 0 auto 0 7px;
    width: 2px;
  }

  :root[data-motion='full'] .journey__progress {
    transform-origin: top;
    transform: scaleY(var(--journey-position, 0));
  }

  :root[data-motion='full'] .journey__marker {
    top: calc(var(--point-position) * 100%);
    translate: 0 -50%;
  }

  :root[data-motion='full'] .journey__walker {
    top: var(--track-top);
    bottom: var(--track-bottom);
    left: var(--walker-left);
    transform: translateY(calc(var(--journey-position, 0) * 100%));
  }

  :root[data-motion='full'] .journey__holo {
    top: 0;
    left: 0;
    translate: 0 calc((var(--hand-rise) - 1) * 100%);
  }

  :root[data-motion='full'] .journey__line {
    top: 0;
    left: calc(var(--holo-height) * (0.25 + var(--hand-reach)));
    transform-origin: left;
  }

  :root[data-motion='full'] .journey__card {
    top: calc(var(--track-top) + var(--point-position) * (100% - var(--track-top) - var(--track-bottom)));
    left: calc(var(--walker-left) + var(--holo-height) * (0.25 + var(--hand-reach)) + var(--line-length));
    right: 1.5rem;
    translate: 0 calc(var(--point-position) * -100%);
  }
}

/* Desktop: Horizontal timeline down; the hologram walks down it and the card comes out next to your hand. */
@media (min-width: 1280px) {
  :root[data-motion='full'] .journey {
    height: var(--journey-height-desktop);
    --holo-height: 42cqh;
  }

  :root[data-motion='full'] .journey__timeline {
    inset: auto var(--journey-inset) 1.5rem;
    width: auto;
    height: 2.75rem;
  }

  :root[data-motion='full'] .journey__rail {
    inset: 7px 0 auto;
    width: auto;
    height: 2px;
  }

  :root[data-motion='full'] .journey__progress {
    transform-origin: left;
    transform: scaleX(var(--journey-position, 0));
  }

  :root[data-motion='full'] .journey__marker {
    top: 0;
    left: calc(var(--point-position) * 100%);
    flex-direction: column;
    translate: -50% 0;
  }

  :root[data-motion='full'] .journey__walker {
    inset: auto var(--journey-inset) var(--journey-floor);
    height: var(--holo-height);
    transform: translateX(calc(var(--journey-position, 0) * 100%));
  }

  :root[data-motion='full'] .journey__holo {
    top: auto;
    bottom: 0;
    left: 0;
    translate: -50% 0;
    transform: scaleX(var(--facing));
    transition: transform var(--stop-duration) var(--ease-out);
  }

  :root[data-motion='full'] .journey__line {
    top: auto;
    bottom: calc(var(--holo-height) * var(--hand-rise));
    left: calc(var(--holo-height) * var(--hand-reach) * var(--facing) + min(var(--facing), 0) * var(--line-length));
    transform-origin: calc(50% - var(--facing) * 50%) 0;
  }

  :root[data-motion='full'] .journey__card {
    top: calc(100% - var(--journey-floor) - var(--holo-height) * var(--hand-rise));
    right: auto;
    width: min(380px, 34cqw);
    --card-anchor: calc(
      var(--journey-inset) + var(--point-position) * (100% - 2 * var(--journey-inset)) + var(--holo-height) *
        var(--hand-reach) + var(--line-length)
    );
    left: var(--card-anchor);
    translate: 0 -50%;
  }

  :root[data-motion='full'] .journey__card[data-card-side='start'] {
    left: calc(var(--card-anchor) - 2 * (var(--holo-height) * var(--hand-reach) + var(--line-length)));
    translate: -100% -50%;
  }

  /* The Profile card has more content and starts next to the first point: wider. */
  :root[data-motion='full'] .journey__card[data-point-index='0'] {
    width: min(560px, 50cqw);
  }
}

/* ---------- Point 6 "Visits": the only card with action (brand-vivid edge) ---------- */
.journey__card[data-point-index='5'] > article {
  border-color: var(--brand-vivid);
}

/* Skills: emphasize technologies on the axis that matches the scene flash. */
:root[data-motion='full'] .journey__card[data-point-index='1']:not(:focus-within) .journey-skill-chip[data-flash-area] {
  --chip-emphasis: var(--fx-flash-opacity, 0);
}

.journey-skill-chip[data-flash-area] {
  border-radius: var(--ui-radius);
  box-shadow: 0 0 0 calc(var(--chip-emphasis, 0) * 2px)
    color-mix(in srgb, var(--brand-vivid) calc(var(--chip-emphasis, 0) * 40%), transparent);
}

/*
 * Profile: header fixed on load (--fx-* copy at 1); scroll drives KPIs, stats band, and CTA.
 * Counters readable from first paint (PROFILE_COUNT_KEY).
 */
:root[data-motion='full'] .journey__card[data-point-index='0']:not(:focus-within) .journey-card__header .card-fx,
:root[data-motion='full'] .journey__card[data-point-index='0']:not(:focus-within) .profile-card__headline,
:root[data-motion='full'] .journey__card[data-point-index='0']:not(:focus-within) .profile-card__pillars {
  translate: none;
  scale: none;
}

:root[data-motion='full'] .journey__card[data-point-index='0']:not(:focus-within) .profile-stats__fx {
  translate: none;
  scale: none;
}

.journey-card--profile {
  padding: 1.25rem 1.25rem 1.375rem;
  border-radius: 1rem;
}

.profile-card__name {
  text-wrap: balance;
}

.profile-card__headline {
  margin: 0.5rem 0 0;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
  text-wrap: balance;
}

.profile-card__pillars {
  margin: 0.75rem 0 0;
  text-align: center;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ui-text-muted) 92%, var(--brand-vivid));
}

.journey-card--profile .journey-scene[data-scene='profile'] {
  margin: 0.5rem auto 0;
  max-width: 17.5rem;
}

.profile-card__body {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
  width: 100%;
}

.profile-card__social {
  min-width: 0;
  margin: 0;
  padding: 0;
}

.profile-card__social :is(ul, li) {
  margin: 0;
  padding: 0;
  list-style: none;
}

.profile-card__social ul {
  display: block;
  width: 100%;
}

.journey__card[data-point-index='0'] > article {
  border-color: color-mix(in srgb, var(--ui-border) 88%, var(--brand-vivid));
}

:root[data-motion='full'] .journey__card[data-point-index='0'][data-state='current'] > article {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--brand-vivid) calc(var(--fx-glow, 0) * 22%), var(--ui-border)),
    0 1px 2px 0 rgb(0 0 0 / 0.05);
}

/* Experience: ring on the marker when standing at the point (such as Visits). */
.journey__marker[data-point-id='experience'] .journey__dot {
  position: relative;
}

.journey__marker[data-point-id='experience'] .journey__dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 2px solid var(--marker-current);
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
}

@media (min-width: 768px) {
  :root[data-motion='full']
    .journey[data-point='experience']:is([data-phase='point'], [data-phase='reveal'], [data-phase='read'])
    .journey__marker[data-point-id='experience'][data-state='current']
    .journey__dot::after {
    animation: journey-ring 500ms cubic-bezier(0.16, 1, 0.3, 1) 1;
  }
}

/* Marker ring on point 6: expands once when it becomes current. */
.journey__marker:last-child .journey__dot {
  position: relative;
}

.journey__marker:last-child .journey__dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 2px solid var(--marker-current);
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
}

@media (min-width: 768px) {
  :root[data-motion='full'] .journey__marker:last-child[data-state='current'] .journey__dot::after {
    animation: journey-ring 500ms cubic-bezier(0.16, 1, 0.3, 1) 1;
  }

  /* The card enters with a scale of 0.96 (the others, 0.98). */
  :root[data-motion='full'] .journey__card[data-point-index='5']:not([data-state='current'], :focus-within) {
    transform: translateY(16px) scale(0.96);
  }

  /* "Tap" of the arm when finished pointing: 100° → 92° → 100°. */
  :root[data-motion='full']
    .journey[data-point='visits']:is([data-phase='reveal'], [data-phase='read'])
    .holo__arm--right
    .holo__swing {
    animation: journey-tap 200ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--point-duration) 1;
  }
}

/* Mobile with pin: the ring follows the scroll (frame variables). */
@media (max-width: 767.98px) and (min-height: 520px) and (max-height: 950px) {
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .journey__marker:last-child .journey__dot::after {
    opacity: var(--ring-opacity, 0);
    scale: var(--ring-scale, 1);
  }
}

@keyframes journey-ring {
  from {
    opacity: 0.6;
    scale: 1;
  }

  to {
    opacity: 0;
    scale: 2;
  }
}

@keyframes journey-tap {
  50% {
    transform: rotate(8deg);
  }
}
</style>

<i18n lang="json">
{
  "en": {
    "profilePillars": "Experience · Learning · Results",
    "status": "Journey · point {point} of {total}",
    "skillProfile": "Skill profile",
    "relativeProfile": "Relative profile",
    "yearsPerArea": "Years per area",
    "earlierRoles": "+ {count} earlier role: {companies} | + {count} earlier roles: {companies}",
    "courses": "Courses",
    "projectCount": "{count} project | {count} projects",
    "projectsHint": "Open the Projects section and click a project to see its detail panel."
  },
  "es": {
    "profilePillars": "Experiencia · Aprendizaje · Resultados",
    "status": "Recorrido · punto {point} de {total}",
    "skillProfile": "Perfil de habilidades",
    "relativeProfile": "Perfil relativo",
    "yearsPerArea": "Años por área",
    "earlierRoles": "+ {count} puesto anterior: {companies} | + {count} puestos anteriores: {companies}",
    "courses": "Cursos",
    "projectCount": "{count} proyecto | {count} proyectos",
    "projectsHint": "Abre la sección Proyectos y pulsa uno para ver su panel de detalle."
  }
}
</i18n>
