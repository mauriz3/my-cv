<script setup lang="ts">
/**
 * Pie mínimo. Hoy solo lleva «Preferencias de analítica», que reabre el aviso de consentimiento;
 * por eso el layout solo lo monta si el build lleva Google Analytics (igual que el aviso).
 */
const { t } = useI18n({ useScope: 'local' })
const { reopen } = useConsentBanner()
</script>

<template>
  <footer
    class="px-4 pb-[calc(var(--size-bottom-bar)+1rem)] md:pr-6 md:pb-6 md:pl-[calc(var(--size-rail)+1.5rem)] xl:pr-8 xl:pl-[calc(var(--size-sidebar-current)+2rem)]"
  >
    <div class="flex flex-wrap items-center gap-x-4 border-t border-default pt-2 text-sm text-muted">
      <button
        type="button"
        class="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-highlighted focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary"
        data-testid="analytics-preferences"
        @click="reopen"
      >
        {{ t('analyticsPreferences') }}
      </button>
    </div>
  </footer>
</template>

<i18n lang="json">
{
  "en": { "analyticsPreferences": "Analytics preferences" },
  "es": { "analyticsPreferences": "Preferencias de analítica" }
}
</i18n>
