<script setup lang="ts">
import { PROFILE_REVEAL_THRESHOLD } from '~~/lib/profileSections'

/**
 * Profile “Languages” card. One card per CV language.
 * Names and CEFR levels come from `data/`; labels and usage come from i18n.
 */
const { t } = useI18n()
const cv = useCv()

const list = ref<HTMLElement | null>(null)
const { state: revealState } = useRevealOnce(list, PROFILE_REVEAL_THRESHOLD)
</script>

<template>
  <section
    class="flex flex-col gap-5 rounded-[14px] border border-default bg-elevated p-7"
    aria-labelledby="languages-title"
    data-testid="languages-section"
  >
    <header class="flex flex-col gap-1">
      <h2 id="languages-title" class="font-display text-[22px] leading-7 font-bold text-highlighted">
        {{ t('profile.languages') }}
      </h2>
      <p class="text-[13px] leading-[18px] text-muted">{{ t('profile.languagesIntro') }}</p>
    </header>

    <ul
      ref="list"
      class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4"
      :data-reveal="revealState"
    >
      <li v-for="(language, index) in cv.languages" :key="language.id">
        <LanguageCard
          :id="language.id"
          :name="language.name"
          :level="language.level"
          :index="index"
        />
      </li>
    </ul>
  </section>
</template>
