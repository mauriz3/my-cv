import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MOBILE_CARD_RANGE,
  PINNED_CARD_RANGE,
  PINNED_FIRST_CARD_RANGE,
  cardMotionCssVars,
  cardMotionKindOf,
  cardMotionValues,
  profileCounterProgress,
  profileMotionOptions,
  flowCardProgress,
  mobileFirstCardProgress,
  pinnedCardProgress,
  pinnedCardRange,
  profileCountProgress,
  type CardMotionKind,
} from '../../lib/cardMotion'
import { MOBILE_TIMELINE, PINNED_TIMELINE, cardStateAt, journeyStateAt, type JourneyState } from '../../lib/journey'

const KINDS: CardMotionKind[] = ['profile', 'skills', 'experience', 'education', 'projects']
const VIEWPORT = 900
const stateAt = (pointIndex: number, segmentProgress: number): JourneyState => ({
  pointIndex,
  phase: 'read',
  position: 0,
  segmentProgress,
})

describe('per-card progress p', () => {
  it('in flow: 0 with card below viewport, 1 when its top edge reaches 40%', () => {
    expect(flowCardProgress(VIEWPORT, VIEWPORT)).toBe(0)
    expect(flowCardProgress(VIEWPORT * 0.7, VIEWPORT)).toBeCloseTo(0.5)
    expect(flowCardProgress(VIEWPORT * 0.4, VIEWPORT)).toBe(1)
    expect(flowCardProgress(-200, VIEWPORT)).toBe(1)
  })

  it('pinned: read cards at final state, upcoming at initial, current follows its segment', () => {
    expect(pinnedCardProgress(2, 'past', stateAt(3, 0), PINNED_TIMELINE)).toBe(1)
    expect(pinnedCardProgress(4, 'upcoming', stateAt(3, 0), PINNED_TIMELINE)).toBe(0)
    expect(pinnedCardProgress(3, 'current', stateAt(3, PINNED_CARD_RANGE.from), PINNED_TIMELINE)).toBe(0)
    expect(pinnedCardProgress(3, 'current', stateAt(3, PINNED_CARD_RANGE.to), PINNED_TIMELINE)).toBe(1)
  })

  it('ranges: Profile on first desktop scroll; on mobile, card entry (0.46–0.62)', () => {
    expect(pinnedCardRange(0, PINNED_TIMELINE)).toBe(PINNED_FIRST_CARD_RANGE)
    expect(pinnedCardRange(2, PINNED_TIMELINE)).toBe(PINNED_CARD_RANGE)
    expect(pinnedCardRange(0, MOBILE_TIMELINE)).toEqual({ from: 0.46, to: 0.62 })
    expect(pinnedCardRange(4, MOBILE_TIMELINE)).toBe(MOBILE_CARD_RANGE)
  })

  it('Profile on mobile: content enters with hologram entry (0–0.14 of scroll)', () => {
    expect(mobileFirstCardProgress(0)).toBe(0)
    expect(mobileFirstCardProgress(0.07)).toBeCloseTo(0.5)
    expect(mobileFirstCardProgress(MOBILE_TIMELINE.entryShare)).toBe(1)
  })

  it('is reversible: forward and back yield the same p (no loop or memory)', () => {
    const forward = journeyStateAt(0.42)
    const back = journeyStateAt(0.42)
    expect(pinnedCardProgress(2, 'current', forward, PINNED_TIMELINE)).toBe(
      pinnedCardProgress(2, 'current', back, PINNED_TIMELINE),
    )
  })
})

describe('per-card elements', () => {
  it('Profile: scene, copy, and KPI at initial and final state', () => {
    const start = cardMotionValues('profile', 0)
    expect(start.headline).toBe(0)
    expect(start['kpi-0']).toBe(0)
    expect(start['window-opacity']).toBeLessThan(1)
    expect(start['field-0-0-offset']).toBe(1)
    const end = cardMotionValues('profile', 1)
    expect(end.headline).toBe(1)
    expect(end['window-scale']).toBe(1)
    expect(end['check-offset']).toBe(0)
  })

  it('Profile: eyebrow, subtitle, and description staggered; all 3 KPIs with stagger', () => {
    const middle = cardMotionValues('profile', 0.3)
    expect(middle.eyebrow).toBe(1)
    expect(middle.headline!).toBeGreaterThan(middle.tagline!)
    const kpis = cardMotionValues('profile', 0.55)
    expect(kpis['kpi-0']!).toBeGreaterThan(kpis['kpi-1']!)
    expect(kpis['kpi-1']!).toBeGreaterThan(kpis['kpi-2']!)
    expect(cardMotionValues('profile', 1)['kpi-2']).toBe(1)
  })

  it('Profile counters: 0 → value between p 0.5 and 0.95', () => {
    expect(profileCountProgress(0.5)).toBe(0)
    expect(profileCountProgress(0.95)).toBe(1)
    expect(profileCountProgress(0.725)).toBeCloseTo(0.5, 1)
  })

  it('Profile readable on load: KPI and counters at final values with p = 0', () => {
    const state = journeyStateAt(0)
    const options = profileMotionOptions(0, 'profile', cardStateAt(0, state), state, 0, PINNED_TIMELINE, true)
    expect(options?.profileKpisReady).toBe(true)
    expect(cardMotionValues('profile', 0, options)['kpi-0']).toBe(0)
    expect(profileCounterProgress(0, options)).toBe(1)
    expect(cardMotionValues('profile', 0, options).headline).toBe(1)
    expect(cardMotionValues('profile', 0.4, options).headline).toBe(1)
  })

  it('Profile: batch G scene (card frame) and copy/KPI on the same card', () => {
    const names = Object.keys(cardMotionValues('profile', 0.5))
    expect(names).toContain('window-scale')
    expect(names).toContain('field-0-0-offset')
    expect(names).toContain('check-offset')
    expect(names).toContain('kpi-0')
    expect(names).toContain('headline')
  })

  it.each(KINDS.filter((kind) => kind !== 'profile'))('%s: scene part-channel variables (batch G)', (kind) => {
    const names = Object.keys(cardMotionValues(kind, 0.5))
    const scenePattern = /^[a-z0-9-]+-(x|y|scale|scaleY|rotate|opacity|offset)$/
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      if (kind === 'education' && (name === 'cert' || name === 'courses')) continue
      expect(name).toMatch(scenePattern)
    }
  })

  it('Education: certifications and courses staggered in the card body', () => {
    const start = cardMotionValues('education', 0.55)
    const end = cardMotionValues('education', 0.85)
    expect(start.cert!).toBeGreaterThan(0)
    expect(start.courses!).toBeLessThan(end.courses!)
    expect(cardMotionValues('education', 1).cert).toBe(1)
    expect(cardMotionValues('education', 1).courses).toBe(1)
  })

  it('CSS variables with --fx- prefix and 3 decimals (including negatives)', () => {
    expect(cardMotionCssVars('skills', 1)['--fx-radar-scale']).toBe('1')
    expect(Object.values(cardMotionCssVars('experience', 0.37)).every((value) => /^-?\d+(\.\d{1,3})?$/.test(value))).toBe(true)
  })
})

describe('animated cards', () => {
  it('Visits has no micro-animation', () => {
    expect(cardMotionKindOf('visits')).toBeNull()
    expect(cardMotionKindOf('skills')).toBe('skills')
  })
})

describe('Profile visible from load (Maurizio decision)', () => {
  const source = (file: string) => readFileSync(new URL(`../../app/components/${file}`, import.meta.url), 'utf8')
  /** CSS rules (selector + body) whose selector includes the given class. */
  const rulesWith = (css: string, className: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) => selector!.includes(className)).map(([rule]) => rule!)

  it('animated Profile content is not hidden at p = 0: --fx only moves or scales, never opacity', () => {
    const rules = ['card-fx', 'card-fx--scale'].flatMap((className) => rulesWith(source('JourneyCard.vue'), `.${className}`))
    expect(rules.length).toBeGreaterThanOrEqual(2)
    for (const rule of rules) {
      expect(rule).not.toMatch(/opacity|visibility|display/)
      expect(rule).toMatch(/var\(--fx\)/)
    }
  })

  it('no Profile component ties opacity to --fx', () => {
    for (const file of ['JourneyCard.vue', 'ProfileJourney.vue', 'ProfileCounters.vue']) {
      expect(source(file)).not.toMatch(/opacity:\s*var\(--fx/)
    }
  })

  it('at p = 0 HTML copy starts in place when pinned (headline at 1) and scene at initial state', () => {
    const state = journeyStateAt(0)
    const options = profileMotionOptions(0, 'profile', cardStateAt(0, state), state, 0, PINNED_TIMELINE, true)
    expect(cardMotionValues('profile', 0, options).headline).toBe(1)
    expect(cardMotionValues('profile', 0, options)['progress-scale']).toBeLessThan(0.02)
  })
})
