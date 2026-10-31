<script setup lang="ts">
/** Enlace a otra web: pestaña nueva, sin `opener` ni `referrer` y aviso para lectores de pantalla. */
defineProps<{ href: string }>()
const { t } = useI18n()
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-primary">
    <slot />
    <span class="sr-only"> ({{ t('app.opensInNewTab') }})</span>
  </a>
</template>
