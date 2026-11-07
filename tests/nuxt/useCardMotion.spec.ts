import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  cardMotionCssVars,
  flowCardProgress,
  mobileFirstCardProgress,
  pinnedCardProgress,
  profileCountProgress
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

/** Estado del recorrido a mitad del tramo de una tarjeta (entre su lectura y la siguiente). */
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

  it('con el recorrido fijado escribe en cada tarjeta las variables de su avance', async () => {
    const { paint, section, cards } = await mountCardMotion({ wide: true })
    const state = stateWhileReading(SKILLS)
    paint(section, state, readingProgressOf(SKILLS))

    const progress = pinnedCardProgress(SKILLS, cardStateAt(SKILLS, state), state, PINNED_TIMELINE)
    for (const [name, value] of Object.entries(cardMotionCssVars('skills', progress))) {
      expect(cards[SKILLS]!.style.getPropertyValue(name)).toBe(value)
    }
    expect(cards[SKILLS]!.hasAttribute(ACTIVE_ATTRIBUTE)).toBe(progress > 0 && progress < 1)
    // Las ya leídas quedan en su estado final; Visitas no lleva microanimación.
    expect(cards[PROFILE]!.style.getPropertyValue('--fx-eyebrow')).toBe('1')
    expect(fxVariables(cards[VISITS]!)).toEqual([])
  })

  it('sin pin, el avance sale de la posición de la tarjeta en pantalla y mueve los contadores del Perfil', async () => {
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

  it('en el pin móvil la primera tarjeta sigue a la entrada del holograma', async () => {
    const { paint, section, profileCount } = await mountCardMotion({ wide: false, mobilePinned: true })
    const journeyProgress = 0.01
    paint(section, journeyStateAt(journeyProgress), journeyProgress)
    expect(profileCount.value).toBe(profileCountProgress(mobileFirstCardProgress(journeyProgress)))
  })

  it('no reescribe si el avance apenas cambia; invalidate (cambio de maqueta) obliga a repintar', async () => {
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

  it('con movimiento reducido no pinta; reset quita variables y marcas y deja los contadores al final', async () => {
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

  it('al desmontar deja de escuchar el cambio de ancho', async () => {
    const { wrapper, media } = await mountCardMotion({ wide: true })
    expect(media.listenerCount(WIDE_QUERY)).toBe(1)
    wrapper.unmount()
    expect(media.listenerCount(WIDE_QUERY)).toBe(0)
  })
})
