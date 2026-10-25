<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => `${cv.value.fullName} · ${t('nav.profile')}`)

/** «native» se traduce; el resto son niveles del MCER (B2, B1…) y se muestran tal cual. */
const languageLevel = (level: string) => (level === 'native' ? t('profile.levels.native') : level)
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="cv.fullName" :subtitle="cv.headline" />

    <!-- Hero con holograma y cifras: lo hace Programador2 (va aquí, encima del resumen). -->

    <section aria-labelledby="profile-summary" class="rounded-xl border border-default bg-elevated p-6">
      <h2 id="profile-summary" class="mb-2 text-lg font-semibold text-highlighted">{{ t('profile.summary') }}</h2>
      <p class="max-w-prose text-muted">{{ cv.summary }}</p>
      <ContactLinks labels="always" class="mt-4 md:hidden" />
    </section>

    <div class="grid gap-4 md:grid-cols-2">
      <UCard as="section" aria-labelledby="profile-in-my-words" data-testid="end-to-end">
        <h2 id="profile-in-my-words" class="mb-2 flex items-center gap-2 text-sm font-normal text-muted">
          <UIcon name="i-lucide-user-round" class="size-4" aria-hidden="true" />
          {{ t('profile.inMyWords') }}
        </h2>
        <p class="font-medium text-highlighted">{{ cv.endToEnd }}</p>
      </UCard>
      <UCard as="section" aria-labelledby="profile-motivation" data-testid="motivation">
        <h2 id="profile-motivation" class="mb-2 flex items-center gap-2 text-sm font-normal text-muted">
          <UIcon name="i-lucide-info" class="size-4" aria-hidden="true" />
          {{ t('profile.motivation') }}
        </h2>
        <p class="font-medium text-highlighted">{{ cv.motivation }}</p>
      </UCard>
    </div>

    <section aria-labelledby="profile-languages" class="rounded-xl border border-default bg-elevated p-6">
      <h2 id="profile-languages" class="mb-3 text-lg font-semibold text-highlighted">{{ t('profile.languages') }}</h2>
      <ul class="flex flex-wrap gap-2">
        <li v-for="language in cv.languages" :key="language.id">
          <UBadge color="neutral" variant="subtle" :label="`${language.name} · ${languageLevel(language.level)}`" />
        </li>
      </ul>
    </section>
  </div>
</template>
