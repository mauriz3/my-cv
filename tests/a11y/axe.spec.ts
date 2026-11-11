import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ANALYTICS_CSP_SOURCES } from '../../lib/analytics'
import { THEME_STORAGE_KEY } from '../../lib/theme'

/** Fails on violations at this impact or higher; moderate/minor are only listed in the report. */
const BLOCKING_IMPACTS = new Set(['serious', 'critical'])
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const THEMES = ['dark', 'light'] as const
const PAGES = ['/en/', '/es/', '/en/visits', '/en/privacy']
/** Books short link: minimal page that client-redirects to the Profile section. */
const BOOKS_SHORT_LINK = '/en/books'
const BOOKS_DESTINATION = /\/en\/#books$/

/** Measurement domains (`https://*.google-analytics.com` → `google-analytics.com`). */
const MEASUREMENT_DOMAINS = ANALYTICS_CSP_SOURCES['connect-src'].map((source) => new URL(source.replace('*.', '')).hostname)
const isMeasurementRequest = (url: URL) =>
  MEASUREMENT_DOMAINS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))

/** The production artifact carries gtag: CI never sends real hits to Google Analytics. */
test.beforeEach(async ({ context }) => {
  await context.route(isMeasurementRequest, (route) => route.abort('blockedbyclient'))
})

async function expectNoBlockingViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  for (const violation of violations) {
    const targets = violation.nodes.map((node) => node.target.join(' ')).join(' | ')
    console.log(`[${violation.impact}] ${violation.id}: ${violation.help} → ${targets}`)
  }
  const blocking = violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''))
  expect(blocking.map((violation) => `${violation.id} (${violation.nodes.length})`)).toEqual([])
}

for (const theme of THEMES) {
  test.describe(`axe · ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: THEME_STORAGE_KEY, value: theme })
    })

    for (const path of PAGES) {
      test(path, async ({ page }) => {
        await page.goto(path, { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/)
        await expectNoBlockingViolations(page)
      })
    }

    test(`${BOOKS_SHORT_LINK} → destination`, async ({ page }) => {
      await page.goto(BOOKS_SHORT_LINK)
      await page.waitForURL(BOOKS_DESTINATION)
      await page.waitForLoadState('networkidle')
      await expectNoBlockingViolations(page)
    })
  })
}

/** Audit the short-link page itself: drop the meta refresh and `location.replace` script in the DOM, not with HTML regex. */
test(`axe · ${BOOKS_SHORT_LINK} minimal page (without redirect)`, async ({ page }) => {
  // Stay on this document if a leftover redirect script still runs.
  await page.addInitScript(() => {
    Location.prototype.replace = function replace() {}
  })

  const response = await page.request.get(BOOKS_SHORT_LINK)
  expect(response.ok()).toBe(true)

  const withoutRedirect = await page.evaluate((html) => {
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    for (const meta of parsed.querySelectorAll('meta[http-equiv="refresh" i]')) {
      meta.remove()
    }
    for (const script of [...parsed.querySelectorAll('script')]) {
      if (script.textContent?.includes('location.replace')) script.remove()
    }
    return `<!DOCTYPE html>${parsed.documentElement.outerHTML}`
  }, await response.text())

  await page.route(BOOKS_SHORT_LINK, async (route) => {
    await route.fulfill({
      status: response.status(),
      contentType: 'text/html; charset=utf-8',
      body: withoutRedirect
    })
  })

  await page.goto(BOOKS_SHORT_LINK, { waitUntil: 'networkidle' })
  await expect(page.locator('main a')).toHaveAttribute('href', BOOKS_DESTINATION)
  await expectNoBlockingViolations(page)
})
