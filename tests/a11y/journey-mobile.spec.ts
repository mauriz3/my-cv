import { expect, test, type Page } from '@playwright/test'

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
