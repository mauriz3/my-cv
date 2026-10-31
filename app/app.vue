<script setup lang="ts">
import { MOTION_NO_FLASH_SCRIPT } from '~~/lib/motion'

// Antes del primer pintado: fija `<html data-motion>` (elección guardada o sistema) para no saltar de maqueta.
useHead({ script: [{ innerHTML: MOTION_NO_FLASH_SCRIPT, tagPosition: 'head' }] })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
