import { describe, expect, it } from 'vitest'
import { MOBILE_TIMELINE, segmentShareOf } from '../../lib/journey'
import {
  mobileCardStateAt,
  mobileFrameAt,
  mobileFrameCssVars,
  pointingArmOf,
  VISITS_PULSE_FROM,
  type MobileFrame,
} from '../../lib/mobileJourney'

/** Progress at a fraction within a point's segment (after entry). */
const at = (pointIndex: number, segmentProgress: number) =>
  MOBILE_TIMELINE.entryShare + (pointIndex + segmentProgress) * segmentShareOf(MOBILE_TIMELINE)
const frame = (progress: number) => mobileFrameAt(progress)

describe('“materialize” entry (p 0 → 0.14)', () => {
  it('at hologram start it is hidden, covered, and scaled to 1.2', () => {
    expect(frame(0)).toMatchObject<Partial<MobileFrame>>({
      holoOpacity: 0,
      holoScale: 1.2,
      curtain: 1,
      rayOpacity: 1,
      scanlinesOpacity: 1,
      glowOpacity: 0,
      glowScale: 0.6,
      timelineOpacity: 0,
    })
  })

  it('mid-entry it is nearly opaque (ease-out) and the curtain is pulling back', () => {
    const middle = frame(0.07)
    expect(middle.holoOpacity).toBe(1)
    expect(middle.curtain).toBeGreaterThan(0)
    expect(middle.curtain).toBeLessThan(0.2)
    expect(middle.holoScale).toBeLessThan(1.05)
  })

  it('at the end: sharp, no curtain or ray, texture scanlines and visible timeline', () => {
    expect(frame(0.14)).toMatchObject<Partial<MobileFrame>>({
      holoOpacity: 1,
      holoScale: 1,
      curtain: 0,
      rayOpacity: 0,
      scanlinesOpacity: 0.35,
      glowOpacity: 0.9,
      glowScale: 1,
      timelineOpacity: 1,
    })
  })

  it('point 1 card (with h1) is visible from load', () => {
    expect(frame(0).cardOpacity).toBe(1)
    expect(frame(0).cardShiftPx).toBe(0)
  })
})

describe('each point', () => {
  it('walking and stopped: arm at rest, no zoom and no card (except point 1)', () => {
    for (const u of [0.1, 0.34]) {
      const { armAngleDeg, holoScale, cardOpacity, lineScale } = frame(at(2, u))
      expect({ armAngleDeg: Math.abs(armAngleDeg), holoScale, cardOpacity, lineScale }).toEqual({
        armAngleDeg: 0,
        holoScale: 1,
        cardOpacity: 0,
        lineScale: 0,
      })
    }
  })

  it('pointing: arm at ±55° (right on 1, 3, 5, and 6; left on 2 and 4) and zoom to 1.12', () => {
    expect(frame(at(2, 0.5)).armAngleDeg).toBeCloseTo(-55)
    expect(frame(at(1, 0.5)).armAngleDeg).toBeCloseTo(55)
    expect(frame(at(2, 0.5)).holoScale).toBeCloseTo(1.12)
    expect(frame(at(2, 0.5)).holoShiftPx).toBeCloseTo(6)
    expect(pointingArmOf(4)).toBe('right')
    expect(pointingArmOf(5)).toBe('right')
  })

  it('line and card enter between 0.46 and 0.62 (rising 14px) and stay for reading', () => {
    const entering = frame(at(2, 0.5))
    expect(entering.cardOpacity).toBeGreaterThan(0)
    expect(entering.cardOpacity).toBeLessThan(1)
    expect(entering.cardShiftPx).toBeGreaterThan(0)
    expect(frame(at(2, 0.75))).toMatchObject({ cardOpacity: 1, cardShiftPx: 0, cardScale: 1, lineScale: 1 })
  })

  it('leave: card moves up, line retracts, arm and zoom return', () => {
    const leaving = frame(at(2, 0.9999))
    expect(leaving.cardOpacity).toBeLessThan(0.01)
    expect(leaving.cardShiftPx).toBeCloseTo(-8, 1)
    expect(leaving.lineScale).toBeLessThan(0.01)
    expect(Math.abs(leaving.armAngleDeg)).toBeLessThan(0.5)
    expect(leaving.holoScale).toBeCloseTo(1, 2)
  })

  it('point 5 leaves like the others', () => {
    expect(frame(at(4, 0.9999)).cardOpacity).toBeLessThan(0.01)
  })

  it('point 6 (Visits) does not leave: card stays at end of journey with full mini-chart', () => {
    expect(frame(1)).toMatchObject({ cardOpacity: 1, lineScale: 1, visitsDraw: 1, cardScale: 1 })
  })

  it('scrolling back reverses the same way (everything depends on p)', () => {
    expect(frame(at(3, 0.55))).toEqual(frame(at(3, 0.55)))
  })
})

describe('point 6 “Visits”', () => {
  it('marker fires a ring once on stop (scale 1 → 2, opacity 0.6 → 0)', () => {
    expect(frame(at(4, 0.34))).toMatchObject({ ringScale: 1, ringOpacity: 0 })
    const ringing = frame(at(5, 0.33))
    expect(ringing.ringScale).toBeGreaterThan(1)
    expect(ringing.ringOpacity).toBeGreaterThan(0)
    expect(ringing.ringOpacity).toBeLessThanOrEqual(0.6)
    expect(frame(at(5, 0.5))).toMatchObject({ ringScale: 2, ringOpacity: 0 })
  })

  it('tap: arm returns 8° toward body then back to −55°', () => {
    expect(frame(at(5, 0.51)).armAngleDeg).toBeCloseTo(-47, 0)
    expect(frame(at(5, 0.56)).armAngleDeg).toBeCloseTo(-55)
  })

  it('card: enters with scale 0.96 and rises 16px between 0.46 and 0.60', () => {
    const entering = frame(at(5, 0.47))
    expect(entering.cardScale).toBeGreaterThanOrEqual(0.96)
    expect(entering.cardScale).toBeLessThan(0.98)
    expect(entering.cardShiftPx).toBeLessThanOrEqual(16)
    expect(frame(at(5, 0.6))).toMatchObject({ cardOpacity: 1, cardShiftPx: 0 })
  })

  it('mini-chart and KPI: 0 until 0.58, half at midpoint, full at 0.82 (scroll-linked)', () => {
    expect(frame(at(5, 0.57)).visitsDraw).toBe(0)
    expect(frame(at(5, 0.7)).visitsDraw).toBeCloseTo(0.5, 1)
    expect(frame(at(5, VISITS_PULSE_FROM + 0.001)).visitsDraw).toBe(1)
    expect(frame(at(4, 0.7)).visitsDraw).toBe(0)
  })
})

describe('card in place', () => {
  it('current point’s card is active for its whole segment; others past or upcoming', () => {
    const { state } = frame(at(2, 0.1))
    expect([0, 1, 2, 3, 4, 5].map((index) => mobileCardStateAt(index, state))).toEqual([
      'past',
      'past',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })
})

describe('CSS variables', () => {
  it('each arm gets its rotation and the other stays at 0°', () => {
    const right = mobileFrameCssVars(frame(at(2, 0.75)))
    expect(right['--arm-right']).toBe('-55deg')
    expect(right['--arm-left']).toBe('0deg')
    const left = mobileFrameCssVars(frame(at(1, 0.75)))
    expect(left['--arm-left']).toBe('55deg')
    expect(left['--card-shift']).toBe('0px')
  })
})
