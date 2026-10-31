<script setup lang="ts">
import { JOURNEY_POINTS, pointPosition, type CardState } from '~~/lib/journey'

/**
 * Tarjeta HTML de un punto del recorrido: «n · Sección», contenido (slot) y enlace a la sección
 * (salvo con `ownAction`: la tarjeta de Visitas lleva su propio botón en el contenido).
 * `state`: visible, ya leída o por llegar en el recorrido con pin (la versión estática lo ignora y las muestra todas).
 */
const props = defineProps<{ index: number; state: CardState; ownAction?: boolean }>()

const { t } = useI18n({ useScope: 'local' })
const { t: tGlobal } = useI18n()
const localePath = useLocalePath()

const point = JOURNEY_POINTS[props.index]!
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
      :aria-labelledby="`journey-${point.id}`"
    >
      <p :id="`journey-${point.id}`" class="text-xs font-semibold text-primary">{{ index + 1 }} · {{ label }}</p>
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

<i18n lang="json">
{
  "en": { "open": "Go to {section}" },
  "es": { "open": "Ir a {section}" }
}
</i18n>
