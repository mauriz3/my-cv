<script setup lang="ts">
/**
 * `titleTag="p"` cuando la página ya tiene su propio h1 (el Perfil: el nombre del hero).
 * Slot `actions`: controles propios de una página (el botón de movimiento, solo en el Inicio).
 */
withDefaults(defineProps<{ title: string; subtitle?: string; titleTag?: 'h1' | 'p' }>(), { titleTag: 'h1' })
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <component :is="titleTag" class="font-display text-2xl font-semibold text-highlighted">{{ title }}</component>
      <p v-if="subtitle" class="text-sm text-muted">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <!-- En móvil los enlaces van en la tarjeta de perfil (ver pages/index.vue). -->
      <ContactLinks labels="wide-only" class="hidden md:flex" />
      <slot name="actions" />
      <LanguageSwitch />
      <UColorModeButton />
    </div>
  </header>
</template>
