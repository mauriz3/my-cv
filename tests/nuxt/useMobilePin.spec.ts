import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { MOTION_ATTRIBUTE } from '~~/lib/motion'
import { MOBILE_PIN_QUERY } from '~~/lib/mobileJourney'
import { stubMatchMedia, withSetup } from './helpers'

const ZONE_HEIGHT = 300

function setHeight(element: HTMLElement, property: 'offsetHeight' | 'clientHeight', value: number) {
  Object.defineProperty(element, property, { configurable: true, value })
}

/** Recorrido con su zona de tarjetas y una tarjeta de la altura pedida. */
function journeySection(cardHeight: number) {
  const section = document.createElement('section')
  const zone = document.createElement('div')
  zone.className = 'journey__cards'
  const card = document.createElement('article')
  zone.append(card)
  section.append(zone)
  setHeight(zone, 'clientHeight', ZONE_HEIGHT)
  setHeight(card, 'offsetHeight', cardHeight)
  return { section, card }
}

describe('useMobilePin', () => {
  beforeEach(() => {
    useMotion().set('full')
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'full')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE)
  })

  it('fija el recorrido en un móvil con movimiento si las tarjetas caben en su zona', async () => {
    stubMatchMedia({ [MOBILE_PIN_QUERY]: true })
    const { section } = journeySection(ZONE_HEIGHT)
    const { result } = await withSetup(() => useMobilePin(ref(section)))
    expect(result.isMobilePinned.value).toBe(true)
    expect(section.hasAttribute('data-cards-fit')).toBe(false)
  })

  it('si una tarjeta no cabe vuelve a la versión estática y lo marca para el CSS', async () => {
    stubMatchMedia({ [MOBILE_PIN_QUERY]: true })
    const { section } = journeySection(ZONE_HEIGHT + 1)
    const { result } = await withSetup(() => useMobilePin(ref(section)))
    expect(result.isMobilePinned.value).toBe(false)
    expect(section.getAttribute('data-cards-fit')).toBe('false')
  })

  it('sigue a la ventana: al salir del tamaño móvil deja de fijar; al volver, mide de nuevo', async () => {
    const media = stubMatchMedia({ [MOBILE_PIN_QUERY]: false })
    const { section, card } = journeySection(ZONE_HEIGHT)
    const { result, wrapper } = await withSetup(() => useMobilePin(ref(section)))
    expect(result.isMobilePinned.value).toBe(false)

    media.setMatches(MOBILE_PIN_QUERY, true)
    expect(result.isMobilePinned.value).toBe(true)
    setHeight(card, 'offsetHeight', ZONE_HEIGHT * 2)
    media.setMatches(MOBILE_PIN_QUERY, true)
    expect(result.isMobilePinned.value).toBe(false)

    wrapper.unmount()
    expect(media.listenerCount(MOBILE_PIN_QUERY)).toBe(0)
  })

  it('con movimiento reducido no fija; al reanudar vuelve a medir', async () => {
    stubMatchMedia({ [MOBILE_PIN_QUERY]: true })
    const { section } = journeySection(ZONE_HEIGHT)
    const { result } = await withSetup(() => useMobilePin(ref(section)))
    useMotion().set('reduced')
    expect(result.isMobilePinned.value).toBe(false)
    useMotion().set('full')
    await nextTick()
    await nextTick()
    expect(result.isMobilePinned.value).toBe(true)
  })
})
