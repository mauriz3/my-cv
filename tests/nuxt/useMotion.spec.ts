import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MOTION_ATTRIBUTE, MOTION_STORAGE_KEY, SYSTEM_REDUCED_MOTION_QUERY } from '~~/lib/motion'
import { stubMatchMedia } from './helpers'

describe('useMotion', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE)
    useMotion().set('full')
  })

  afterEach(() => localStorage.clear())

  it('el botón alterna, guarda la elección y la escribe en <html data-motion>', () => {
    const { motion, isReduced, toggle } = useMotion()
    toggle()
    expect(motion.value).toBe('reduced')
    expect(isReduced.value).toBe(true)
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduced')
    expect(document.documentElement.getAttribute(MOTION_ATTRIBUTE)).toBe('reduced')
    toggle()
    expect(motion.value).toBe('full')
  })

  it('sin almacenamiento disponible el botón sigue funcionando', () => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      useMotion().toggle()
      expect(useMotion().motion.value).toBe('reduced')
    } finally {
      Storage.prototype.setItem = setItem
    }
  })

  it('readDocumentMotion lee <html> y, sin atributo o con un valor raro, vale full', () => {
    expect(readDocumentMotion()).toBe('full')
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'reduced')
    expect(readDocumentMotion()).toBe('reduced')
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'raro')
    expect(readDocumentMotion()).toBe('full')
  })

  it('startMotionSync toma el valor de <html> y sigue al sistema solo sin elección manual', () => {
    const media = stubMatchMedia()
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'reduced')
    startMotionSync()
    const { motion } = useMotion()
    expect(motion.value).toBe('reduced')

    media.setMatches(SYSTEM_REDUCED_MOTION_QUERY, false)
    expect(motion.value).toBe('full')

    localStorage.setItem(MOTION_STORAGE_KEY, 'full')
    media.setMatches(SYSTEM_REDUCED_MOTION_QUERY, true)
    expect(motion.value).toBe('full')
  })
})
