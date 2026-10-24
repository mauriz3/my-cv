<script setup lang="ts">
const { t } = useI18n()
usePageSeo(() => t('nav.experience'))
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.experience')" />
  </div>
</template>
