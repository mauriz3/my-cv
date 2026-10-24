<script setup lang="ts">
const { t } = useI18n()
usePageSeo(() => t('nav.skills'))
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.skills')" />
  </div>
</template>
