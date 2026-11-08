/** Production domain: base for absolute URLs social networks and search engines read. */
export const SITE_ORIGIN = 'https://www.mauriziorendon.com'

/** Shared preview image (Open Graph / Twitter) for all pages and locales. */
export const SOCIAL_IMAGE = {
  path: '/og-cv.png',
  width: 1200,
  height: 630,
  type: 'image/png'
} as const

export const TWITTER_CARD = 'summary_large_image'

/** Absolute URL for a site path (networks do not resolve relative paths). */
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

/** Image tags for `useSeoMeta`: always production URL, including in previews. */
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

/** Fields read from `<link>` and `<meta>` of `useLocaleHead` (other attrs are kept as-is). */
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
 * For a page that duplicates another (e.g. a short link): `canonical` and `og:url` become `canonicalUrl`
 * and `hreflang` entries are removed (only the canonical page should have them).
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
