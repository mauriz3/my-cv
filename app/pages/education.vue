<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => t('nav.education'))
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('nav.education')" :subtitle="t('education.subtitle')" />

    <!-- Gráfica «Education over time»: la hace Programador2 (va aquí, junto a la lista). -->

    <section aria-labelledby="education-studies" class="space-y-3">
      <h2 id="education-studies" class="text-lg font-semibold text-highlighted">{{ t('education.studies') }}</h2>
      <ol class="grid gap-4 lg:grid-cols-2" data-testid="education-list">
        <li v-for="study in cv.education" :key="study.id">
          <UCard as="article" :aria-labelledby="`study-${study.id}`" class="h-full">
            <PeriodTime :period="study.period" />
            <h3 :id="`study-${study.id}`" class="mt-1 font-semibold text-highlighted">{{ study.title }}</h3>
            <p class="text-sm">
              <ExternalLink :href="study.institutionUrl">{{ study.institution }}</ExternalLink>
            </p>
            <p v-if="study.description" class="mt-2 text-sm text-muted">{{ study.description }}</p>
          </UCard>
        </li>
      </ol>
    </section>

    <section v-if="cv.certifications.length" aria-labelledby="education-certifications" class="space-y-3">
      <h2 id="education-certifications" class="text-lg font-semibold text-highlighted">
        {{ t('education.certifications') }}
      </h2>
      <ul class="grid gap-4 lg:grid-cols-2" data-testid="certification-list">
        <li v-for="certification in cv.certifications" :key="certification.id">
          <UCard>
            <p class="flex items-center gap-2 font-semibold text-highlighted">
              <UIcon name="i-lucide-award" class="size-5 text-secondary" aria-hidden="true" />
              {{ certification.name }}
            </p>
          </UCard>
        </li>
      </ul>
    </section>
  </div>
</template>
