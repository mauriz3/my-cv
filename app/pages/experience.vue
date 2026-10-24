<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('nav.experience') })
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.experience')" />
  </div>
</template>
