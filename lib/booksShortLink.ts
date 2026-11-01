/**
 * Enlaces cortos a «Libros que recomiendo» (`/en/books`, `/es/libros`) para Destacados de LinkedIn, que quita el `#`.
 * Son páginas mínimas prerenderizadas (200, con la vista previa del Perfil) que llevan en el cliente a la sección:
 * el 301 con fragmento que había antes en `_redirects` hacía fallar el Post Inspector de LinkedIn (500).
 */

/** `id` de la sección en el Perfil (`BooksSection.vue`). */
export const BOOKS_SECTION_ID = 'books'

/** Nombre de la página en `app/pages/` y ruta de cada idioma (i18n, `customRoutes: 'config'`). */
export const BOOKS_SHORT_LINK_PAGE = 'books'
export const BOOKS_SHORT_LINK_PATHS = { en: '/books', es: '/libros' } as const

export type BooksShortLinkLocale = keyof typeof BOOKS_SHORT_LINK_PATHS

/** Rutas completas a prerenderizar: `/en/books`, `/es/libros`. */
export const BOOKS_SHORT_LINK_ROUTES = Object.entries(BOOKS_SHORT_LINK_PATHS).map(([locale, path]) => `/${locale}${path}`)

/** Nombre del payload que Nuxt extrae por ruta prerenderizada. */
const PAYLOAD_FILE = '_payload.json'

/** Segundos del `<meta http-equiv="refresh">`: respaldo sin JS, inmediato. */
const META_REFRESH_DELAY_SECONDS = 0

/** Destino: la sección dentro del Perfil del idioma (`/en` → `/en/#books`). */
export function booksSectionUrl(profilePath: string): string {
  return `${profilePath.replace(/\/$/, '')}/#${BOOKS_SECTION_ID}`
}

/** Contenido del `<meta http-equiv="refresh">`. */
export function metaRefreshContent(target: string): string {
  return `${META_REFRESH_DELAY_SECONDS};url=${target}`
}

/** Script inline (su hash entra en la CSP con `scripts/build-headers.mjs`): `replace` no deja la página en el historial. */
export function clientRedirectScript(target: string): string {
  return `location.replace(${JSON.stringify(target)})`
}

/**
 * Fichero de cada ruta prerenderizada. Netlify (pretty URLs) responde 301 a `/ruta/` si existe `ruta/index.html`,
 * pero sirve `ruta.html` con 200 en `/ruta`: los enlaces cortos salen como `.html` plano; el resto, sin cambios.
 */
export function prerenderFileName(route: string, defaultFileName: string): string {
  return BOOKS_SHORT_LINK_ROUTES.includes(route) ? `${route}.html` : defaultFileName
}

/**
 * Payload de un enlace corto: sobra (la página va sin scripts) y su carpeta `ruta/` haría convivir
 * `ruta.html` con un directorio del mismo nombre en Netlify. No se escribe.
 */
export function isUnusedPayload(route: string): boolean {
  return BOOKS_SHORT_LINK_ROUTES.some((shortLink) => route.startsWith(`${shortLink}/${PAYLOAD_FILE}`))
}
