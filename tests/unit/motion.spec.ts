import { describe, expect, it } from 'vitest'
import { parseStoredMotion } from '../../lib/motion'

describe('data-motion attribute', () => {
  it('only accepts full or reduced', () => {
    expect(parseStoredMotion('full')).toBe('full')
    expect(parseStoredMotion('reduced')).toBe('reduced')
    expect(parseStoredMotion('on')).toBeNull()
    expect(parseStoredMotion(null)).toBeNull()
  })
})
