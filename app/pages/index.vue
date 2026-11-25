<script setup lang="ts">
const { t } = useI18n()

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

    <AboutSection />

    <LanguagesSection />
  </div>
</template>
