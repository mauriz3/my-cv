<script setup lang="ts">
/**
 * Cabecera de cada página (spec boton-global.md). Orden fijo, igual en el DOM y en pantalla:
 * título (se estira) → [enlaces] → [movimiento] → [ES/EN] → [sol/luna].
 * Móvil (< 600 px): una sola línea con el título y los tres controles; sin subtítulo, y `shortTitle` si lo hay.
 * Por debajo de 375 px el título baja a 20 px; la elipsis es solo una red de seguridad.
 * `titleTag="p"` cuando la página ya tiene su propio h1 (el Perfil: el nombre del hero).
 * `titleId`: ancla del título; recibe el foco por programa (`tabindex="-1"`) al llegar desde un enlace.
 */
withDefaults(
  defineProps<{ title: string; shortTitle?: string; subtitle?: string; titleTag?: 'h1' | 'p'; titleId?: string }>(),
  { shortTitle: undefined, subtitle: undefined, titleTag: 'h1', titleId: undefined },
)
</script>

<template>
  <header class="flex items-center justify-between gap-2 min-[600px]:items-start min-[600px]:gap-4">
    <div class="min-w-0 flex-1">
      <component
        :is="titleTag"
        :id="titleId"
        :tabindex="titleId ? -1 : undefined"
        class="truncate font-display text-2xl font-semibold text-highlighted focus:outline-none max-[374.98px]:text-xl"
        data-testid="page-title"
      >
        <template v-if="shortTitle">
          <span class="min-[600px]:hidden">{{ shortTitle }}</span>
          <span class="max-[599.98px]:hidden">{{ title }}</span>
        </template>
        <template v-else>{{ title }}</template>
      </component>
      <p v-if="subtitle" class="text-sm text-muted max-[599.98px]:hidden">{{ subtitle }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2" data-testid="page-header-controls">
      <!-- En móvil los enlaces van en la tarjeta de perfil (ver ProfileJourney). -->
      <ContactLinks labels="wide-only" class="hidden md:flex" />
      <MotionToggle />
      <LanguageSwitch />
      <UColorModeButton class="size-11 shrink-0 justify-center" />
    </div>
  </header>
</template>
