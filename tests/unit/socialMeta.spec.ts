import { describe, expect, it } from 'vitest'
import { absoluteUrl, pointHeadToCanonical, SITE_ORIGIN, SOCIAL_IMAGE, socialImageMeta } from '../../lib/socialMeta'

describe('absoluteUrl', () => {
  it('resolves paths against the production domain', () => {
    expect(absoluteUrl('/og-cv.png')).toBe('https://www.mauriziorendon.com/og-cv.png')
    expect(absoluteUrl('/es/visits')).toBe(`${SITE_ORIGIN}/es/visits`)
  })

  it('accepts another origin', () => {
    expect(absoluteUrl('/en', 'https://deploy-preview-1--x.netlify.app')).toBe('https://deploy-preview-1--x.netlify.app/en')
  })
})

describe('socialImageMeta', () => {
  it('yields absolute 1200×630 PNG with the same alt text on Open Graph and Twitter', () => {
    const meta = socialImageMeta('Alternative text')
    expect(meta).toEqual({
      ogImage: 'https://www.mauriziorendon.com/og-cv.png',
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageType: 'image/png',
      ogImageAlt: 'Alternative text',
      twitterCard: 'summary_large_image',
      twitterImage: 'https://www.mauriziorendon.com/og-cv.png',
      twitterImageAlt: 'Alternative text'
    })
    expect(SOCIAL_IMAGE.width / SOCIAL_IMAGE.height).toBeCloseTo(1.905, 2)
  })
})

describe('pointHeadToCanonical', () => {
  const head = {
    link: [
      { id: 'i18n-xd', rel: 'alternate', href: 'https://x.test/en/books', hreflang: 'x-default' },
      { id: 'i18n-alt-es', rel: 'alternate', href: 'https://x.test/es/libros', hreflang: 'es' },
      { id: 'i18n-can', rel: 'canonical', href: 'https://x.test/en/books' }
    ],
    meta: [
      { id: 'i18n-og-url', property: 'og:url', content: 'https://x.test/en/books' },
      { id: 'i18n-og', property: 'og:locale', content: 'en_GB' }
    ]
  }

  it('canonical and og:url point at the canonical page, no hreflang; og:locale unchanged', () => {
    expect(pointHeadToCanonical(head, 'https://x.test/en')).toEqual({
      link: [{ id: 'i18n-can', rel: 'canonical', href: 'https://x.test/en' }],
      meta: [
        { id: 'i18n-og-url', property: 'og:url', content: 'https://x.test/en' },
        { id: 'i18n-og', property: 'og:locale', content: 'en_GB' }
      ]
    })
  })

  it('accepts a head with no tags', () => {
    expect(pointHeadToCanonical({}, 'https://x.test/en')).toEqual({ link: [], meta: [] })
  })
})
