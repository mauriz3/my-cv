export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  ssr: true,

  // Fuentes e iconos van empaquetados en local: nada se pide a dominios externos (CSP estricta).
  ui: { fonts: false },
  icon: { fallbackToApi: false, clientBundle: { scan: true } },

  i18n: {
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
    prerender: { routes: ['/en', '/es'], crawlLinks: true }
  }
})
