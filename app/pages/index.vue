<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(() => `${cv.value.fullName} · ${t('nav.profile')}`)
</script>

<template>
  <div class="space-y-6">
    <!-- El h1 de esta página es el nombre, en la primera tarjeta del recorrido. -->
    <PageHeader :title="t('profile.greeting')" :subtitle="t('profile.overview')" title-tag="p" />

    <ProfileJourney />

    <Panel :title="t('profile.summary')">
      <p class="max-w-prose text-muted">{{ cv.summary }}</p>
    </Panel>

    <Panel :title="t('profile.languages')">
      <ul class="flex flex-wrap gap-2">
        <li v-for="language in cv.languages" :key="language.id">
          <UBadge color="neutral" variant="subtle" :label="`${language.name} · ${language.level}`" />
        </li>
      </ul>
    </Panel>
  </div>
</template>
