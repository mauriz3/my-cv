<script setup lang="ts">
import { SIDEBAR_NO_FLASH_SCRIPT } from '~~/lib/sidebar'

const { t } = useI18n()

// Antes del primer pintado: un sidebar colapsado no debe parpadear abierto.
useHead({ script: [{ innerHTML: SIDEBAR_NO_FLASH_SCRIPT, tagPosition: 'head' }] })
</script>

<template>
  <UApp>
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-inverted"
    >
      {{ t('app.skipToContent') }}
    </a>
    <AppNav />
    <main
      id="main"
      class="min-h-dvh px-4 pt-6 pb-[calc(var(--size-bottom-bar)+1.5rem)] md:pl-[calc(var(--size-rail)+1.5rem)] md:pr-6 md:pb-8 xl:pl-[calc(var(--size-sidebar-current)+2rem)] xl:pr-8"
    >
      <slot />
    </main>
  </UApp>
</template>
