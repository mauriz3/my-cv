<script setup lang="ts">
import { ANIMATIONS_NO_FLASH_SCRIPT } from '~~/lib/animations'
import { DEFAULT_THEME, THEME_NO_FLASH_SCRIPT, themeColor } from '~~/lib/theme'

const colorMode = useColorMode()

// Antes del primer pintado: fija `<html data-motion>` (estático salvo `animations=on` sin reduced-motion).
// Tema: el HTML prerenderizado ya sale oscuro (también sin JS); el script solo corrige una elección «light» guardada.
useHead({
  // Solo en el servidor: en el cliente la clase la gestiona color-mode (el botón la quita y la pone).
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
