<script setup lang="ts">
import { booksSectionUrl, clientRedirectScript, metaRefreshContent } from '~~/lib/booksShortLink'

/**
 * Enlace corto a «Libros que recomiendo» (/en/books, /es/libros): 200 con la vista previa del Perfil
 * (canonical to the Profile) and skip in the client to the section, with meta refresh and script; the link is backup.
 */
definePageMeta({ layout: false })

const { t } = useI18n()
const localePath = useLocalePath()
const profilePath = () => localePath('index')
const target = computed(() => booksSectionUrl(profilePath()))

usePageSeo(useProfileTitle(), { canonicalPath: profilePath })

useHead(() => ({
  meta: [{ 'http-equiv': 'refresh', content: metaRefreshContent(target.value) }],
  script: [{ innerHTML: clientRedirectScript(target.value), tagPosition: 'head' }]
}))
</script>

<template>
  <main class="grid min-h-dvh place-items-center p-6 text-center">
    <p class="text-muted">
      {{ t('booksLink.redirecting') }}
      <a :href="target" class="font-medium text-primary underline underline-offset-4">{{ t('books.title') }}</a>
    </p>
  </main>
</template>
