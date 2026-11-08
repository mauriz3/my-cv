<script setup lang="ts">
const { t } = useI18n()
const cv = useCv()

usePageSeo(useProfileTitle())
</script>

<template>
  <div class="space-y-6">
    <!-- The h1 on this page is the name, on the first card of the tour. -->
    <PageHeader
      :title="t('profile.greeting')"
      :short-title="t('nav.profile')"
      :subtitle="t('profile.overview')"
      title-tag="p"
    />

    <ProfileJourney />

    <!-- After the tour (ending in Projects and Visits), in the normal flow of the page. -->
    <BooksSection />

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
