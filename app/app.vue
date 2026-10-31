<script setup lang="ts">
import { MOTION_NO_FLASH_SCRIPT } from '~~/lib/motion'

// Antes del primer pintado: el CSS sabe si hay JS y si se pidió «Reduce motion» (sin saltos de diseño).
useHead({ script: [{ innerHTML: MOTION_NO_FLASH_SCRIPT, tagPosition: 'head' }] })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
