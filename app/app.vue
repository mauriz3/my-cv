<script setup lang="ts">
import { ANIMATIONS_NO_FLASH_SCRIPT } from '~~/lib/animations'
import { DEFAULT_THEME, THEME_NO_FLASH_SCRIPT, themeColor } from '~~/lib/theme'

const colorMode = useColorMode()

// Before the first painting: fixed `<html data-motion>` (static except `animations=on` without reduced-motion).
// Theme: The prerendered HTML is already dark (also without JS); the script only corrects a saved "light" choice.
useHead({
  // Only on the server: on the client the class manages it color-mode (the button removes it and puts it).
  htmlAttrs: import.meta.server ? { class: DEFAULT_THEME } : {},
  meta: [{ name: 'theme-color', content: () => themeColor(colorMode.value) }],
  script: [
    { innerHTML: ANIMATIONS_NO_FLASH_SCRIPT, tagPosition: 'head' },
    { innerHTML: THEME_NO_FLASH_SCRIPT, tagPosition: 'head' }
  ]
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
