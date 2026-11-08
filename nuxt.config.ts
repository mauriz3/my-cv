import { ANALYTICS_MEASUREMENT_ID } from './lib/analytics'
import { BOOKS_SHORT_LINK_PAGE, BOOKS_SHORT_LINK_PATHS, BOOKS_SHORT_LINK_ROUTES, isUnusedPayload, prerenderFileName } from './lib/booksShortLink'
import { PRIVACY_PATH } from './lib/privacy'
import { SITE_ORIGIN } from './lib/socialMeta'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from './lib/theme'
import { VISITS_RANGES, visitsEndpoint } from './lib/visits'

// Only the production build (CI on push to master) includes Google Analytics: not PRs, previews, or local.
const IS_PRODUCTION_BUILD = process.env.CONTEXT === 'production'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  ssr: true,

  runtimeConfig: { public: { analyticsId: IS_PRODUCTION_BUILD ? ANALYTICS_MEASUREMENT_ID : '' } },

  // Fonts and icons are bundled locally: nothing is fetched from external domains (strict CSP).
  ui: { fonts: false },
  // Dark by default with no saved choice; never follows prefers-color-scheme (decision in lib/theme.ts).
  colorMode: { preference: DEFAULT_THEME, fallback: DEFAULT_THEME, storageKey: THEME_STORAGE_KEY },
  // Icons from `app/utils` (menu, links) also ship in the client bundle: the error page
  // renders client-only (404.html) and cannot request them from the Iconify API.
  icon: {
    fallbackToApi: false,
    clientBundle: { scan: { globInclude: ['**/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml}', 'app/utils/**/*.ts'] } }
  },

  i18n: {
    // Netlify exposes each deploy URL; locally and in production it falls back to the real domain.
    baseUrl: process.env.DEPLOY_PRIME_URL ?? SITE_ORIGIN,
    strategy: 'prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: false,
    // Translated routes in one place (short book links: /en/books, /es/libros).
    customRoutes: 'config',
    pages: { [BOOKS_SHORT_LINK_PAGE]: BOOKS_SHORT_LINK_PATHS },
    locales: [
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' }
    ]
  },

  // Short book links: static HTML without the Vue app (no hydration or `_payload.json`); they jump to the section only.
  routeRules: Object.fromEntries(BOOKS_SHORT_LINK_ROUTES.map((route) => [route, { noScripts: true }])),

  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } },
    nodeTsConfig: { include: ['../vitest.config.ts', '../tests/**/*.ts', '../data/**/*.ts', '../lib/**/*.ts', '../scripts/**/*.mjs', '../scripts/**/*.ts', '../netlify/**/*.ts'] }
  },

  nitro: {
    // Visits JSON (mock) is a static file on the same origin: satisfies `connect-src 'self'`.
    // Privacy is linked only from the notice and footer (production only): always prerendered.
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
      // Short book links as `/en/books.html`: Netlify serves them with 200 at `/en/books`, without 301 to trailing slash.
      'prerender:generate'(route) {
        if (isUnusedPayload(route.route)) route.skip = true
        route.fileName = prerenderFileName(route.route, route.fileName ?? '')
      }
    }
  }
})
