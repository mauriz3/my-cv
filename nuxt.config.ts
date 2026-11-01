import { ANALYTICS_MEASUREMENT_ID } from './lib/analytics'
import { BOOKS_SHORT_LINK_PAGE, BOOKS_SHORT_LINK_PATHS, BOOKS_SHORT_LINK_ROUTES, isUnusedPayload, prerenderFileName } from './lib/booksShortLink'
import { PRIVACY_PATH } from './lib/privacy'
import { SITE_ORIGIN } from './lib/socialMeta'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from './lib/theme'
import { VISITS_RANGES, visitsEndpoint } from './lib/visits'

// Solo el build de producción (CI en push a master) lleva Google Analytics: ni pull requests, ni preview, ni local.
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
  // Oscuro por defecto sin elección guardada; nunca se sigue a prefers-color-scheme (decisión en lib/theme.ts).
  colorMode: { preference: DEFAULT_THEME, fallback: DEFAULT_THEME, storageKey: THEME_STORAGE_KEY },
  // Los iconos de `app/utils` (menú, enlaces) también van al bundle del cliente: la página de error
  // se pinta solo en el cliente (404.html) y no puede pedirlos a la API de Iconify.
  icon: {
    fallbackToApi: false,
    clientBundle: { scan: { globInclude: ['**/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml}', 'app/utils/**/*.ts'] } }
  },

  i18n: {
    // Netlify expone la URL de cada despliegue; en local y en producción cae al dominio real.
    baseUrl: process.env.DEPLOY_PRIME_URL ?? SITE_ORIGIN,
    strategy: 'prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: false,
    // Rutas traducidas en un solo sitio (enlaces cortos a Libros: /en/books, /es/libros).
    customRoutes: 'config',
    pages: { [BOOKS_SHORT_LINK_PAGE]: BOOKS_SHORT_LINK_PATHS },
    locales: [
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' }
    ]
  },

  // Enlaces cortos de Libros: HTML estático sin la app de Vue (ni hidratación ni `_payload.json`); solo saltan a la sección.
  routeRules: Object.fromEntries(BOOKS_SHORT_LINK_ROUTES.map((route) => [route, { noScripts: true }])),

  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } },
    nodeTsConfig: { include: ['../vitest.config.ts', '../tests/**/*.ts', '../data/**/*.ts', '../lib/**/*.ts', '../scripts/**/*.mjs', '../scripts/**/*.ts', '../netlify/**/*.ts'] }
  },

  nitro: {
    // El JSON de visitas (mock) sale como fichero estático del mismo origen: cumple `connect-src 'self'`.
    // Privacidad solo se enlaza desde el aviso y el pie (que solo existen en producción): se prerenderiza siempre.
    prerender: {
      routes: [
        '/en',
        '/es',
        `/en${PRIVACY_PATH}`,
        `/es${PRIVACY_PATH}`,
        ...BOOKS_SHORT_LINK_ROUTES,
        ...VISITS_RANGES.map(visitsEndpoint)
      ],
      crawlLinks: true
    },
    hooks: {
      // Enlaces cortos de Libros como `/en/books.html`: Netlify los sirve con 200 en `/en/books`, sin 301 a la barra final.
      'prerender:generate'(route) {
        if (isUnusedPayload(route.route)) route.skip = true
        route.fileName = prerenderFileName(route.route, route.fileName ?? '')
      }
    }
  }
})
