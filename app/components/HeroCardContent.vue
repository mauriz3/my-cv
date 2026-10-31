<script setup lang="ts">
import type { HeroCard } from '~~/data/hero'

/** Contenido de una tarjeta del hero (icono + etiqueta + texto). El contenedor lo pone quien la usa. */
defineProps<{ card: HeroCard }>()

const CARD_ICONS: Record<HeroCard['id'], string> = {
  now: 'i-lucide-briefcase',
  path: 'i-lucide-git-branch',
  stack: 'i-lucide-layers',
  education: 'i-lucide-graduation-cap',
  languages: 'i-lucide-globe',
  'end-to-end': 'i-lucide-user',
  'designer-eye': 'i-lucide-sparkles',
  motivation: 'i-lucide-info',
}
</script>

<template>
  <p class="flex items-center gap-2 text-xs font-semibold text-muted">
    <UIcon :name="CARD_ICONS[card.id]" class="size-4" aria-hidden="true" />
    {{ card.label }}
  </p>
  <p class="mt-2 font-medium">{{ card.text }}</p>
</template>
