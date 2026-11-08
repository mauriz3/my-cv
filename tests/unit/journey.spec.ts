import { describe, expect, it } from 'vitest'
import {
  JOURNEY_POINTS,
  PHASE_ENDS,
  WALK_IDLE_MS,
  cardStateAt,
  isCardShown,
  isPointing,
  isStepping,
  journeyStateAt,
  MOBILE_TIMELINE,
  PINNED_TIMELINE,
  segmentShareOf,
  journeyTimingCssVars,
  markerStateAt,
  pointPosition,
  readingProgressOf,
  scrollProgress,
} from '../../lib/journey'

/** Progress at a fraction within a point's segment. */
const at = (pointIndex: number, segmentProgress: number) =>
  (pointIndex + segmentProgress) * segmentShareOf(PINNED_TIMELINE)

describe('journey segment layout', () => {
  it('6 points in order: Profile, Skills, Experience, Education, Projects, Visits', () => {
    expect(JOURNEY_POINTS.map((point) => point.id)).toEqual([
      'profile',
      'skills',
      'experience',
      'education',
      'projects',
      'visits',
    ])
  })

  it('each point occupies 1/6 of scroll and its phases cover the full segment', () => {
    expect(segmentShareOf(PINNED_TIMELINE)).toBeCloseTo(1 / 6)
    expect(PHASE_ENDS.map(([phase]) => phase)).toEqual(['walk', 'stop', 'point', 'reveal', 'read', 'leave'])
    expect(PHASE_ENDS.at(-1)?.[1]).toBe(1)
  })

  it('points are spaced from end to end of the timeline', () => {
    expect(JOURNEY_POINTS.map((_, index) => pointPosition(index))).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
  })
})

describe('phases and position', () => {
  it('starts stopped and reading at point 1 (card with visible h1)', () => {
    expect(journeyStateAt(0)).toMatchObject({ pointIndex: 0, phase: 'read', position: 0 })
    expect(journeyStateAt(at(0, 0.5)).phase).toBe('read')
    expect(journeyStateAt(at(0, 0.95)).phase).toBe('leave')
  })

  it('each segment: walk, stop, point, card, read, and leave', () => {
    expect(journeyStateAt(at(2, 0.1)).phase).toBe('walk')
    expect(journeyStateAt(at(2, 0.45)).phase).toBe('stop')
    expect(journeyStateAt(at(2, 0.55)).phase).toBe('point')
    expect(journeyStateAt(at(2, 0.65)).phase).toBe('reveal')
    expect(journeyStateAt(at(2, 0.8)).phase).toBe('read')
    expect(journeyStateAt(at(2, 0.95)).phase).toBe('leave')
  })

  it('while walking, moves from previous to current point with smooth ease-in and ease-out', () => {
    expect(journeyStateAt(at(2, 0)).position).toBeCloseTo(pointPosition(1))
    expect(journeyStateAt(at(2, 0.2)).position).toBeCloseTo((pointPosition(1) + pointPosition(2)) / 2)
    expect(journeyStateAt(at(2, 0.39)).position).toBeLessThan(pointPosition(2))
    expect(journeyStateAt(at(2, 0.45)).position).toBe(pointPosition(2))
  })

  it('stays reading at the last point until the end', () => {
    expect(journeyStateAt(1)).toMatchObject({ pointIndex: 5, phase: 'read', position: 1 })
    expect(journeyStateAt(at(5, 0.95)).phase).toBe('read')
  })

  it('out of range clamps to first or last point', () => {
    expect(journeyStateAt(-1).pointIndex).toBe(0)
    expect(journeyStateAt(2).pointIndex).toBe(5)
  })
})

describe('timeline markers', () => {
  const states = (progress: number) => JOURNEY_POINTS.map((_, index) => markerStateAt(index, journeyStateAt(progress)))

  it('stopped at point 3: earlier done, current 3, later pending', () => {
    expect(states(at(2, 0.8))).toEqual(['done', 'done', 'current', 'pending', 'pending', 'pending'])
  })

  it('walking toward point 3: destination still pending and none current', () => {
    expect(states(at(2, 0.1))).toEqual(['done', 'done', 'pending', 'pending', 'pending', 'pending'])
  })
})

describe('gestures, card, and stride', () => {
  it('points from point phase through read; card visible only with the line', () => {
    expect(isPointing('walk')).toBe(false)
    expect(isPointing('point')).toBe(true)
    expect(isPointing('leave')).toBe(false)
    expect(isCardShown('stop')).toBe(true)
    expect(isCardShown('point')).toBe(true)
    expect(isCardShown('reveal')).toBe(true)
    expect(isCardShown('read')).toBe(true)
  })

  it('stride advances only while walking with recent scroll (pauses after 120 ms)', () => {
    expect(isStepping('walk', 0)).toBe(true)
    expect(isStepping('walk', WALK_IDLE_MS - 1)).toBe(true)
    expect(isStepping('walk', WALK_IDLE_MS)).toBe(false)
    expect(isStepping('read', 0)).toBe(false)
  })
})

describe('card states', () => {
  const cards = (progress: number) => JOURNEY_POINTS.map((_, index) => cardStateAt(index, journeyStateAt(progress)))

  it('on load, Profile card is visible (contains the h1)', () => {
    expect(cards(0)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('walking toward point 3: its card not yet shown and earlier cards already left', () => {
    expect(cards(at(2, 0.2))).toEqual(['past', 'past', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('walking toward a point: card enters before the walk segment ends', () => {
    expect(cards(at(2, 0.32))[2]).toBe('current')
  })

  it('stopped at point 3: only its card visible; leaves when continuing', () => {
    expect(cards(at(2, 0.8))).toEqual(['past', 'past', 'current', 'upcoming', 'upcoming', 'upcoming'])
    expect(cards(at(2, 0.95))[2]).toBe('past')
  })
})

describe('resume without repeating points', () => {
  it.each([
    ['tablet and desktop', PINNED_TIMELINE],
    ['mobile', MOBILE_TIMELINE],
  ])('%s: each point’s reading progress falls in its read phase', (_, timeline) => {
    JOURNEY_POINTS.forEach((_, index) => {
      const state = journeyStateAt(readingProgressOf(index, timeline), timeline)
      expect(state.pointIndex).toBe(index)
      expect(state.phase).toBe('read')
    })
  })
})

describe('mobile journey', () => {
  const mobileAt = (pointIndex: number, segmentProgress: number) =>
    MOBILE_TIMELINE.entryShare + (pointIndex + segmentProgress) * segmentShareOf(MOBILE_TIMELINE)

  it('entry share 0.14 then 6 segments of 0.1433', () => {
    expect(MOBILE_TIMELINE.entryShare).toBe(0.14)
    expect(segmentShareOf(MOBILE_TIMELINE)).toBeCloseTo(0.1433)
    expect(MOBILE_TIMELINE.phaseEnds.at(-1)?.[1]).toBe(1)
  })

  it('during entry waits at point 1 start, not reading yet', () => {
    expect(journeyStateAt(0.07, MOBILE_TIMELINE)).toMatchObject({ pointIndex: 0, phase: 'walk', segmentProgress: 0 })
  })

  it('spec phases in each segment', () => {
    const phaseAt = (segmentProgress: number) => journeyStateAt(mobileAt(2, segmentProgress), MOBILE_TIMELINE).phase
    expect([0.1, 0.34, 0.42, 0.55, 0.75, 0.95].map(phaseAt)).toEqual([
      'walk',
      'stop',
      'point',
      'reveal',
      'read',
      'leave',
    ])
  })

  it('spec table segments: point 6 (Visits) from 0.857 to 1', () => {
    expect(mobileAt(5, 0)).toBeCloseTo(0.857, 3)
    expect(journeyStateAt(0.86, MOBILE_TIMELINE).pointIndex).toBe(5)
    expect(journeyStateAt(0.85, MOBILE_TIMELINE).pointIndex).toBe(4)
  })

  it('first point walks in place and last stays reading', () => {
    expect(journeyStateAt(mobileAt(0, 0.2), MOBILE_TIMELINE).position).toBe(0)
    expect(journeyStateAt(1, MOBILE_TIMELINE)).toMatchObject({ pointIndex: 5, phase: 'read' })
    expect(journeyStateAt(1, MOBILE_TIMELINE).segmentProgress).toBeCloseTo(1)
  })
})

describe('scroll progress', () => {
  it('goes from 0 (section top) to 1 (section bottom) and clamps', () => {
    expect(scrollProgress(0, 6000, 1000)).toBe(0)
    expect(scrollProgress(-2500, 6000, 1000)).toBe(0.5)
    expect(scrollProgress(-9000, 6000, 1000)).toBe(1)
    expect(scrollProgress(300, 6000, 1000)).toBe(0)
    expect(scrollProgress(-10, 800, 1000)).toBe(0)
  })
})

describe('timing as CSS variables', () => {
  it('comes from handoff constants', () => {
    const vars = journeyTimingCssVars()
    expect(vars['--walk-cycle-duration']).toBe('800ms')
    expect(vars['--point-duration']).toBe('450ms')
    expect(vars['--journey-height-desktop']).toBe('720vh')
    expect(vars['--journey-height-tablet']).toBe('480vh')
    expect(vars['--journey-height-mobile']).toBe('420svh')
  })
})
