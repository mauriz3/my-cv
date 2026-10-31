<script setup lang="ts">
import { buildHeroCards, HERO_CARD_IDS } from '~~/data/hero'

const { t } = useI18n()
const cv = useCv()

usePageSeo(() => `${cv.value.fullName} · ${t('nav.profile')}`)

const heroCards = computed(() =>
  buildHeroCards(cv.value, {
    present: t('period.present'),
    cards: Object.fromEntries(HERO_CARD_IDS.map((id) => [id, t(`profile.heroCards.${id}`)])) as Record<
      (typeof HERO_CARD_IDS)[number],
      string
    >,
  }),
)
</script>

<template>
  <div class="space-y-6">
    <!-- El h1 de esta página es el nombre del hero. -->
    <PageHeader :title="t('profile.greeting')" :subtitle="t('profile.overview')" title-tag="p" />

    <ProfileStory :eyebrow="cv.headline" :tagline="cv.tagline" :cards="heroCards" />

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
