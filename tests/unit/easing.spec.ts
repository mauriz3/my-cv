import { describe, expect, it } from 'vitest'
import {
  COUNTER_DURATION_MS,
  clamp01,
  countUpValue,
  cubicBezier,
  easeInOutSine,
  easeInOutCubic,
  easeOutCubic,
  easeOutExpo,
  halfSineBump,
  inverseOf,
  overshootOut,
  lerp,
  progressBetween,
} from '../../lib/easing'

describe('utilidades de animación', () => {
  it('clamp01 y lerp', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(lerp(10, 20, 0.25)).toBe(12.5)
  })

  it('progressBetween: avance con límites dentro de un tramo', () => {
    expect(progressBetween(0.1, 0.2, 0.6)).toBe(0)
    expect(progressBetween(0.4, 0.2, 0.6)).toBeCloseTo(0.5)
    expect(progressBetween(0.9, 0.2, 0.6)).toBe(1)
  })

  it('easeInOutCubic (cubic-bezier 0.65, 0, 0.35, 1) es simétrica', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 3)
    expect(easeInOutCubic(0.25)).toBeCloseTo(1 - easeInOutCubic(0.75), 3)
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

describe('cubicBezier', () => {
  it('reproduce las curvas CSS: extremos exactos, lineal sin deformar y rebote de ease-out-back', () => {
    const linear = cubicBezier(0, 0, 1, 1)
    expect(linear(0.3)).toBeCloseTo(0.3, 5)
    const expoCurve = cubicBezier(0.16, 1, 0.3, 1)
    expect(expoCurve(0)).toBeCloseTo(0, 5)
    expect(expoCurve(1)).toBeCloseTo(1, 5)
    expect(expoCurve(0.5)).toBeGreaterThan(0.9)
    const easeOutBack = cubicBezier(0.34, 1.56, 0.64, 1)
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1)
  })

})

describe('curvas de las escenas (Tanda G)', () => {
  it('easeOutCubic y medio seno', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875)
    expect(halfSineBump(0)).toBe(0)
    expect(halfSineBump(0.5)).toBe(1)
    expect(halfSineBump(1)).toBeCloseTo(0, 9)
  })

  // Con la fórmula de la spec, s = 2 da un pico de ≈ 13 % (la spec lo redondea a «≈ 20 %»).
  it('overshootOut: s = 1,4 pasa ≈ 10 % de 1 y s = 2 algo más; termina exacto en 1', () => {
    const peak = (s: number) => Math.max(...Array.from({ length: 1001 }, (_, i) => overshootOut(i / 1000, s)))
    expect(peak(1.4)).toBeCloseTo(1.1, 1)
    expect(peak(2)).toBeGreaterThan(peak(1.4))
    expect(peak(2)).toBeCloseTo(1.13, 2)
    expect(overshootOut(0)).toBe(0)
    expect(overshootOut(1)).toBe(1)
  })

  it('inverseOf: el x con curva(x) = objetivo', () => {
    expect(inverseOf(easeInOutCubic, 0.5)).toBeCloseTo(0.5, 4)
    expect(easeOutCubic(inverseOf(easeOutCubic, 0.3))).toBeCloseTo(0.3, 5)
  })
})

