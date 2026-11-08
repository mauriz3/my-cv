import { pointHeadToCanonical, socialImageMeta } from '~~/lib/socialMeta'

const SCHEMA_ORG_CONTEXT = 'https://schema.org'
/** Escapes CV copy so it cannot close the JSON-LD `<script>` tag. */
const HTML_UNSAFE_CHARACTERS = /</g

interface PageSeoOptions {
  /** Path (with language) of the canonical page if it duplicates it: canonical and `og:url` point there, without hreflang. */
  canonicalPath?: () => string
}

/**
 * Meta description, Open Graph, Twitter and JSON-LD (Person) from the CV data.
 * `og:url` y `og:locale` salen de `useLocaleHead`, igual que canonical y hreflang: misma URL absoluta.
 */
export function usePageSeo(pageTitle: () => string, { canonicalPath }: PageSeoOptions = {}) {
  const cv = useCv()
  const { t } = useI18n()
  const localeHead = useLocaleHead({ seo: true })
  // Same basis as i18n (actual domain or Netlify deployment URL).
  const { baseUrl } = useRuntimeConfig().public.i18n

  const headTags = computed(() =>
    canonicalPath ? pointHeadToCanonical(localeHead.value, new URL(canonicalPath(), baseUrl).href) : localeHead.value
  )

  const personJsonLd = computed(() =>
    JSON.stringify({
      '@context': SCHEMA_ORG_CONTEXT,
      '@type': 'Person',
      name: cv.value.fullName,
      jobTitle: cv.value.headline,
      description: cv.value.motivation,
      inLanguage: cv.value.locale,
      knowsAbout: cv.value.skillAreas.flatMap((area) => area.skills),
      sameAs: cv.value.contactLinks.map((link) => link.url)
    }).replace(HTML_UNSAFE_CHARACTERS, '\\u003c')
  )

  useHead(() => ({
    title: pageTitle(),
    htmlAttrs: { lang: localeHead.value.htmlAttrs?.lang },
    link: headTags.value.link,
    meta: headTags.value.meta,
    script: [{ type: 'application/ld+json', innerHTML: personJsonLd.value }]
  }))

  useSeoMeta({
    description: () => cv.value.motivation,
    ogTitle: pageTitle,
    ogDescription: () => cv.value.motivation,
    ogType: 'profile',
    ...socialImageMeta(t('seo.imageAlt'))
  })
}
