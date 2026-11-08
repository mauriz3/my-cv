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
  /** Each test mounts its page and unmounts after so <head> does not leak into the next. */
  async function mountPage(...args: Parameters<typeof usePageSeo>) {
    mounted = (await withSetup(() => usePageSeo(...args))).wrapper
  }

  afterEach(() => mounted?.unmount())

  it('sets title, description, Open Graph, Twitter, and Person JSON-LD', async () => {
    const cv = getCv('en')
    await mountPage(() => 'Test page')
    await waitForHead(() => document.title === 'Test page')

    expect(document.title).toBe('Test page')
    expect(head().querySelectorAll('link[hreflang]').length).toBeGreaterThan(0)
    expect(metaContent('name="description"')).toBe(cv.motivation)
    expect(metaContent('property="og:title"')).toBe('Test page')
    expect(metaContent('property="og:type"')).toBe('profile')
    expect(metaContent('property="og:image"')).toContain(SOCIAL_IMAGE.path)
    expect(metaContent('name="twitter:card"')).toBe('summary_large_image')

    const jsonLd = JSON.parse(head().querySelector('script[type="application/ld+json"]')!.textContent!)
    expect(jsonLd).toMatchObject({ '@type': 'Person', name: cv.fullName, jobTitle: cv.headline })
    expect(jsonLd.sameAs).toEqual(cv.contactLinks.map((link) => link.url))
  })

  it('with canonicalPath, canonical and og:url point to canonical page and hreflang is omitted', async () => {
    await mountPage(() => 'Short link', { canonicalPath: () => '/en/' })
    await waitForHead(() => document.title === 'Short link')
    const canonical = head().querySelector('link[rel="canonical"]')?.getAttribute('href')
    expect(canonical).toMatch(/\/en\/$/)
    expect(metaContent('property="og:url"') ?? canonical).toBe(canonical)
    expect(head().querySelectorAll('link[hreflang]')).toHaveLength(0)
  })
})
