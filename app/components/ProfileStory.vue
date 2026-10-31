<script setup lang="ts">
import type { HeroCard, HeroCardId } from '~~/data/hero'
import {
  GLITCH_STAGE_ID,
  STABLE_STAGE_ID,
  STORY_BACKGROUNDS,
  STORY_TIMING,
  isToneSwitch,
  storyTimingCssVars,
} from '~~/lib/story'

/**
 * Perfil como scroll storytelling (Tanda C): el holograma queda fijo (sticky) mientras pasan los tramos
 * Intro → Escala → Números → Stack → Trayectoria → CTA. Tramos, poses y tiempos: `lib/story.ts`.
 * Sin JS, en móvil o con menos movimiento: bloques normales, todo visible, en orden y sin animar.
 * El nombre es el h1 real y nunca se anima (LCP).
 */
const props = defineProps<{ eyebrow: string; tagline: string; cards: HeroCard[] }>()

const { t } = useI18n({ useScope: 'local' })
const { t: tGlobal } = useI18n()
const cv = useCv()

/** Qué tarjetas del hero van en cada tramo, en orden de lectura. */
const STACK_CARD_IDS: readonly HeroCardId[] = ['stack', 'end-to-end', 'designer-eye', 'motivation']
const PATH_CARD_IDS: readonly HeroCardId[] = ['now', 'path', 'education', 'languages']
const REVEAL_SELECTOR = '.story__reveal'
const TIMING_CSS_VARS = storyTimingCssVars()

function cardsFor(ids: readonly HeroCardId[]): HeroCard[] {
  return ids.flatMap((id) => props.cards.filter((card) => card.id === id))
}

const stackCards = computed(() => cardsFor(STACK_CARD_IDS))
const pathCards = computed(() => cardsFor(PATH_CARD_IDS))

const section = useTemplateRef<HTMLElement>('section')
const { stage, isOnScreen, isPageHidden } = useStoryScroll(section)
useReveal(section, REVEAL_SELECTOR)

/** El último cambio de tramo cambió de tono: el fondo cambia sin fundido, a la vez que el texto. */
const isToneSwitching = ref(false)
/** Pérdida de señal breve (400 ms) al entrar en el tramo del stack. */
const isGlitching = ref(false)
let glitchTimer: ReturnType<typeof setTimeout> | undefined

function startGlitch() {
  isGlitching.value = true
  clearTimeout(glitchTimer)
  glitchTimer = setTimeout(() => (isGlitching.value = false), STORY_TIMING.glitchMs)
}

watch(stage, (current, previous) => {
  isToneSwitching.value = isToneSwitch(previous, current)
  if (current.id === GLITCH_STAGE_ID) startGlitch()
})

onBeforeUnmount(() => clearTimeout(glitchTimer))
</script>

<template>
  <section
    ref="section"
    class="story"
    :class="{ 'is-on-screen': isOnScreen, 'story--tone-switch': isToneSwitching }"
    :data-tone="stage.tone"
    :style="TIMING_CSS_VARS"
    aria-labelledby="hero-title"
    data-testid="profile-story"
  >
    <div class="story__stage story-bg--dark">
      <div
        v-for="background in STORY_BACKGROUNDS"
        :key="background"
        class="story__bg-layer"
        :class="[`story-bg--${background}`, { 'is-active': background === stage.background }]"
      />
      <div class="story__holo-track">
        <HoloFigure
          class="story__holo"
          :flicker="stage.id !== STABLE_STAGE_ID"
          :glitch="isGlitching"
          :paused="!isOnScreen || isPageHidden"
        />
      </div>
    </div>

    <div class="story__steps">
      <StoryStep stage-id="intro">
        <p class="story__reveal font-semibold text-primary">{{ props.eyebrow }}</p>
        <h1 id="hero-title" class="mt-1 font-display text-4xl leading-tight font-bold text-highlighted md:text-6xl">
          {{ cv.fullName }}
        </h1>
      </StoryStep>

      <StoryStep stage-id="scale">
        <p class="story__reveal max-w-prose text-lg text-toned md:text-2xl">{{ props.tagline }}</p>
      </StoryStep>

      <StoryStep stage-id="numbers">
        <ProfileCounters class="story__reveal" />
      </StoryStep>

      <StoryStep stage-id="stack">
        <h2 class="story__reveal font-display text-2xl font-bold text-highlighted">{{ t('stackTitle') }}</h2>
        <ul class="mt-4 grid gap-3 xl:grid-cols-2">
          <li
            v-for="(card, index) in stackCards"
            :key="card.id"
            :data-testid="card.id"
            class="story__reveal rounded-xl border border-default bg-elevated p-4"
            :style="{ '--reveal-index': index }"
          >
            <HeroCardContent :card="card" />
          </li>
        </ul>
      </StoryStep>

      <StoryStep stage-id="path">
        <h2 class="story__reveal font-display text-2xl font-bold text-highlighted">{{ t('pathTitle') }}</h2>
        <ol class="mt-4 space-y-4 border-l-2 border-primary/40 pl-5">
          <li
            v-for="(card, index) in pathCards"
            :key="card.id"
            :data-testid="card.id"
            class="story__reveal story__milestone"
            :style="{ '--reveal-index': index }"
          >
            <HeroCardContent :card="card" />
          </li>
        </ol>
      </StoryStep>

      <StoryStep stage-id="cta">
        <div class="story__reveal flex flex-col items-start gap-3">
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
      </StoryStep>
    </div>
  </section>
</template>

<style>
/* Fondos de los tramos (handoff Tanda C). Son los mismos con la web en claro o en oscuro. */
.story {
  --story-bg-dark: #0d1117;
  --story-bg-deep: var(--color-brand-950);
  --story-bg-light: #f6f8fa;
  --story-bg-white: #ffffff;
  --story-halo: radial-gradient(circle at 70% 45%, color-mix(in srgb, var(--color-brand-500) 30%, transparent), transparent 60%);
  --story-radius: 0.75rem;
  --story-holo-anchor: 70%;
  --story-holo-floor: 8%;

  display: grid;
  gap: 1rem;
}

.story-bg--dark {
  background-color: var(--story-bg-dark);
}

.story-bg--halo {
  background: var(--story-halo), var(--story-bg-dark);
}

.story-bg--deep {
  background-color: var(--story-bg-deep);
}

.story-bg--light {
  background-color: var(--story-bg-light);
}

.story-bg--white {
  background-color: var(--story-bg-white);
}

/* Sin pin (sin JS, móvil o menos movimiento): bloques en orden, cada uno con su fondo. */
.story__stage {
  border-radius: var(--story-radius);
  padding: 1.5rem;
}

.story__bg-layer {
  display: none;
}

.story__holo {
  width: min(220px, 60%);
  margin-inline: auto;
}

.story__steps {
  display: contents;
}

.story__step {
  border-radius: var(--story-radius);
  padding: 1.5rem;
  color: var(--ui-text);
}

.story__milestone {
  position: relative;
}

/* Hito de la línea de tiempo: un punto sobre la línea. */
.story__milestone::before {
  content: '';
  position: absolute;
  top: 0.35rem;
  left: calc(-1.25rem - 7px);
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: var(--ui-primary);
}

@media (max-width: 767.98px) {
  .story__stage {
    grid-row: 2;
  }
}

@media (min-width: 768px) {
  .story {
    grid-template-columns: minmax(0, 1fr) minmax(200px, 300px);
  }

  .story__stage {
    grid-column: 2;
    grid-row: 1 / span 3;
    display: flex;
    align-items: center;
  }

  .story__step {
    grid-column: 1;
    padding: 2rem;
  }
}

/* Entradas de capas por tiempo (useReveal): el estado oculto solo existe con JS y con movimiento. */
@media (prefers-reduced-motion: no-preference) {
  :root.has-js:not(.reduce-motion) .story.reveal-enabled .story__reveal {
    transition:
      opacity var(--story-layer-duration) var(--story-layer-ease) calc(var(--reveal-index, 0) * var(--story-stagger)),
      transform var(--story-layer-duration) var(--story-layer-ease) calc(var(--reveal-index, 0) * var(--story-stagger));
  }

  :root.has-js:not(.reduce-motion) .story.reveal-enabled .story__reveal:not(.is-revealed) {
    opacity: 0;
    transform: translateY(var(--story-layer-offset));
  }
}

/* Con pin (tablet y escritorio, con movimiento): escenario sticky de una pantalla y el texto pasa por encima. */
@media (prefers-reduced-motion: no-preference) and (min-width: 768px) {
  :root.has-js:not(.reduce-motion) .story {
    display: block;
    border-radius: var(--story-radius);
    overflow: clip;
  }

  :root.has-js:not(.reduce-motion) .story__stage {
    position: sticky;
    top: 0;
    height: 100vh;
    padding: 0;
    border-radius: 0;
    container-type: size;
  }

  :root.has-js:not(.reduce-motion) .story__bg-layer {
    display: block;
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity var(--story-bg-duration) var(--story-bg-ease);
  }

  :root.has-js:not(.reduce-motion) .story__bg-layer.is-active {
    opacity: 1;
  }

  :root.has-js:not(.reduce-motion) .story__holo-track {
    position: absolute;
    inset: 0;
    transform: translateX(var(--holo-x, 0%));
  }

  :root.has-js:not(.reduce-motion) .story__holo {
    position: absolute;
    left: var(--story-holo-anchor);
    bottom: var(--story-holo-floor);
    width: min(30cqh, 28cqw);
    margin: 0;
    translate: -50% 0;
    transform: translateY(var(--holo-y, 0px)) scale(var(--holo-scale, 0.6));
    transform-origin: 50% 100%;
  }

  :root.has-js:not(.reduce-motion) .story.is-on-screen :is(.story__holo-track, .story__holo) {
    will-change: transform;
  }

  :root.has-js:not(.reduce-motion) .story__steps {
    display: block;
    position: relative;
    margin-top: -100vh;
  }

  :root.has-js:not(.reduce-motion) .story__step {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 50%;
    min-height: var(--step-height-tablet);
    border-radius: 0;
    background: none;
  }

  :root.has-js:not(.reduce-motion) .story__step--end {
    margin-left: 50%;
  }

  /*
   * Contraste en todo el scroll: el texto del tono contrario al fondo actual se oculta al instante
   * y reaparece (fundido de entrada) cuando su fondo ya está puesto. Al cambiar de tono, el fondo tampoco funde.
   */
  :root.has-js:not(.reduce-motion) .story__step {
    transition: opacity var(--story-layer-duration) var(--story-layer-ease);
  }

  :root.has-js:not(.reduce-motion) .story[data-tone='dark'] .story__step.tone-light:not(:focus-within),
  :root.has-js:not(.reduce-motion) .story[data-tone='light'] .story__step.tone-dark:not(:focus-within) {
    opacity: 0;
    transition: none;
  }

  :root.has-js:not(.reduce-motion) .story--tone-switch .story__bg-layer {
    transition: none;
  }
}

@media (prefers-reduced-motion: no-preference) and (min-width: 1280px) {
  :root.has-js:not(.reduce-motion) .story__step {
    min-height: var(--step-height-desktop);
  }
}
</style>

<i18n lang="json">
{
  "en": {
    "stackTitle": "Back End + Front End",
    "pathTitle": "Career path"
  },
  "es": {
    "stackTitle": "Back End + Front End",
    "pathTitle": "Trayectoria"
  }
}
</i18n>
