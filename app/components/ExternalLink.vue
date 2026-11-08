<script setup lang="ts">
/** Link to another website: new tab, without `opener` or `referrer` and notice for screen readers. */
defineProps<{ href: string }>()
const { t } = useI18n()
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-primary">
    <slot />
    <span class="sr-only"> ({{ t('app.opensInNewTab') }})</span>
  </a>
</template>
