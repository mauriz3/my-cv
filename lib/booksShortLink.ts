/**
 * Short links to «Books I recommend» (`/en/books`, `/es/libros`) for LinkedIn highlights, which strip `#`.
 * Minimal prerendered pages (200, Profile preview) that client-navigate to the section:
 * the old 301 with fragment in `_redirects` broke LinkedIn Post Inspector (500).
 */

/** Section `id` on Profile (`BooksSection.vue`). */
export const BOOKS_SECTION_ID = 'books'

/** Page name in `app/pages/` and path per locale (i18n, `customRoutes: 'config'`). */
export const BOOKS_SHORT_LINK_PAGE = 'books'
export const BOOKS_SHORT_LINK_PATHS = { en: '/books', es: '/libros' } as const

export type BooksShortLinkLocale = keyof typeof BOOKS_SHORT_LINK_PATHS

/** Full routes to prerender: `/en/books`, `/es/libros`. */
export const BOOKS_SHORT_LINK_ROUTES = Object.entries(BOOKS_SHORT_LINK_PATHS).map(([locale, path]) => `/${locale}${path}`)

/** Payload file name Nuxt extracts per prerendered route. */
const PAYLOAD_FILE = '_payload.json'

/** `<meta http-equiv="refresh">` seconds: no-JS fallback, immediate. */
const META_REFRESH_DELAY_SECONDS = 0

/** Target: section within Profile for the locale (`/en` → `/en/#books`). */
export function booksSectionUrl(profilePath: string): string {
  return `${profilePath.replace(/\/$/, '')}/#${BOOKS_SECTION_ID}`
}

/** `<meta http-equiv="refresh">` content. */
export function metaRefreshContent(target: string): string {
  return `${META_REFRESH_DELAY_SECONDS};url=${target}`
}

/** Inline script (hash in CSP via `scripts/build-headers.mjs`): `replace` does not leave the page in history. */
export function clientRedirectScript(target: string): string {
  return `location.replace(${JSON.stringify(target)})`
}

/**
 * File per prerendered route. Netlify (pretty URLs) 301s `/route/` when `route/index.html` exists,
 * but serves `route.html` as 200 on `/route`: short links are flat `.html`; others unchanged.
 */
export function prerenderFileName(route: string, defaultFileName: string): string {
  return BOOKS_SHORT_LINK_ROUTES.includes(route) ? `${route}.html` : defaultFileName
}

/**
 * Short-link payload is unused (page has no scripts) and its `route/` folder would collide
 * with a same-named `route.html` on Netlify. Not written.
 */
export function isUnusedPayload(route: string): boolean {
  return BOOKS_SHORT_LINK_ROUTES.some((shortLink) => route.startsWith(`${shortLink}/${PAYLOAD_FILE}`))
}
