import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { SCENE_CATCH_UP_MS } from '~~/lib/animations'
import {
  cardMotionCssVars,
  flowCardProgress,
  mobileFirstCardProgress,
  pinnedCardProgress,
  profileCountProgress,
  profileCounterProgress,
  profileMotionOptions,
} from '~~/lib/cardMotion'
import { JOURNEY_POINTS, PINNED_TIMELINE, cardStateAt, journeyStateAt, readingProgressOf } from '~~/lib/journey'
import { setBox, stubMatchMedia, withSetup } from './helpers'

const WIDE_QUERY = '(min-width: 768px)'
const VIEWPORT_HEIGHT = 800
const PROFILE = 0
const SKILLS = 1
const VISITS = JOURNEY_POINTS.length - 1
const ACTIVE_ATTRIBUTE = 'data-fx-active'

function journeyCards() {
  const section = document.createElement('section')
  const cards = JOURNEY_POINTS.map((_, index) => {
    const card = document.createElement('article')
    card.dataset.pointIndex = String(index)
    section.append(card)
    return card
  })
  return { section, cards }
}

const fxVariables = (card: HTMLElement) => [...card.style].filter((name) => name.startsWith('--fx-'))

/** Journey state midway through a card segment (between its read point and the next). */
const stateWhileReading = (index: number) => journeyStateAt(readingProgressOf(index))

describe('useCardMotion', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT)
    useMotion().set('full')
  })

  afterEach(() => vi.unstubAllGlobals())

  async function mountCardMotion(options: { wide: boolean; mobilePinned?: boolean }) {
    const media = stubMatchMedia({ [WIDE_QUERY]: options.wide })
    const isMobilePinned = ref(options.mobilePinned ?? false)
    const { result, wrapper } = await withSetup(() => useCardMotion(isMobilePinned))
    return { ...result, media, isMobilePinned, wrapper, ...journeyCards() }
  }

  it('on desktop load, Profile counters are already at their final values', async () => {
    const { paint, section, profileCount } = await mountCardMotion({ wide: true })
    const state = journeyStateAt(0)
    paint(section, state, 0)
    const options = profileMotionOptions(0, 'profile', cardStateAt(0, state), state, 0, PINNED_TIMELINE, true)
    expect(profileCount.value).toBe(profileCounterProgress(0, options))
  })

  it('with pinned journey, writes each card’s progress variables', async () => {
    const { paint, section, cards } = await mountCardMotion({ wide: true })
    const state = stateWhileReading(SKILLS)
    paint(section, state, readingProgressOf(SKILLS))

    const progress = pinnedCardProgress(SKILLS, cardStateAt(SKILLS, state), state, PINNED_TIMELINE)
    for (const [name, value] of Object.entries(cardMotionCssVars('skills', progress))) {
      expect(cards[SKILLS]!.style.getPropertyValue(name)).toBe(value)
    }
    expect(cards[SKILLS]!.hasAttribute(ACTIVE_ATTRIBUTE)).toBe(progress > 0 && progress < 1)
    // Cards already read stay at final state; Visits has no micro-animation.
    expect(cards[PROFILE]!.style.getPropertyValue('--fx-eyebrow')).toBe('1')
    expect(fxVariables(cards[VISITS]!)).toEqual([])
  })

  it('without pin, progress follows on-screen card position and moves Profile counters', async () => {
    const { paint, section, cards, profileCount } = await mountCardMotion({ wide: false })
    const top = VIEWPORT_HEIGHT * 0.8
    setBox(cards[PROFILE]!, { top, height: 300 })
    for (const card of cards.slice(1)) setBox(card, { top: VIEWPORT_HEIGHT * 2, height: 300 })
    paint(section, journeyStateAt(0), 0)

    const progress = flowCardProgress(top, VIEWPORT_HEIGHT)
    expect(cards[PROFILE]!.style.getPropertyValue('--fx-eyebrow')).toBe(cardMotionCssVars('profile', progress)['--fx-eyebrow'])
    expect(cards[PROFILE]!.hasAttribute(ACTIVE_ATTRIBUTE)).toBe(true)
    expect(profileCount.value).toBe(profileCountProgress(progress))
    expect(cards[SKILLS]!.style.getPropertyValue('--fx-radar-scale')).not.toBe('')
  })

  it('with mobile pin, first card shows final figures and animates KPI on scroll', async () => {
    const { paint, section, profileCount, cards } = await mountCardMotion({ wide: false, mobilePinned: true })
    const journeyProgress = 0.01
    paint(section, journeyStateAt(journeyProgress), journeyProgress)
    expect(profileCount.value).toBe(1)
    expect(Number(cards[PROFILE]!.style.getPropertyValue('--fx-kpi-0'))).toBeLessThan(1)
  })

  it('skips repaint when progress barely changes; invalidate (layout change) forces repaint', async () => {
    const { paint, invalidate, section, cards, isMobilePinned } = await mountCardMotion({ wide: true })
    const state = stateWhileReading(SKILLS)
    paint(section, state, 0.3)
    cards[SKILLS]!.style.removeProperty('--fx-radar-scale')
    paint(section, state, 0.3)
    expect(cards[SKILLS]!.style.getPropertyValue('--fx-radar-scale')).toBe('')

    invalidate()
    paint(section, state, 0.3)
    expect(cards[SKILLS]!.style.getPropertyValue('--fx-radar-scale')).not.toBe('')

    cards[SKILLS]!.style.removeProperty('--fx-radar-scale')
    isMobilePinned.value = true
    await nextTick()
    isMobilePinned.value = false
    await nextTick()
    paint(section, state, 0.3)
    expect(cards[SKILLS]!.style.getPropertyValue('--fx-radar-scale')).not.toBe('')
  })

  it('with reduced motion, does not paint; reset clears variables and attributes and sets counters to final', async () => {
    const { paint, reset, section, cards, profileCount } = await mountCardMotion({ wide: true })
    paint(section, journeyStateAt(0), 0)
    expect(fxVariables(cards[PROFILE]!).length).toBeGreaterThan(0)

    useMotion().set('reduced')
    reset(section)
    expect(cards.every((card) => fxVariables(card).length === 0 && !card.hasAttribute(ACTIVE_ATTRIBUTE))).toBe(true)
    expect(profileCount.value).toBe(1)
    paint(section, stateWhileReading(SKILLS), 0.3)
    expect(fxVariables(cards[SKILLS]!)).toEqual([])
    reset(null)
  })

  it('when enabling motion, visible card reaches its progress in 450 ms and off-screen card jumps to its', async () => {
    vi.useFakeTimers()
    try {
      const { paint, section, cards } = await mountCardMotion({ wide: true })
      setBox(section, { top: 0, height: VIEWPORT_HEIGHT })
      setBox(cards[SKILLS]!, { top: 80, height: 200 })
      setBox(cards[PROFILE]!, { top: VIEWPORT_HEIGHT + 40, height: 200 })
      const state = stateWhileReading(SKILLS)
      const progress = readingProgressOf(SKILLS)
      paint(section, state, progress)
      const pLive = pinnedCardProgress(SKILLS, cardStateAt(SKILLS, state), state, PINNED_TIMELINE)
      const at = (kind: 'skills' | 'profile', value: number, name: string) => cardMotionCssVars(kind, value)[name]

      useMotion().set('reduced')
      useMotion().set('full')
      expect(cards[SKILLS]!.style.getPropertyValue('--fx-radar-scale')).toBe(at('skills', 0, '--fx-radar-scale'))
      expect(cards[PROFILE]!.style.getPropertyValue('--fx-eyebrow')).toBe(at('profile', 1, '--fx-eyebrow'))

      await vi.advanceTimersByTimeAsync(SCENE_CATCH_UP_MS)
      expect(cards[SKILLS]!.style.getPropertyValue('--fx-radar-scale')).toBe(at('skills', pLive, '--fx-radar-scale'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('on unmount, stops listening for width changes', async () => {
    const { wrapper, media } = await mountCardMotion({ wide: true })
    expect(media.listenerCount(WIDE_QUERY)).toBe(1)
    wrapper.unmount()
    expect(media.listenerCount(WIDE_QUERY)).toBe(0)
  })
})
