<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.education'))
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.education')" :subtitle="t('education.subtitle')" />

    <!-- Gráfica «Education over time»: la hace Programador2 (va aquí, junto a la lista). -->

    <ol class="grid gap-4 lg:grid-cols-2" data-testid="education-list">
      <li v-for="study in cv.education" :key="study.id">
        <UCard as="article" :aria-labelledby="`study-${study.id}`" class="h-full">
          <PeriodTime :period="study.period" />
          <h2 :id="`study-${study.id}`" class="mt-1 font-semibold text-highlighted">{{ study.title }}</h2>
          <p class="text-sm">
            <ExternalLink :href="study.institutionUrl">{{ study.institution }}</ExternalLink>
          </p>
          <p v-if="study.description" class="mt-2 text-sm text-muted">{{ study.description }}</p>
        </UCard>
      </li>
    </ol>
  </div>
</template>
