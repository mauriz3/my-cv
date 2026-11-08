import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  ANIMATIONS_NO_FLASH_SCRIPT,
  ANIMATIONS_STORAGE_KEY,
  CHART_VISIBLE_RATIO,
  PULSE_CYCLE_MS,
  PULSE_DELAY_MS,
  PULSE_ITERATIONS,
  SCENE_CATCH_UP_MS,
  catchUpShown,
  intersectionRatio,
  isEffectiveOn,
  meetsVisibility,
  parseStoredAnimation,
  shouldPulse,
} from '../../lib/animations'
import { MOTION_ATTRIBUTE } from '../../lib/motion'

describe('elección de animaciones', () => {
  it('solo acepta on u off', () => {
    expect(parseStoredAnimation('on')).toBe('on')
    expect(parseStoredAnimation('off')).toBe('off')
    expect(parseStoredAnimation('full')).toBeNull()
    expect(parseStoredAnimation('reduced')).toBeNull()
    expect(parseStoredAnimation(null)).toBeNull()
  })

  it('está encendida solo con on y, si el sistema pide menos movimiento, con un override de esta visita', () => {
    expect(isEffectiveOn(null, false, false)).toBe(false)
    expect(isEffectiveOn('off', false, false)).toBe(false)
    expect(isEffectiveOn('on', false, false)).toBe(true)
    expect(isEffectiveOn('on', true, false)).toBe(false)
    expect(isEffectiveOn('on', true, true)).toBe(true)
    expect(isEffectiveOn('off', true, true)).toBe(false)
  })

  it('el pulso solo sale en la primera carga visible, sin elección y sin reduced-motion', () => {
    const ready = { stored: null, prefersReducedMotion: false, hintShown: false, visible: true }
    expect(shouldPulse(ready)).toBe(true)
    expect(shouldPulse({ ...ready, stored: 'off' })).toBe(false)
    expect(shouldPulse({ ...ready, stored: 'on' })).toBe(false)
    expect(shouldPulse({ ...ready, prefersReducedMotion: true })).toBe(false)
    expect(shouldPulse({ ...ready, hintShown: true })).toBe(false)
    expect(shouldPulse({ ...ready, visible: false })).toBe(false)
    expect(PULSE_CYCLE_MS * PULSE_ITERATIONS + PULSE_DELAY_MS).toBeLessThan(5000)
  })
})

describe('catch-up y visibilidad', () => {
  it('va de 0 a pLive con easeOutCubic y no se mueve si pLive es 0', () => {
    expect(catchUpShown(0, 0.8)).toBe(0)
    expect(catchUpShown(SCENE_CATCH_UP_MS / 2, 0.8)).toBeCloseTo(0.8 * 0.875)
    expect(catchUpShown(SCENE_CATCH_UP_MS, 0.8)).toBeCloseTo(0.8)
    expect(catchUpShown(SCENE_CATCH_UP_MS * 2, 0.62)).toBeCloseTo(0.62)
    expect(catchUpShown(100, 0)).toBe(0)
    expect(catchUpShown(100, -1)).toBe(0)
  })

  it('mide la fracción visible y exige intersección además del umbral', () => {
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

describe('script de animaciones anterior al pintado', () => {
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

  it('arranca estático salvo on guardado y sin reduced-motion', () => {
    expect(runScript()).toBe('reduced')
    expect(runScript({ stored: 'off' })).toBe('reduced')
    expect(runScript({ stored: 'full' })).toBe('reduced')
    expect(runScript({ stored: 'on', systemReduced: true })).toBe('reduced')
    expect(runScript({ stored: 'on' })).toBe('full')
  })

  it('con localStorage bloqueado no falla y queda estático', () => {
    expect(runScript({ storageBlocked: true })).toBe('reduced')
  })
})
