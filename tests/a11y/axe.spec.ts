import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { THEME_STORAGE_KEY } from '../../lib/theme'

/** Fails on violations at this impact or higher; moderate/minor are only listed in the report. */
const BLOCKING_IMPACTS = new Set(['serious', 'critical'])
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const THEMES = ['dark', 'light'] as const
const PAGES = ['/en/', '/es/', '/en/visits', '/en/privacy']
/** Books short link: minimal page that client-redirects to the Profile section. */
const BOOKS_SHORT_LINK = '/en/books'
const BOOKS_DESTINATION = /\/en\/#books$/

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

/** Strips only the redirect (meta refresh and script with `location.replace`) to audit the minimal page itself. */
function withoutClientRedirect(html: string) {
  return html.replace(/<meta http-equiv="refresh"[^>]*>/, '').replace(/<script[^>]*>[^<]*location\.replace[^<]*<\/script>/, '')
}

test(`axe · ${BOOKS_SHORT_LINK} minimal page (without redirect)`, async ({ page }) => {
  await page.route(BOOKS_SHORT_LINK, async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, body: withoutClientRedirect(await response.text()) })
  })
  await page.goto(BOOKS_SHORT_LINK)
  await expect(page.locator('main a')).toHaveAttribute('href', BOOKS_DESTINATION)
  await expectNoBlockingViolations(page)
})
