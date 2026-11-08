import { describe, expect, it } from 'vitest'
import { donutArcs, endTrend, sparklinePaths } from '../../lib/sparkline'

describe('mini line and area', () => {
  it('scales the series to the canvas with max at top and closes the area along the base', () => {
    expect(sparklinePaths([0, 5, 10], 100, 40)).toEqual({
      line: 'M0 40 L50 20 L100 0',
      area: 'M0 40 L50 20 L100 0 L100 40 L0 40 Z',
    })
  })

  it('no data yields no path; one point does not divide by zero', () => {
    expect(sparklinePaths([], 100, 40)).toEqual({ line: '', area: '' })
    expect(sparklinePaths([3], 100, 40).line).toBe('M0 0')
  })
})

describe('mini donut', () => {
  it('consecutive arcs as fractions of the circumference', () => {
    const arcs = donutArcs([58, 36, 6])
    expect(arcs.map((arc) => arc.length)).toEqual([0.58, 0.36, 0.06])
    expect(arcs[1]?.start).toBeCloseTo(0.58)
    expect(arcs[2]?.start).toBeCloseTo(0.94)
  })

  it('zero total yields empty arcs', () => {
    expect(donutArcs([0, 0])).toEqual([
      { start: 0, length: 0 },
      { start: 0, length: 0 },
    ])
  })
})

describe('trend at end of series', () => {
  it('compares the last week to the previous one', () => {
    expect(endTrend([10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 20, 20])).toBe('rising')
    expect(endTrend([20, 20, 20, 20, 20, 20, 20, 10, 10, 10, 10, 10, 10, 10])).toBe('falling')
    expect(endTrend([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10.2])).toBe('steady')
    expect(endTrend([1, 2, 3])).toBe('steady')
  })
})
