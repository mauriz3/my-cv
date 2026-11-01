import { pointHeadToCanonical, socialImageMeta } from '~~/lib/socialMeta'

const SCHEMA_ORG_CONTEXT = 'https://schema.org'
/** Evita que un texto de los datos cierre el `<script>` del JSON-LD. */
const HTML_UNSAFE_CHARACTERS = /</g

interface PageSeoOptions {
  /** Ruta (con idioma) de la página canónica si esta la duplica: canonical y `og:url` apuntan allí, sin hreflang. */
  canonicalPath?: () => string
}

/**
 * Meta descripción, Open Graph, Twitter y JSON-LD (Person) a partir de los datos del CV.
 * `og:url` y `og:locale` salen de `useLocaleHead`, igual que canonical y hreflang: misma URL absoluta.
 */
export function usePageSeo(pageTitle: () => string, { canonicalPath }: PageSeoOptions = {}) {
  const cv = useCv()
  const { t } = useI18n()
  const localeHead = useLocaleHead({ seo: true })
  // Misma base que i18n (dominio real o la URL del despliegue de Netlify).
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
