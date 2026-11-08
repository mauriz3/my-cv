import { describe, expect, it } from 'vitest'
import { parseStoredMotion } from '../../lib/motion'

describe('atributo data-motion', () => {
  it('solo acepta full o reduced', () => {
    expect(parseStoredMotion('full')).toBe('full')
    expect(parseStoredMotion('reduced')).toBe('reduced')
    expect(parseStoredMotion('on')).toBeNull()
    expect(parseStoredMotion(null)).toBeNull()
  })
})
