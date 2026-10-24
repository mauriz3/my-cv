const SCHEMA_ORG_CONTEXT = 'https://schema.org'
/** Evita que un texto de los datos cierre el `<script>` del JSON-LD. */
const HTML_UNSAFE_CHARACTERS = /</g

/** Meta descripción, Open Graph y JSON-LD (Person) a partir de los datos del CV. */
export function usePageSeo(pageTitle: () => string) {
  const cv = useCv()
  const localeHead = useLocaleHead({ seo: true })

  const personJsonLd = computed(() =>
    JSON.stringify({
      '@context': SCHEMA_ORG_CONTEXT,
      '@type': 'Person',
      name: cv.value.fullName,
      jobTitle: cv.value.headline,
      description: cv.value.motivation,
      inLanguage: cv.value.locale,
      sameAs: cv.value.contactLinks.map((link) => link.url)
    }).replace(HTML_UNSAFE_CHARACTERS, '\\u003c')
  )

  useHead(() => ({
    title: pageTitle(),
    htmlAttrs: { lang: localeHead.value.htmlAttrs?.lang },
    link: localeHead.value.link,
    script: [{ type: 'application/ld+json', innerHTML: personJsonLd.value }]
  }))

  useSeoMeta({
    description: () => cv.value.motivation,
    ogTitle: pageTitle,
    ogDescription: () => cv.value.motivation,
    ogType: 'profile',
    twitterCard: 'summary'
  })
}
