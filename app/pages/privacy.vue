<script setup lang="ts">
import { CONSENT_STORAGE_KEY } from '~~/lib/analytics'
import { MOTION_STORAGE_KEY } from '~~/lib/motion'
import { analyticsCookieNames, GA_COOKIE_MAX_AGE_MONTHS, GA_DATA_RETENTION_MONTHS } from '~~/lib/privacy'

/** Privacidad: texto corto enlazado desde el aviso de analítica y el pie (no está en el menú). */
const { t } = useI18n()
const cv = useCv()
const { analyticsId } = useRuntimeConfig().public
const { reopen } = useConsentBanner()

usePageSeo(() => t('privacy.title'))

const linkedIn = computed(() => cv.value.contactLinks.find((link) => link.label === 'LinkedIn'))
const cookies = analyticsCookieNames().join(', ')
const SECTIONS = ['controller', 'what', 'cookies', 'region', 'google', 'retention', 'other'] as const
const params = {
  cookies,
  cookieMonths: GA_COOKIE_MAX_AGE_MONTHS,
  retentionMonths: GA_DATA_RETENTION_MONTHS,
  consentKey: CONSENT_STORAGE_KEY,
  motionKey: MOTION_STORAGE_KEY,
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('privacy.title')" :subtitle="t('privacy.subtitle')" />

    <article class="max-w-prose space-y-5 text-sm" data-testid="privacy">
      <section v-for="section in SECTIONS" :key="section" :aria-labelledby="`privacy-${section}`" class="space-y-1">
        <h2 :id="`privacy-${section}`" class="text-lg font-semibold text-highlighted">
          {{ t(`privacy.${section}.title`) }}
        </h2>
        <p class="text-muted">{{ t(`privacy.${section}.text`, params) }}</p>
        <p v-if="section === 'controller' && linkedIn" class="text-muted">
          {{ t('privacy.controller.contact') }}
          <ExternalLink :href="linkedIn.url">{{ linkedIn.label }}</ExternalLink>
        </p>
      </section>
      <p v-if="analyticsId">
        <UButton :label="t('privacy.change')" color="neutral" variant="outline" class="min-h-11" @click="reopen" />
      </p>
    </article>
  </div>
</template>
