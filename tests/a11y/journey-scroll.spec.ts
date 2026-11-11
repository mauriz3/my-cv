import { expect, test, type Locator, type Page } from '@playwright/test'
import { JOURNEY_POINTS, MOBILE_TIMELINE, PINNED_TIMELINE, readingProgressOf } from '../../lib/journey'

const VIEWPORTS = [
  { width: 375, height: 812 }, { width: 390, height: 844 },
  { width: 768, height: 1024 }, { width: 1920, height: 1080 },
]
const GESTURE_DISTANCE = 160
const TOUCH_STEPS = 8
const TOUCH_STEP_MS = 20
const MOBILE_NAV_HEIGHT = 64

async function openJourney(page: Page, locale: string, animated: boolean) {
  await page.addInitScript((value) => localStorage.setItem('animations', value), animated ? 'on' : 'off')
  await page.goto(`/${locale}/`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const reject = page.getByRole('button', { name: locale === 'en' ? 'Reject' : 'Rechazar', exact: true })
  if (await reject.isVisible()) await reject.click()
}

async function seek(page: Page, progress: number) {
  await page.locator('.journey').evaluate((element, value) => {
    const section = element as HTMLElement
    scrollTo({ top: section.getBoundingClientRect().top + scrollY + value * (section.offsetHeight - innerHeight), behavior: 'instant' })
  }, progress)
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}

async function scrollSnapshot(page: Page) {
  return page.locator('.journey').evaluate((element) => {
    const section = element as HTMLElement
    return { y: scrollY, progress: -section.getBoundingClientRect().top / (section.offsetHeight - innerHeight) }
  })
}

async function frame(page: Page) {
  return page.locator('.journey').evaluate((element) => {
    const style = getComputedStyle(element)
    return ['--journey-position', '--holo-scale', '--arm-right', '--arm-left'].map((name) => style.getPropertyValue(name)).join('|')
  })
}

/** Intersect the article with the viewport, clear of the fixed navigation. */
async function gesturePoint(page: Page, target: Locator) {
  const box = await target.boundingBox()
  const viewport = page.viewportSize()!
  if (!box) throw new Error('Gesture target must be rendered')
  const bottom = Math.min(box.y + box.height - 12, viewport.height - MOBILE_NAV_HEIGHT - 12)
  const top = Math.max(box.y + 12, 12)
  expect(bottom - top, 'enough visible card for a touch swipe').toBeGreaterThan(GESTURE_DISTANCE)
  return { x: Math.max(12, Math.min(viewport.width - 12, box.x + box.width / 2)), y: bottom }
}

async function assertGestureAdvances(page: Page, target: Locator, touch: boolean) {
  const point = await gesturePoint(page, target)
  const before = await scrollSnapshot(page)
  if (touch) {
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    for (let step = 1; step <= TOUCH_STEPS; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: point.x, y: point.y - GESTURE_DISTANCE * step / TOUCH_STEPS }],
      })
      await page.waitForTimeout(TOUCH_STEP_MS)
    }
    // Hold the last position before release so a synthetic fling cannot race the next seek.
    await page.waitForTimeout(120)
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await session.detach()
  } else {
    await page.mouse.move(point.x, point.y)
    await page.mouse.wheel(0, GESTURE_DISTANCE)
  }
  await expect.poll(async () => (await scrollSnapshot(page)).y).toBeGreaterThan(before.y + 10)
  expect((await scrollSnapshot(page)).progress).toBeGreaterThan(before.progress)
  // Wait for scrollend (with an idle fallback) before programmatically resetting the reading point.
  await page.evaluate(() => new Promise<void>((resolve) => {
    let timer = setTimeout(finish, 120)
    function finish() {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('scrollend', finish)
      resolve()
    }
    function onScroll() {
      clearTimeout(timer)
      timer = setTimeout(finish, 120)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scrollend', finish, { once: true })
  }))
}

for (const viewport of VIEWPORTS) {
  const mobile = viewport.width < 768
  const touch = viewport.width < 1280
  test.describe(`journey scroll at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, isMobile: touch, hasTouch: touch, reducedMotion: 'no-preference' })
    for (const locale of ['en']) {
      test(`${locale}: wheel${touch ? ' and touch' : ''} over every card advances the journey`, async ({ page }) => {
        await openJourney(page, locale, true)
        const journey = page.locator('.journey')
        await expect(page.locator('.journey__stage')).toHaveCSS('position', 'sticky')
        if (mobile) await expect(journey).not.toHaveAttribute('data-cards-fit', 'false')
        const timeline = mobile ? MOBILE_TIMELINE : PINNED_TIMELINE
        for (const [index, point] of JOURNEY_POINTS.entries()) {
          const card = page.locator(`.journey__card[data-point-index="${index}"]`)
          for (const useTouch of touch ? [false, true] : [false]) {
            await seek(page, readingProgressOf(index, timeline))
            await expect(journey).toHaveAttribute('data-point', point.id)
            await expect(card).toHaveCSS('opacity', '1')
            await assertGestureAdvances(page, card.locator('article'), useTouch)
          }
        }
        // Resting cards intentionally hold their pose. Gestures near a handoff must move the hologram too.
        for (const useTouch of touch ? [false, true] : [false]) {
          await seek(page, 0.16)
          await expect.poll(() => frame(page)).not.toBe('|||')
          const before = await frame(page)
          await assertGestureAdvances(page, page.locator('.journey__stage'), useTouch)
          await expect.poll(() => frame(page)).not.toBe(before)
        }
      })
    }
  })
}

test.describe('journey with animations off', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
  for (const locale of ['en']) {
    test(`${locale}: every card stays visible and scrollable`, async ({ page }) => {
      await openJourney(page, locale, false)
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
      for (const card of await page.locator('.journey__card').all()) {
        await expect(card).toHaveCSS('opacity', '1')
        await card.scrollIntoViewIfNeeded()
        await assertGestureAdvances(page, card.locator('article'), false)
        await card.scrollIntoViewIfNeeded()
        await assertGestureAdvances(page, card.locator('article'), true)
      }
      for (const label of await page.locator('.journey-card__header > p:first-child').all()) await expect(label).toBeVisible()
    })
  }
})
