import { ANALYTICS_MEASUREMENT_ID } from './lib/analytics'
import { PRIVACY_PATH } from './lib/privacy'
import { VISITS_RANGES, visitsEndpoint } from './lib/visits'

// Solo el build de producción (CI en push a master) lleva Google Analytics: ni develop, ni preview, ni local.
const IS_PRODUCTION_BUILD = process.env.CONTEXT === 'production'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  ssr: true,

  runtimeConfig: { public: { analyticsId: IS_PRODUCTION_BUILD ? ANALYTICS_MEASUREMENT_ID : '' } },

  // Fuentes e iconos van empaquetados en local: nada se pide a dominios externos (CSP estricta).
  ui: { fonts: false },
  icon: { fallbackToApi: false, clientBundle: { scan: true } },

  i18n: {
    // Netlify expone la URL de cada despliegue; en local y en producción cae al dominio real.
    baseUrl: process.env.DEPLOY_PRIME_URL ?? 'https://www.mauriziorendon.com',
    strategy: 'prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' }
    ]
  },

  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } },
    nodeTsConfig: { include: ['../vitest.config.ts', '../tests/**/*.ts', '../data/**/*.ts', '../lib/**/*.ts', '../scripts/**/*.mjs'] }
  },

  nitro: {
    // El JSON de visitas (mock) sale como fichero estático del mismo origen: cumple `connect-src 'self'`.
    // Privacidad solo se enlaza desde el aviso y el pie (que solo existen en producción): se prerenderiza siempre.
    prerender: {
      routes: ['/en', '/es', `/en${PRIVACY_PATH}`, `/es${PRIVACY_PATH}`, ...VISITS_RANGES.map(visitsEndpoint)],
      crawlLinks: true
    }
  }
})
