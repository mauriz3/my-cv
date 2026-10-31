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
 * Inicio como recorrido (Holograma C): el holograma camina por un timeline de 6 puntos (Profile, Skills,
 * Experience, Education, Projects, Visits) y en cada uno se para, señala y muestra su tarjeta. Lógica: `lib/journey.ts`.
 * Con pin: 720vh en escritorio (timeline horizontal) y 480vh en tablet (vertical). En móvil, 420svh con el
 * holograma arriba y una sola tarjeta debajo que cambia en el sitio, todo ligado al scroll (`lib/mobileJourney.ts`):
 * las 6 tarjetas siguen en el DOM (las ocultas, solo con opacidad: los lectores de pantalla las leen todas)
 * y la que recibe el foco del teclado se muestra en lugar de la actual.
 * La 6.ª (Visitas) es la única con acción: mini-gráficas, KPI que cuentan y botón «Ver visitas»; no sale.
 * Sin JS, con movimiento reducido o si fallan las guardas del móvil: holograma fijo y las 6 tarjetas visibles.
 * El nombre es el h1 real, en la tarjeta 1, visible desde la carga y sin animar (LCP).
 */
const { t } = useI18n({ useScope: 'local' })
const { t: tGlobal } = useI18n()
const cv = useCv()

/** Tecnologías que caben en la tarjeta de Skills (el resto está en su sección). */
const SKILL_CHIP_LIMIT = 9
/** Titulación que resume la formación. */
const DEGREE_ID = 'ull-degree'
const TIMING_CSS_VARS = journeyTimingCssVars()

const section = useTemplateRef<HTMLElement>('section')
const { isMobilePinned } = useMobilePin(section)
const { state, isStepping, isOnScreen, isPageHidden, visitsDraw, revealLastPoint } = useJourney(section, isMobilePinned)

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
          <h1 id="hero-title" class="mt-1 font-display text-3xl leading-tight font-bold text-highlighted">
            {{ cv.fullName }}
          </h1>
          <p class="mt-1 text-sm font-medium">{{ cv.headline }}</p>
          <p class="mt-2 text-sm text-muted">{{ cv.tagline }}</p>
          <ProfileCounters class="mt-3" />
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <UButton
              :to="cv.resumeUrl"
              :label="tGlobal('app.downloadPdf')"
              icon="i-lucide-download"
              download
              external
              class="min-h-11"
            />
            <ContactLinks labels="wide-only" />
          </div>
        </JourneyCard>

        <JourneyCard :index="1" :state="cardStates[1]!">
          <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
            {{ t('skillProfile') }}
          </h2>
          <p class="mt-1 text-sm text-muted">{{ t('relativeProfile') }}: {{ relativeProfile }}</p>
          <p class="mt-1 text-sm text-muted">
            {{ t('yearsPerArea') }}:
            <template v-for="(area, index) in areasByYears" :key="area.id">
              <span v-if="index > 0" aria-hidden="true"> · </span>
              <span class="whitespace-nowrap">{{ area.name }} <YearsFigure :periods="area.periods" /></span>
            </template>
          </p>
          <ul class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="skill in skillChips" :key="skill">
              <UBadge color="neutral" variant="subtle" :label="skill" />
            </li>
          </ul>
        </JourneyCard>

        <JourneyCard :index="2" :state="cardStates[2]!">
          <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
            {{ currentJob.company }} ·
            <PeriodTime :period="currentJob.period" class="text-xl! text-highlighted!" />
          </h2>
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
          <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
            {{ degree.title }}
          </h2>
          <p class="mt-1 text-sm">{{ degree.institution }} · <PeriodTime :period="degree.period" /></p>
          <p v-if="cv.certifications.length" class="mt-1 text-sm text-muted">
            {{ tGlobal('education.certifications') }}:
            {{ cv.certifications.map((item) => item.name).join(' · ') }}
          </p>
          <p v-if="courses.length" class="mt-1 text-sm text-muted">{{ t('courses') }}: {{ courses.join(' · ') }}</p>
        </JourneyCard>

        <JourneyCard :index="4" :state="cardStates[4]!">
          <h2 class="mt-1 font-display text-xl font-bold text-highlighted">
            {{ t('projectCount', { count: cv.projects.length }, cv.projects.length) }}
          </h2>
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
 * Geometría del recorrido. La mano del holograma (brazo a −100°) queda a `--hand-reach` × alto del centro
 * y a `--hand-rise` × alto del suelo: ahí nacen la línea de proyección y la tarjeta.
 */
.journey {
  /* El recorrido empieza y acaba a medio holograma (ancho = alto / 2) del borde: nunca se corta. */
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

/* Versión estática (móvil, sin JS o movimiento reducido): holograma fijo y las 6 tarjetas en orden. */
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
  border: 2px solid var(--ui-border-accented);
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
  border-color: var(--brand-vivid);
  background: var(--brand-vivid);
  box-shadow: 0 0 0 5px var(--brand-soft);
}

/* Con movimiento: timeline compacto de puntos también en móvil. */
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
 * Móvil con pin (spec «movil-scroll.md»): escenario sticky con el holograma arriba y UNA tarjeta debajo que cambia
 * en el sitio. Guardas: ancho de móvil, alto de ventana 520–950 px (mismos valores que MOBILE_PIN_QUERY),
 * movimiento activo y que las tarjetas quepan (`data-cards-fit`, lo pone useMobilePin).
 * El JS escribe las variables del fotograma (lib/mobileJourney.ts); sus valores por defecto son los de p = 0:
 * holograma por materializar y tarjeta 1 visible (lleva el h1). El escenario descuenta la barra de navegación inferior.
 */
@media (max-width: 767.98px) and (min-height: 520px) and (max-height: 950px) {
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) {
    --holo-height: 26cqh;
    /* Hueco para el zoom de 1,12 (crece hacia arriba desde los pies). */
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

  /* Línea de proyección: baja de la mano a la tarjeta. */
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
    /* Margen para que la etiqueta centrada del primer y del último punto no se corte. */
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
    inset: var(--cards-top) 0.5rem 0.75rem;
    display: block;
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

  /* Con el teclado: se ve la tarjeta que tiene el foco, en lugar de la actual. */
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

  /* Profile lleva más contenido: cifras en una fila para que quepa en la zona de la tarjeta. */
  :root[data-motion='full'] .journey:not([data-cards-fit='false']) .profile-counters__list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.375rem;
  }

  :root[data-motion='full']
    .journey.is-on-screen:not([data-cards-fit='false'])
    :is(.journey__holo, .journey__curtain, .journey__line, .journey__card[data-state='current'], .holo__arm) {
    will-change: transform, opacity;
  }
}

/* Con pin (tablet y escritorio, con movimiento): escenario sticky de una pantalla. */
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

  /* La tarjeta del punto actual, o cualquiera que reciba el foco del teclado. */
  :root[data-motion='full'] .journey__card:is([data-state='current'], :focus-within) {
    opacity: 1;
    transform: none;
    pointer-events: auto;
    transition:
      opacity var(--card-duration) var(--ease-out) var(--card-delay),
      transform var(--card-duration) var(--ease-out) var(--card-delay);
  }

  /* Tablet: timeline vertical a la izquierda; el holograma baja por él y la tarjeta sale a su derecha. */
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

/* Escritorio: timeline horizontal abajo; el holograma camina por él y la tarjeta sale al lado de la mano. */
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

  /* La tarjeta de Profile lleva más contenido y empieza junto al primer punto: más ancha. */
  :root[data-motion='full'] .journey__card[data-point-index='0'] {
    width: min(560px, 50cqw);
  }
}

/* ---------- Punto 6 «Visitas»: la única tarjeta con acción (borde brand-vivid) ---------- */
.journey__card[data-point-index='5'] > article {
  border-color: var(--brand-vivid);
}

/* Anillo del marcador 6: se expande una vez al pararse en él. */
.journey__marker:last-child .journey__dot {
  position: relative;
}

.journey__marker:last-child .journey__dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 2px solid var(--brand-vivid);
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
}

@media (min-width: 768px) {
  :root[data-motion='full'] .journey__marker:last-child[data-state='current'] .journey__dot::after {
    animation: journey-ring 500ms cubic-bezier(0.16, 1, 0.3, 1) 1;
  }

  /* La tarjeta entra con scale 0,96 (las demás, 0,98). */
  :root[data-motion='full'] .journey__card[data-point-index='5']:not([data-state='current'], :focus-within) {
    transform: translateY(16px) scale(0.96);
  }

  /* «Tap» del brazo al terminar de señalar: 100° → 92° → 100°. */
  :root[data-motion='full']
    .journey[data-point='visits']:is([data-phase='reveal'], [data-phase='read'])
    .holo__arm--right
    .holo__swing {
    animation: journey-tap 200ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--point-duration) 1;
  }
}

/* Móvil con pin: el anillo sigue al scroll (variables del fotograma). */
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
