import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { getCv } from '~~/data/cv'
import { SOCIAL_IMAGE } from '~~/lib/socialMeta'
import { withSetup } from './helpers'

const head = () => document.head
const metaContent = (selector: string) => head().querySelector(`meta[${selector}]`)?.getAttribute('content')

async function waitForHead(condition: () => boolean) {
  for (let attempt = 0; attempt < 50 && !condition(); attempt++) await new Promise((resolve) => setTimeout(resolve, 10))
}

describe('usePageSeo', () => {
  let mounted: VueWrapper | undefined
  /** Cada test monta su página y la desmonta al acabar: así su <head> no se mezcla con el del siguiente. */
  async function mountPage(...args: Parameters<typeof usePageSeo>) {
    mounted = (await withSetup(() => usePageSeo(...args))).wrapper
  }

  afterEach(() => mounted?.unmount())

  it('pone título, descripción, Open Graph, Twitter y JSON-LD de la persona', async () => {
    const cv = getCv('en')
    await mountPage(() => 'Página de prueba')
    await waitForHead(() => document.title === 'Página de prueba')

    expect(document.title).toBe('Página de prueba')
    expect(head().querySelectorAll('link[hreflang]').length).toBeGreaterThan(0)
    expect(metaContent('name="description"')).toBe(cv.motivation)
    expect(metaContent('property="og:title"')).toBe('Página de prueba')
    expect(metaContent('property="og:type"')).toBe('profile')
    expect(metaContent('property="og:image"')).toContain(SOCIAL_IMAGE.path)
    expect(metaContent('name="twitter:card"')).toBe('summary_large_image')

    const jsonLd = JSON.parse(head().querySelector('script[type="application/ld+json"]')!.textContent!)
    expect(jsonLd).toMatchObject({ '@type': 'Person', name: cv.fullName, jobTitle: cv.headline })
    expect(jsonLd.sameAs).toEqual(cv.contactLinks.map((link) => link.url))
  })

  it('con canonicalPath, canonical y og:url apuntan a la página canónica y no hay hreflang', async () => {
    await mountPage(() => 'Enlace corto', { canonicalPath: () => '/en/' })
    await waitForHead(() => document.title === 'Enlace corto')
    const canonical = head().querySelector('link[rel="canonical"]')?.getAttribute('href')
    expect(canonical).toMatch(/\/en\/$/)
    expect(metaContent('property="og:url"') ?? canonical).toBe(canonical)
    expect(head().querySelectorAll('link[hreflang]')).toHaveLength(0)
  })
})
