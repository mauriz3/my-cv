import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  MOTION_ATTRIBUTE,
  MOTION_NO_FLASH_SCRIPT,
  MOTION_STORAGE_KEY,
  parseStoredMotion,
  resolveMotion,
  toggledMotion,
} from '../../lib/motion'

describe('preferencia de movimiento', () => {
  it('solo acepta valores guardados conocidos', () => {
    expect(parseStoredMotion('full')).toBe('full')
    expect(parseStoredMotion('reduced')).toBe('reduced')
    expect(parseStoredMotion('1')).toBeNull()
    expect(parseStoredMotion(null)).toBeNull()
  })

  it('manda la elección manual; si no hay, prefers-reduced-motion', () => {
    expect(resolveMotion('full', true)).toBe('full')
    expect(resolveMotion('reduced', false)).toBe('reduced')
    expect(resolveMotion(null, true)).toBe('reduced')
    expect(resolveMotion(null, false)).toBe('full')
  })

  it('el botón alterna entre los dos estados', () => {
    expect(toggledMotion('full')).toBe('reduced')
    expect(toggledMotion('reduced')).toBe('full')
  })
})

describe('script de movimiento anterior al pintado', () => {
  function runScript({ stored = null as string | null, systemReduced = false, storageBlocked = false } = {}) {
    const attributes = new Map<string, string>()
    runInNewContext(MOTION_NO_FLASH_SCRIPT, {
      localStorage: {
        getItem: (key: string) => {
          if (storageBlocked) throw new Error('blocked')
          return key === MOTION_STORAGE_KEY ? stored : null
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

  it('aplica lo guardado', () => {
    expect(runScript({ stored: 'reduced' })).toBe('reduced')
    expect(runScript({ stored: 'full', systemReduced: true })).toBe('full')
  })

  it('sin elección guardada sigue al sistema', () => {
    expect(runScript({ systemReduced: true })).toBe('reduced')
    expect(runScript()).toBe('full')
  })

  it('con localStorage bloqueado no falla y sigue al sistema', () => {
    expect(runScript({ storageBlocked: true, systemReduced: true })).toBe('reduced')
  })
})
