<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('nav.education') })
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.education')" />
  </div>
</template>
