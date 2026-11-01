/** Dominio de producción: base de las URLs absolutas que leen redes sociales y buscadores. */
export const SITE_ORIGIN = 'https://www.mauriziorendon.com'

/** Imagen de vista previa (Open Graph / Twitter) compartida por todas las páginas e idiomas. */
export const SOCIAL_IMAGE = {
  path: '/og-cv.png',
  width: 1200,
  height: 630,
  type: 'image/png'
} as const

export const TWITTER_CARD = 'summary_large_image'

/** URL absoluta de una ruta del sitio (las redes no resuelven rutas relativas). */
export function absoluteUrl(path: string, origin: string = SITE_ORIGIN): string {
  return new URL(path, origin).href
}

export interface SocialImageMeta {
  ogImage: string
  ogImageWidth: number
  ogImageHeight: number
  ogImageType: typeof SOCIAL_IMAGE.type
  ogImageAlt: string
  twitterCard: typeof TWITTER_CARD
  twitterImage: string
  twitterImageAlt: string
}

/** Etiquetas de imagen para `useSeoMeta`: siempre la URL de producción, también en previews. */
export function socialImageMeta(alt: string): SocialImageMeta {
  const url = absoluteUrl(SOCIAL_IMAGE.path)
  return {
    ogImage: url,
    ogImageWidth: SOCIAL_IMAGE.width,
    ogImageHeight: SOCIAL_IMAGE.height,
    ogImageType: SOCIAL_IMAGE.type,
    ogImageAlt: alt,
    twitterCard: TWITTER_CARD,
    twitterImage: url,
    twitterImageAlt: alt
  }
}

/** Lo que se lee de los `<link>` y `<meta>` de `useLocaleHead` (el resto de atributos se conserva tal cual). */
interface HeadLinkAttrs {
  rel?: unknown
  href?: unknown
  hreflang?: unknown
}
interface HeadMetaAttrs {
  property?: unknown
  content?: unknown
}

/**
 * Para una página que duplica a otra (p. ej. un enlace corto): `canonical` y `og:url` pasan a `canonicalUrl`
 * y se quitan los `hreflang`, que solo debe llevar la página canónica.
 */
export function pointHeadToCanonical<Link extends HeadLinkAttrs, Meta extends HeadMetaAttrs>(
  head: { link?: Link[]; meta?: Meta[] },
  canonicalUrl: string
): { link: Link[]; meta: Meta[] } {
  return {
    link: (head.link ?? [])
      .filter((link) => !link.hreflang)
      .map((link) => (link.rel === 'canonical' ? { ...link, href: canonicalUrl } : link)),
    meta: (head.meta ?? []).map((meta) => (meta.property === 'og:url' ? { ...meta, content: canonicalUrl } : meta))
  }
}
