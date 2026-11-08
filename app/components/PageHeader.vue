<script setup lang="ts">
/**
 * Header of each page (spec boton-global.md). Fixed order, same in the DOM and on the screen:
 * title (stretches) → [links] → [animations] → [ES/EN] → [sun/moon].
 * Mobile (< 600px): Single line with title and all three controls; no subtitle, and `shortTitle` if any.
 * Below 375 px the title drops to 20 px; the ellipsis is just a safety net.
 * `titleTag="p"` when the page already has its own h1 (the Profile: the hero's name).
 * `titleId`: anchor of the title; receives the focus by program (`tabindex="-1"`) when arriving from a link.
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
      <!-- On mobile the links go on the profile card (see ProfileJourney). -->
      <ContactLinks labels="wide-only" class="hidden md:flex" />
      <AnimationsToggle />
      <LanguageSwitch />
      <UColorModeButton class="size-11 shrink-0 justify-center" />
    </div>
  </header>
</template>
