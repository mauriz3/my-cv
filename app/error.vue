<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Página de error (404 y demás) con la marca, la navegación y el idioma de la ruta (`/es/...` → español).
 * En Netlify las rutas inexistentes sirven `404.html` y el cliente pinta esta página con la URL real.
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
