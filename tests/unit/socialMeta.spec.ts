import { describe, expect, it } from 'vitest'
import { absoluteUrl, SITE_ORIGIN, SOCIAL_IMAGE, socialImageMeta } from '../../lib/socialMeta'

describe('absoluteUrl', () => {
  it('resuelve rutas contra el dominio de producción', () => {
    expect(absoluteUrl('/og-cv.png')).toBe('https://www.mauriziorendon.com/og-cv.png')
    expect(absoluteUrl('/es/visits')).toBe(`${SITE_ORIGIN}/es/visits`)
  })

  it('acepta otro origen', () => {
    expect(absoluteUrl('/en', 'https://deploy-preview-1--x.netlify.app')).toBe('https://deploy-preview-1--x.netlify.app/en')
  })
})

describe('socialImageMeta', () => {
  it('da imagen absoluta 1200×630 PNG con el mismo texto alternativo en Open Graph y Twitter', () => {
    const meta = socialImageMeta('Texto alternativo')
    expect(meta).toEqual({
      ogImage: 'https://www.mauriziorendon.com/og-cv.png',
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageType: 'image/png',
      ogImageAlt: 'Texto alternativo',
      twitterCard: 'summary_large_image',
      twitterImage: 'https://www.mauriziorendon.com/og-cv.png',
      twitterImageAlt: 'Texto alternativo'
    })
    expect(SOCIAL_IMAGE.width / SOCIAL_IMAGE.height).toBeCloseTo(1.905, 2)
  })
})
