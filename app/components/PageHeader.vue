<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-muted">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <!-- En móvil los enlaces van en la tarjeta de perfil (ver pages/index.vue). -->
      <ContactLinks labels="wide-only" class="hidden md:flex" />
      <LanguageSwitch />
      <UColorModeButton />
    </div>
  </header>
</template>
