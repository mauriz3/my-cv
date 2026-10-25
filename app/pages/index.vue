<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => `${cv.value.fullName} · ${t('nav.profile')}`)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="cv.fullName" :subtitle="cv.headline" />
    <section class="rounded-xl border border-default bg-elevated p-6">
      <p class="max-w-prose text-muted">{{ cv.summary }}</p>
      <ContactLinks labels="always" class="mt-4 md:hidden" />
    </section>
  </div>
</template>
