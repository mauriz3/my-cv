<script setup lang="ts">
import { JOURNEY_POINTS, pointPosition, type CardState } from '~~/lib/journey'
import { SCENE_KINDS, type SceneKind } from '~~/lib/journeyScene'

/**
 * Tarjeta HTML de un punto del recorrido: «n · Sección», contenido (slot) y enlace a la sección
 * (salvo con `ownAction`: la tarjeta de Visitas lleva su propio botón en el contenido).
 * `state`: visible, ya leída o por llegar en el recorrido con pin (la versión estática lo ignora y las muestra todas).
 * Con el slot `title`, la cabecera es «eyebrow + título». Skills, Experience, Education y Projects llevan debajo
 * una escena a ancho completo (Tanda G, `JourneyScene`) que no reduce el ancho del título ni tapa el cuerpo.
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
/** El primer punto es esta misma página: sin enlace. */
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
 * Contenido de Profile ligado al scroll (`--fx` 0 → 1): sube 8 px a su sitio; KPI: escala 0,96 → 1.
 * Sin opacidad: se lee desde la carga, también con p = 0 (decisión de Maurizio, sin hueco vacío).
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
