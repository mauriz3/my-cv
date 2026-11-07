import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { THEME_STORAGE_KEY } from '../../lib/theme'

/** Falla con violaciones de este impacto o mayor; las moderate/minor solo se listan en el informe. */
const BLOCKING_IMPACTS = new Set(['serious', 'critical'])
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const THEMES = ['dark', 'light'] as const
const PAGES = ['/en/', '/es/', '/en/visits', '/en/privacy']
/** Enlace corto de Libros: página mínima que salta en cliente a la sección del Perfil. */
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
  test.describe(`axe · tema ${theme}`, () => {
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

    test(`${BOOKS_SHORT_LINK} → destino`, async ({ page }) => {
      await page.goto(BOOKS_SHORT_LINK)
      await page.waitForURL(BOOKS_DESTINATION)
      await page.waitForLoadState('networkidle')
      await expectNoBlockingViolations(page)
    })
  })
}

/** Quita solo el salto (meta refresh y script con `location.replace`) para auditar la propia página mínima. */
function withoutClientRedirect(html: string) {
  return html.replace(/<meta http-equiv="refresh"[^>]*>/, '').replace(/<script[^>]*>[^<]*location\.replace[^<]*<\/script>/, '')
}

test(`axe · página mínima de ${BOOKS_SHORT_LINK} (sin el salto)`, async ({ page }) => {
  await page.route(BOOKS_SHORT_LINK, async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, body: withoutClientRedirect(await response.text()) })
  })
  await page.goto(BOOKS_SHORT_LINK)
  await expect(page.locator('main a')).toHaveAttribute('href', BOOKS_DESTINATION)
  await expectNoBlockingViolations(page)
})
