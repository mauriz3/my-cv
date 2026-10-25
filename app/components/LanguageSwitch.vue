<script setup lang="ts">
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <div role="group" :aria-label="t('app.language')" class="inline-flex overflow-hidden rounded-lg border border-default">
    <NuxtLink
      v-for="item in locales"
      :key="item.code"
      :to="switchLocalePath(item.code)"
      :hreflang="item.code"
      :lang="item.code"
      :aria-current="item.code === locale ? 'true' : undefined"
      :data-testid="`lang-${item.code}`"
      class="px-3 py-1.5 text-sm font-medium uppercase transition-colors focus-visible:outline-2 focus-visible:outline-primary"
      :class="item.code === locale ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
    >
      {{ item.code }}
    </NuxtLink>
  </div>
</template>
