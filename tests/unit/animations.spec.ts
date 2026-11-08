import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  ANIMATIONS_NO_FLASH_SCRIPT,
  ANIMATIONS_STORAGE_KEY,
  CHART_VISIBLE_RATIO,
  PULSE_ANIMATION,
  PULSE_CYCLE_MS,
  PULSE_DELAY_MS,
  PULSE_HALO_ANIMATION,
  PULSE_HALO_SCALE,
  PULSE_ITERATIONS,
  PULSE_SCALE,
  SCENE_CATCH_UP_MS,
  catchUpShown,
  intersectionRatio,
  isEffectiveOn,
  meetsVisibility,
  parseStoredAnimation,
  shouldPulse,
  shouldStopPulse,
} from '../../lib/animations'
import { MOTION_ATTRIBUTE } from '../../lib/motion'

describe('animation preference', () => {
  it('only accepts on or off', () => {
    expect(parseStoredAnimation('on')).toBe('on')
    expect(parseStoredAnimation('off')).toBe('off')
    expect(parseStoredAnimation('full')).toBeNull()
    expect(parseStoredAnimation('reduced')).toBeNull()
    expect(parseStoredAnimation(null)).toBeNull()
  })

  it('is on only with on and, when the system requests less motion, with a per-visit override', () => {
    expect(isEffectiveOn(null, false, false)).toBe(false)
    expect(isEffectiveOn('off', false, false)).toBe(false)
    expect(isEffectiveOn('on', false, false)).toBe(true)
    expect(isEffectiveOn('on', true, false)).toBe(false)
    expect(isEffectiveOn('on', true, true)).toBe(true)
    expect(isEffectiveOn('off', true, true)).toBe(false)
  })

  it('pulse only on first visible load, without a stored choice and without reduced-motion', () => {
    const ready = { stored: null, prefersReducedMotion: false, hintShown: false, visible: true }
    expect(shouldPulse(ready)).toBe(true)
    expect(shouldPulse({ ...ready, stored: 'off' })).toBe(false)
    expect(shouldPulse({ ...ready, stored: 'on' })).toBe(false)
    expect(shouldPulse({ ...ready, prefersReducedMotion: true })).toBe(false)
    expect(shouldPulse({ ...ready, hintShown: true })).toBe(false)
    expect(shouldPulse({ ...ready, visible: false })).toBe(false)
    expect(PULSE_CYCLE_MS * PULSE_ITERATIONS + PULSE_DELAY_MS).toBeLessThan(5000)
  })

  it('starts on mount and scale is perceptible on the 44px button', () => {
    const mobileButtonPx = 44
    const growth = mobileButtonPx * (PULSE_SCALE - 1)
    expect(PULSE_DELAY_MS).toBe(0)
    expect(PULSE_ITERATIONS).toBe(3)
    expect(growth).toBeGreaterThan(2)
    expect(growth).toBeLessThan(4)
    expect(PULSE_HALO_SCALE).toBeGreaterThan(PULSE_SCALE)
    expect(PULSE_HALO_SCALE).toBeLessThan(1.3)
  })

  it('stops on button press or focus, when the tab is hidden, or after 3 cycles', () => {
    const onButton = { onToggle: true }
    expect(shouldStopPulse({ type: 'pointerdown', ...onButton })).toBe(true)
    expect(shouldStopPulse({ type: 'click', ...onButton })).toBe(true)
    expect(shouldStopPulse({ type: 'focus', ...onButton })).toBe(true)
    expect(shouldStopPulse({ type: 'visibilitychange', onToggle: false, hidden: true })).toBe(true)
    expect(shouldStopPulse({ type: 'animationend', onToggle: true, animationName: PULSE_ANIMATION })).toBe(true)
    expect(shouldStopPulse({ type: 'animationend', onToggle: false, animationName: PULSE_HALO_ANIMATION })).toBe(true)
  })

  it('does not stop on scroll, keyboard, or touches or focus outside the button', () => {
    for (const type of ['wheel', 'touchmove', 'keydown', 'pointerenter', 'pointerdown', 'focus', 'click'] as const) {
      expect(shouldStopPulse({ type, onToggle: false })).toBe(false)
    }
    const onButton = { onToggle: true }
    expect(shouldStopPulse({ type: 'wheel', ...onButton })).toBe(false)
    expect(shouldStopPulse({ type: 'touchmove', ...onButton })).toBe(false)
    expect(shouldStopPulse({ type: 'keydown', ...onButton })).toBe(false)
    expect(shouldStopPulse({ type: 'pointerenter', ...onButton })).toBe(false)
    expect(shouldStopPulse({ type: 'visibilitychange', onToggle: false, hidden: false })).toBe(false)
    expect(shouldStopPulse({ type: 'visibilitychange', onToggle: false })).toBe(false)
    expect(shouldStopPulse({ type: 'animationend', ...onButton })).toBe(false)
    expect(shouldStopPulse({ type: 'animationend', ...onButton, animationName: 'other' })).toBe(false)
    expect(shouldStopPulse({ type: 'animationiteration', ...onButton, animationName: PULSE_ANIMATION })).toBe(false)
  })

  it('ring uses the same animation names as CSS and the CTA drawer', () => {
    const toggle = readFileSync(new URL('../../app/components/AnimationsToggle.vue', import.meta.url), 'utf8')
    const visits = readFileSync(new URL('../../app/components/JourneyVisits.vue', import.meta.url), 'utf8')
    const css = readFileSync(new URL('../../app/assets/css/main.css', import.meta.url), 'utf8')
    expect(toggle).toContain(`@keyframes ${PULSE_ANIMATION}`)
    expect(toggle).toContain(`@keyframes ${PULSE_HALO_ANIMATION}`)
    expect(toggle).toContain('border: var(--hint-ring-width) solid var(--ui-secondary)')
    expect(toggle).toContain('cta-halo')
    expect(visits).toContain('cta-halo')
    expect(visits).toContain('journey-visits-halo')
    expect(css).toContain('.cta-halo::after')
  })
})

describe('catch-up and visibility', () => {
  it('goes from 0 to pLive with easeOutCubic and does not move when pLive is 0', () => {
    expect(catchUpShown(0, 0.8)).toBe(0)
    expect(catchUpShown(SCENE_CATCH_UP_MS / 2, 0.8)).toBeCloseTo(0.8 * 0.875)
    expect(catchUpShown(SCENE_CATCH_UP_MS, 0.8)).toBeCloseTo(0.8)
    expect(catchUpShown(SCENE_CATCH_UP_MS * 2, 0.62)).toBeCloseTo(0.62)
    expect(catchUpShown(100, 0)).toBe(0)
    expect(catchUpShown(100, -1)).toBe(0)
  })

  it('measures visible fraction and requires intersection in addition to the threshold', () => {
    expect(intersectionRatio(100, 300, 800)).toBeCloseTo(200 / 200)
    expect(intersectionRatio(-100, 100, 800)).toBeCloseTo(0.5)
    expect(intersectionRatio(900, 1000, 800)).toBe(0)
    expect(intersectionRatio(0, 0, 800)).toBe(0)
    expect(intersectionRatio(0, 100, 0)).toBe(0)
    expect(meetsVisibility(0, 0)).toBe(false)
    expect(meetsVisibility(0.1, 0)).toBe(true)
    expect(meetsVisibility(0.2, CHART_VISIBLE_RATIO)).toBe(false)
    expect(meetsVisibility(CHART_VISIBLE_RATIO, CHART_VISIBLE_RATIO)).toBe(true)
  })
})

describe('pre-paint animations script', () => {
  function runScript({ stored = null as string | null, systemReduced = false, storageBlocked = false } = {}) {
    const attributes = new Map<string, string>()
    runInNewContext(ANIMATIONS_NO_FLASH_SCRIPT, {
      localStorage: {
        getItem: (key: string) => {
          if (storageBlocked) throw new Error('blocked')
          return key === ANIMATIONS_STORAGE_KEY ? stored : null
        },
      },
      matchMedia: () => ({ matches: systemReduced }),
      document: {
        documentElement: {
          setAttribute: (name: string, value: string) => attributes.set(name, value),
        },
      },
    })
    return attributes.get(MOTION_ATTRIBUTE)
  }

  it('starts static unless on is stored and reduced-motion is off', () => {
    expect(runScript()).toBe('reduced')
    expect(runScript({ stored: 'off' })).toBe('reduced')
    expect(runScript({ stored: 'full' })).toBe('reduced')
    expect(runScript({ stored: 'on', systemReduced: true })).toBe('reduced')
    expect(runScript({ stored: 'on' })).toBe('full')
  })

  it('with blocked localStorage does not throw and stays static', () => {
    expect(runScript({ storageBlocked: true })).toBe('reduced')
  })
})
