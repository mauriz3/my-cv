<script setup lang="ts">
const { t } = useI18n()
usePageSeo(() => t('nav.projects'))
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.projects')" />
  </div>
</template>
