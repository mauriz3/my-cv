<script setup lang="ts">
import { applyConsent, readConsent, type ConsentChoice, type Gtag } from '~~/lib/analytics'

/**
 * Aviso mínimo de analítica (solo existe si el build lleva Google Analytics). Aceptar activa
 * `analytics_storage`; Rechazar lo deja en «denied». La elección se recuerda en localStorage.
 */
const { t } = useI18n({ useScope: 'local' })

const isVisible = ref(false)

function choose(choice: ConsentChoice) {
  applyConsent(choice, localStorage, (window as { gtag?: Gtag }).gtag)
  isVisible.value = false
}

onMounted(() => {
  isVisible.value = readConsent(localStorage) === null
})
</script>

<template>
  <section
    v-if="isVisible"
    aria-labelledby="consent-title"
    data-testid="consent-banner"
    class="fixed inset-x-3 bottom-[calc(var(--size-bottom-bar)+0.75rem)] z-50 rounded-xl border border-default bg-elevated p-4 shadow-lg md:right-4 md:bottom-4 md:left-[calc(var(--size-rail)+1rem)] md:max-w-xl xl:left-[calc(var(--size-sidebar-current)+1rem)]"
  >
    <h2 id="consent-title" class="text-sm font-semibold text-highlighted">{{ t('title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ t('text') }}</p>
    <div class="mt-3 flex gap-2">
      <UButton :label="t('accept')" color="primary" class="min-h-11" data-testid="consent-accept" @click="choose('granted')" />
      <UButton :label="t('reject')" color="neutral" variant="outline" class="min-h-11" data-testid="consent-reject" @click="choose('denied')" />
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Visit statistics",
    "text": "With your OK, Google Analytics counts visits to improve this site. No personal data is collected.",
    "accept": "Accept",
    "reject": "Reject"
  },
  "es": {
    "title": "Estadísticas de visitas",
    "text": "Con tu permiso, Google Analytics cuenta las visitas para mejorar esta web. No se recogen datos personales.",
    "accept": "Aceptar",
    "reject": "Rechazar"
  }
}
</i18n>
