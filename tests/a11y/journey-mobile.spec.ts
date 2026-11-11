import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { JOURNEY_POINTS, MOBILE_TIMELINE, readingProgressOf } from '../../lib/journey'
import { THEME_STORAGE_KEY } from '../../lib/theme'

const VIEWPORT = { width: 390, height: 844 }
const PROFILE_PROGRESS = 0.16
const SWIPE_DISTANCE = 160
const SWIPE_STEPS = 12
const SWIPE_STEP_MS = 20

async function swipeUpOnProfile(page: Page) {
  const article = page.locator('.journey__card[data-point-index="0"] > article')
  const box = await article.boundingBox()
  if (!box) throw new Error('Profile card must be visible')
  const x = box.x + box.width / 2
  const startY = box.y + box.height - 12
  const session = await page.context().newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] })
  for (let step = 1; step <= SWIPE_STEPS; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: startY - SWIPE_DISTANCE * step / SWIPE_STEPS }],
    })
    await page.waitForTimeout(SWIPE_STEP_MS)
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await session.detach()
}

test.describe('mobile journey touch scrolling', () => {
  test.use({ viewport: VIEWPORT, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' })

  for (const locale of ['en', 'es']) {
    for (const overflowing of [false, true]) {
      test(`${locale}: profile swipe advances the journey ${overflowing ? 'at the inner scroll boundary' : 'when content fits'}`, async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('animations', 'on'))
        await page.goto(`/${locale}/`, { waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        const journey = page.locator('.journey')
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'full')
        await expect(journey).not.toHaveAttribute('data-cards-fit', 'false')
        await expect(page.locator('.journey__stage')).toHaveCSS('position', 'sticky')
        await journey.evaluate((element, progress) => {
          window.scrollTo({
            top: element.getBoundingClientRect().top + window.scrollY + progress * ((element as HTMLElement).offsetHeight - window.innerHeight),
            behavior: 'instant',
          })
        }, PROFILE_PROGRESS)
        const article = page.locator('.journey__card[data-point-index="0"] > article')
        if (overflowing) {
          await article.evaluate((element) => {
            const card = element as HTMLElement
            card.style.maxHeight = '260px'
            card.scrollTop = card.scrollHeight
          })
        }
        await page.waitForTimeout(100)
        const before = await page.evaluate(() => window.scrollY)
        await swipeUpOnProfile(page)
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 50)
      })
    }
  }
})

const PHONE_VIEWPORTS = [{ width: 375, height: 812 }, VIEWPORT]

async function openAnimatedJourney(page: Page, locale: string) {
  await page.addInitScript(() => localStorage.setItem('animations', 'on'))
  await page.goto(`/${locale}/`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const reject = page.getByRole('button', { name: locale === 'en' ? 'Reject' : 'Rechazar', exact: true })
  if (await reject.isVisible()) await reject.click()
}

async function scrollToProgress(page: Page, progress: number) {
  await page.locator('.journey').evaluate((element, value) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY + value * ((element as HTMLElement).offsetHeight - window.innerHeight),
      behavior: 'instant',
    })
  }, progress)
}

async function hologramFrame(page: Page) {
  return page.locator('.journey').evaluate((element) => {
    const style = getComputedStyle(element)
    return ['--arm-right', '--arm-left', '--holo-scale'].map((name) => style.getPropertyValue(name)).join('|')
  })
}

test.describe('mobile journey height budget', () => {
  test.use({ isMobile: true, hasTouch: true, reducedMotion: 'no-preference' })

  for (const viewport of PHONE_VIEWPORTS) {
    for (const locale of ['en']) {
      test(`${locale}: all six cards fit at ${viewport.width}×${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await openAnimatedJourney(page, locale)
        const journey = page.locator('.journey')
        await expect(journey).not.toHaveAttribute('data-cards-fit', 'false')
        await expect(page.locator('.journey__stage')).toHaveCSS('position', 'sticky')
        await expect(page.locator('.journey-scene[data-scene="profile"]')).toBeVisible()
        for (const label of await page.locator('.journey-card__header > p:first-child').all()) {
          if (viewport.height <= 700) await expect(label).toHaveCSS('display', 'none')
          else await expect(label).toBeVisible()
        }

        for (const [index, point] of JOURNEY_POINTS.entries()) {
          await scrollToProgress(page, readingProgressOf(index, MOBILE_TIMELINE))
          await expect(journey).toHaveAttribute('data-point', point.id)
          await expect(journey).toHaveAttribute('data-phase', 'read')
          const card = page.locator(`.journey__card[data-point-index="${index}"]`)
          await expect(card).toHaveAttribute('data-state', 'current')
          await expect(card).toHaveCSS('opacity', '1')
          const geometry = await card.evaluate((element) => {
            const article = element.querySelector('article')!
            const zone = element.parentElement!
            const box = article.getBoundingClientRect()
            const stage = element.closest('.journey__stage')!.getBoundingClientRect()
            return {
              height: (element as HTMLElement).offsetHeight,
              available: zone.clientHeight,
              client: article.clientHeight,
              scroll: article.scrollHeight,
              top: box.top,
              bottom: box.bottom,
              stageBottom: stage.bottom,
            }
          })
          expect(geometry.height, point.id).toBeLessThanOrEqual(geometry.available)
          expect(geometry.scroll, `${point.id}: no clipped or internally scrolling content`).toBeLessThanOrEqual(geometry.client)
          expect(geometry.top).toBeGreaterThanOrEqual(0)
          expect(geometry.bottom).toBeLessThanOrEqual(geometry.stageBottom)
          for (const link of await card.locator('a').all()) {
            const box = await link.boundingBox()
            expect(box?.height, `${point.id}: tap target height`).toBeGreaterThanOrEqual(44)
            expect(box?.width, `${point.id}: tap target width`).toBeGreaterThanOrEqual(44)
          }
        }

        await scrollToProgress(page, PROFILE_PROGRESS)
        await expect(journey).toHaveAttribute('data-point', 'profile')
        const frameBefore = await hologramFrame(page)
        const scrollBefore = await page.evaluate(() => window.scrollY)
        await swipeUpOnProfile(page)
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore + 50)
        await expect.poll(() => hologramFrame(page)).not.toBe(frameBefore)
        expect(errors).toEqual([])
      })
    }
  }

  for (const viewport of [{ width: 375, height: 812 }]) {
    test(`animations off restore section labels at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/en/', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
      for (const label of await page.locator('.journey-card__header > p:first-child').all()) await expect(label).toBeVisible()
      await expect(page.locator('.journey-scene[data-scene="profile"]')).toBeVisible()
      await expect(page.locator('.journey__stage')).not.toHaveCSS('position', 'sticky')
    })

    test(`static fallback restores section labels at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await openAnimatedJourney(page, 'en')
      await page.locator('.journey').evaluate((element) => element.setAttribute('data-cards-fit', 'false'))
      for (const label of await page.locator('.journey-card__header > p:first-child').all()) await expect(label).toBeVisible()
      await expect(page.locator('.journey-scene[data-scene="profile"]')).toBeVisible()
      await expect(page.locator('.journey__stage')).not.toHaveCSS('position', 'sticky')
    })
  }

  for (const theme of ['dark', 'light']) {
    test(`short phone accessibility in ${theme} theme`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: THEME_STORAGE_KEY, value: theme })
      await openAnimatedJourney(page, 'en')
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/)
      for (const index of [0, 3]) {
        await scrollToProgress(page, readingProgressOf(index, MOBILE_TIMELINE))
        await expect(page.locator('.journey')).toHaveAttribute('data-point', JOURNEY_POINTS[index]!.id)
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
        expect(violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')).map((item) => item.id)).toEqual([])
      }
    })
  }
})
