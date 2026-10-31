<script setup lang="ts">
import { applyConsent, readConsent, updateConsent, type ConsentChoice, type Gtag } from '~~/lib/analytics'
import { consentStartAction, fetchVisitorCountry } from '~~/lib/consentRegion'

/**
 * Aviso mínimo de analítica (solo existe si el build lleva Google Analytics). Aceptar activa
 * `analytics_storage`; Rechazar lo deja en «denied». La elección se recuerda en localStorage
 * y se puede cambiar después desde el pie («Preferencias de analítica»).
 * Solo aparece en la UE/EEE, Reino Unido y Suiza (país de `/geo`); oculto hasta saberlo y, si no se sabe, visible.
 * Fuera de esa zona se concede sin aviso, solo para esa visita.
 */
const { t } = useI18n({ useScope: 'local' })
const { isOpen: isVisible, wantsFocus } = useConsentBanner()
const banner = useTemplateRef<HTMLElement>('banner')

const CONSENT_OPTIONS = [
  { choice: 'granted', labelKey: 'accept', testId: 'consent-accept' },
  { choice: 'denied', labelKey: 'reject', testId: 'consent-reject' },
] as const satisfies readonly { choice: ConsentChoice; labelKey: string; testId: string }[]

function gtag() {
  return (window as { gtag?: Gtag }).gtag
}

function choose(choice: ConsentChoice) {
  applyConsent(choice, localStorage, gtag())
  isVisible.value = false
}

onMounted(async () => {
  const stored = readConsent(localStorage)
  if (stored !== null) return
  const action = consentStartAction(stored, await fetchVisitorCountry(fetch))
  if (action === 'show-banner') isVisible.value = true
  else if (action === 'grant-without-banner') updateConsent('granted', gtag())
})

// Reabierto desde el pie: el foco va al aviso (sin preseleccionar opción) para elegir con el teclado.
watch(isVisible, async (visible) => {
  if (!visible || !wantsFocus.value) return
  wantsFocus.value = false
  await nextTick()
  banner.value?.focus()
})
</script>

<template>
  <section
    v-if="isVisible"
    ref="banner"
    tabindex="-1"
    aria-labelledby="consent-title"
    data-testid="consent-banner"
    class="fixed inset-x-3 bottom-[calc(var(--size-bottom-bar)+0.75rem)] z-50 rounded-xl border border-default bg-elevated p-4 shadow-lg focus-visible:outline-2 focus-visible:outline-primary md:right-4 md:bottom-4 md:left-[calc(var(--size-rail)+1rem)] md:max-w-xl xl:left-[calc(var(--size-sidebar-current)+1rem)]"
  >
    <h2 id="consent-title" class="text-sm font-semibold text-highlighted">{{ t('title') }}</h2>
    <i18n-t keypath="text" tag="p" scope="parent" class="mt-1 text-sm text-muted">
      <template #lead>
        <strong class="font-semibold text-highlighted">{{ t('lead') }}</strong>
      </template>
    </i18n-t>
    <!-- Aceptar y Rechazar con el mismo tamaño, peso y contraste: ninguna opción se destaca. -->
    <div class="mt-3 grid grid-cols-2 gap-2 sm:flex">
      <UButton
        v-for="option in CONSENT_OPTIONS"
        :key="option.choice"
        :label="t(option.labelKey)"
        color="neutral"
        variant="outline"
        class="min-h-11 justify-center font-semibold sm:min-w-28"
        :data-testid="option.testId"
        @click="choose(option.choice)"
      />
    </div>
  </section>
</template>

<i18n lang="json">
{
  "en": {
    "title": "Visit statistics",
    "lead": "I only measure visits statistically",
    "text": "{lead}, with no ads and no personal profiles. This data powers the Visits section of this site.",
    "accept": "Accept",
    "reject": "Reject"
  },
  "es": {
    "title": "Estadísticas de visitas",
    "lead": "Solo mido visitas de forma estadística",
    "text": "{lead}, sin publicidad ni perfiles personales. Estos datos alimentan la sección Visitas de esta web.",
    "accept": "Aceptar",
    "reject": "Rechazar"
  }
}
</i18n>
