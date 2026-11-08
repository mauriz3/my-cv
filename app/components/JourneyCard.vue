<script setup lang="ts">
import { JOURNEY_POINTS, pointPosition, type CardState } from '~~/lib/journey'
import { SCENE_KINDS, type SceneKind } from '~~/lib/journeyScene'

/**
 * HTML card of a point of the tour: "n · Section", content (slot) and link to the section
 * (except with `ownAction`: the Visitors card has its own button in the content).
 * `state`: visible, already read or to come on the tour with pin (the static version ignores it and shows them all).
 * With the `title` slot, the header is' eyebrow + title '. Skills, Experience, Education and Projects are underneath
 * a full-width scene (Tanda G, `JourneyScene`) that does not reduce the width of the title or cover the body.
 */
const props = defineProps<{ index: number; state: CardState; ownAction?: boolean }>()

const { t } = useI18n({ useScope: 'local' })
const { t: tGlobal } = useI18n()
const localePath = useLocalePath()

const point = JOURNEY_POINTS[props.index]!
const sceneKind = SCENE_KINDS.find((kind) => kind === point.id) as SceneKind | undefined
/** El eyebrow de Profile entra con su contenido (el h1 no se anima: LCP). */
const eyebrowStyle = props.index === 0 ? { '--fx': 'var(--fx-eyebrow, 1)' } : undefined
const label = computed(() => tGlobal(`nav.${point.id}`))
/** The first point is this same page: no link. */
const hasSectionLink = props.index > 0 && !props.ownAction
</script>

<template>
  <li
    class="journey__card"
    :data-state="state"
    :data-point-index="index"
    :data-card-side="point.cardSide"
    :style="{ '--point-position': pointPosition(index) }"
  >
    <article
      class="rounded-xl border border-default bg-elevated p-4 shadow-sm"
      :class="{ 'journey-card--profile': index === 0 }"
      :aria-labelledby="`journey-${point.id}`"
    >
      <template v-if="$slots.title">
        <div class="journey-card__header">
          <p
            :id="`journey-${point.id}`"
            class="text-xs font-semibold text-primary"
            :class="{ 'card-fx': eyebrowStyle }"
            :style="eyebrowStyle"
          >
            {{ index + 1 }} · {{ label }}
          </p>
          <slot name="title" />
        </div>
        <JourneyScene v-if="sceneKind" :kind="sceneKind" />
      </template>
      <p v-else :id="`journey-${point.id}`" class="text-xs font-semibold text-primary">{{ index + 1 }} · {{ label }}</p>
      <slot />
      <NuxtLink
        v-if="hasSectionLink"
        :to="localePath(point.path)"
        class="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
      >
        {{ t('open', { section: label }) }}
        <UIcon name="i-lucide-arrow-right" class="size-4" aria-hidden="true" />
      </NuxtLink>
    </article>
  </li>
</template>

<style>
.journey-card__header :is(h1, h2) {
  text-wrap: balance;
}

.journey-card--profile .journey-card__header + .journey-scene {
  margin-top: 0.25rem;
}

/*
 * Profile content tied to scroll (`--fx` 0 → 1): rises 8px into place; KPI scale 0.96 → 1.
 * No fade-out: readable from load even at p = 0 (Maurizio decision, no empty hole).
 */
:root[data-motion='full'] .journey__card:not(:focus-within) .card-fx {
  translate: 0 calc((1 - var(--fx)) * 8px);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .card-fx--scale {
  scale: calc(0.96 + 0.04 * var(--fx));
}
</style>

<i18n lang="json">
{
  "en": { "open": "Go to {section}" },
  "es": { "open": "Ir a {section}" }
}
</i18n>
