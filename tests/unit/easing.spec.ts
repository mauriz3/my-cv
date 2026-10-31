import { describe, expect, it } from 'vitest'
import { COUNTER_DURATION_MS, clamp01, countUpValue, easeInOutSine, easeOutExpo, lerp } from '../../lib/easing'

describe('utilidades de animación', () => {
  it('clamp01 y lerp', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(lerp(10, 20, 0.25)).toBe(12.5)
  })

  it('las curvas empiezan en 0, terminan en 1 y no se pasan', () => {
    for (const ease of [easeInOutSine, easeOutExpo]) {
      expect(ease(0)).toBe(0)
      expect(ease(1)).toBe(1)
      expect(ease(2)).toBe(1)
    }
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5)
  })
})

describe('contadores', () => {
  it('empiezan en 0 y terminan exactos en el valor final', () => {
    expect(countUpValue(10, 0)).toBe(0)
    expect(countUpValue(10, COUNTER_DURATION_MS)).toBe(10)
    expect(countUpValue(10, COUNTER_DURATION_MS * 2)).toBe(10)
  })

  it('suben sin pasarse (ease-out)', () => {
    const values = [0, 100, 300, 600, 900].map((elapsed) => countUpValue(100, elapsed))
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(Math.max(...values)).toBe(100)
  })
})
