<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Error page (404 and others) with the brand, navigation and language of the route (`/es/...` → Spanish).
 * In Netlify nonexistent paths serve `404.html' and the client paints this page with the actual URL.
 */
const props = defineProps<{ error: NuxtError }>()
const NOT_FOUND = 404

const { t } = useI18n()
const localePath = useLocalePath()
const localeHead = useLocaleHead()

const isNotFound = computed(() => props.error.statusCode === NOT_FOUND)
const title = computed(() => t(isNotFound.value ? 'error.notFound' : 'error.title'))

useHead(() => ({ title: title.value, htmlAttrs: { lang: localeHead.value.htmlAttrs?.lang } }))

function goHome() {
  clearError({ redirect: localePath('/') })
}
</script>

<template>
  <NuxtLayout>
    <div class="space-y-6" data-testid="error-page">
      <PageHeader :title="title" :subtitle="t(isNotFound ? 'error.notFoundText' : 'error.text')" />
      <UButton :label="t('error.back')" icon="i-lucide-arrow-left" class="min-h-11" data-testid="error-back" @click="goHome" />
    </div>
  </NuxtLayout>
</template>
