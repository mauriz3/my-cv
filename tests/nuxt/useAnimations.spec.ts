import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerPulseStop, startAnimationsSync, useAnimations } from '~/composables/useAnimations'
import { useReplayable } from '~/composables/useReplayable'
import { readDocumentMotion, startMotionSync, useMotion } from '~/composables/useMotion'
import { ANIMATIONS_STORAGE_KEY } from '~~/lib/animations'
import { MOTION_ATTRIBUTE, MOTION_STORAGE_KEY, SYSTEM_REDUCED_MOTION_QUERY } from '~~/lib/motion'
import { stubMatchMedia, withSetup } from './helpers'

describe('useAnimations', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    stubMatchMedia()
    startAnimationsSync()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('el botón enciende, guarda animations, borra motion y lo escribe en <html>', () => {
    const { motion, isReduced, effectiveOn, toggle } = useAnimations()
    expect(effectiveOn.value).toBe(false)
    expect(isReduced.value).toBe(true)

    toggle()
    expect(motion.value).toBe('full')
    expect(effectiveOn.value).toBe(true)
    expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe('on')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull()
    expect(document.documentElement.getAttribute(MOTION_ATTRIBUTE)).toBe('full')

    toggle()
    expect(motion.value).toBe('reduced')
    expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe('off')
  })

  it('ignora la clave antigua y, sin almacenamiento, el botón sigue funcionando', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'full')
    startAnimationsSync()
    expect(useAnimations().motion.value).toBe('reduced')

    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      useAnimations().toggle()
      expect(useAnimations().motion.value).toBe('full')
    } finally {
      Storage.prototype.setItem = setItem
    }
  })

  it('readDocumentMotion lee <html> y, sin atributo o con un valor raro, vale reduced', () => {
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE)
    expect(readDocumentMotion()).toBe('reduced')
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'full')
    expect(readDocumentMotion()).toBe('full')
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'raro')
    expect(readDocumentMotion()).toBe('reduced')
  })

  it('al cargar manda prefers-reduced-motion; un clic anima solo hasta recargar', () => {
    const media = stubMatchMedia({ [SYSTEM_REDUCED_MOTION_QUERY]: true })
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, 'on')
    startAnimationsSync()
    const animations = useAnimations()
    expect(animations.motion.value).toBe('reduced')
    expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe('on')

    animations.toggle()
    expect(animations.motion.value).toBe('full')
    expect(animations.override.value).toBe(true)

    startAnimationsSync()
    expect(useAnimations().motion.value).toBe('reduced')

    useAnimations().toggle()
    media.setMatches(SYSTEM_REDUCED_MOTION_QUERY, false)
    expect(useAnimations().motion.value).toBe('full')
    media.setMatches(SYSTEM_REDUCED_MOTION_QUERY, true)
    expect(useAnimations().motion.value).toBe('reduced')
    expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe('on')
  })

  it('otra pestaña sincroniza la elección y repetir el mismo estado no vuelve a reproducir', async () => {
    const plays = { count: 0 }
    await withSetup(() =>
      useReplayable({
        element: () => document.documentElement,
        threshold: 0,
        onEnter: 'skip',
        reset() {},
        play() {
          plays.count += 1
        },
        finish() {},
      }),
    )

    useAnimations().toggle()
    expect(plays.count).toBe(1)
    useAnimations().onPreferenceChange(false)
    expect(plays.count).toBe(1)

    window.dispatchEvent(new StorageEvent('storage', { key: ANIMATIONS_STORAGE_KEY, newValue: 'off' }))
    expect(useAnimations().motion.value).toBe('reduced')
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra', newValue: 'on' }))
    expect(useAnimations().motion.value).toBe('reduced')
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null }))
    expect(useAnimations().stored.value).toBeNull()
  })

  it('el clic cancela el pulso y un fallo al borrar la clave antigua no impide guardar', async () => {
    let stopped = false
    const { wrapper } = await withSetup(() => {
      registerPulseStop(() => {
        stopped = true
      })
    })
    useAnimations().toggle()
    expect(stopped).toBe(true)
    wrapper.unmount()

    const removeItem = Storage.prototype.removeItem
    Storage.prototype.removeItem = () => {
      throw new Error('blocked')
    }
    try {
      useAnimations().toggle()
      expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe('off')
    } finally {
      Storage.prototype.removeItem = removeItem
    }

    const getItem = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    try {
      startAnimationsSync()
      expect(useAnimations().motion.value).toBe('reduced')
    } finally {
      Storage.prototype.getItem = getItem
    }
  })

  it('useMotion expone el mismo estado', () => {
    const animations = useAnimations()
    const motion = useMotion()
    animations.set('full')
    expect(motion.motion.value).toBe('full')
    expect(motion.isReduced.value).toBe(false)
    motion.set('reduced')
    expect(animations.motion.value).toBe('reduced')
    startMotionSync()
    expect(motion.motion.value).toBe('reduced')
  })
})
