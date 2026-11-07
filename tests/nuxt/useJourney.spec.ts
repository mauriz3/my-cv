import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { JOURNEY_POINTS, LAST_POINT_INDEX, WALK_IDLE_MS, type JourneyState, journeyStateAt, readingProgressOf, scrollProgress } from '~~/lib/journey'
import { MOTION_ATTRIBUTE } from '~~/lib/motion'
import { mobileFrameAt } from '~~/lib/mobileJourney'
import { FakeIntersectionObserver, setBox, stubIntersectionObserver, withSetup } from './helpers'

const VIEWPORT_HEIGHT = 800
const SECTION_HEIGHT = 8800
/** Un fotograma (rAF) con temporizadores falsos. */
const FRAME_MS = 20

/** Recorrido con una tarjeta por punto; el primer hijo es el escenario (sticky en la maqueta fijada). */
function journeySection() {
  const section = document.createElement('section')
  const stage = document.createElement('div')
  section.append(stage)
  JOURNEY_POINTS.forEach((_, index) => {
    const card = document.createElement('article')
    card.dataset.pointIndex = String(index)
    setBox(card, { top: 5000, height: 200 })
    stage.append(card)
  })
  Object.defineProperty(section, 'offsetHeight', { configurable: true, value: SECTION_HEIGHT })
  document.body.append(section)
  return { section, stage }
}

/** Top de la sección para un progreso del recorrido. */
const topAt = (progress: number) => -progress * (SECTION_HEIGHT - VIEWPORT_HEIGHT)

/** Primer progreso en el que el holograma camina entre dos puntos. */
function firstWalkingProgress(): number {
  const steps = 1000
  const step = Array.from({ length: steps }, (_, index) => index / steps).find(
    (progress) => journeyStateAt(progress).phase === 'walk'
  )
  if (step === undefined) throw new Error('Sin tramo de caminar')
  return step
}

/** Coloca la sección en la ventana (top relativo) y dispara el scroll. */
async function scrollTo(section: HTMLElement, top: number) {
  setBox(section, { top, height: SECTION_HEIGHT })
  window.dispatchEvent(new Event('scroll'))
  await vi.advanceTimersByTimeAsync(FRAME_MS)
}

describe('useJourney', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stubIntersectionObserver()
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT)
    useMotion().set('full')
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'full')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  async function mountJourney(options: { mobilePinned?: boolean; onFrame?: (element: HTMLElement, state: JourneyState, progress: number) => void } = {}) {
    const { section, stage } = journeySection()
    const isMobilePinned = ref(options.mobilePinned ?? false)
    const { result, wrapper } = await withSetup(() => useJourney(ref(section), isMobilePinned, { onFrame: options.onFrame }))
    return { ...result, section, stage, isMobilePinned, wrapper, observer: FakeIntersectionObserver.last() }
  }

  it('fuera de pantalla no hace nada con el scroll', async () => {
    const { section, state } = await mountJourney()
    await scrollTo(section, -4000)
    expect(section.style.getPropertyValue('--journey-position')).toBe('')
    expect(state.value.pointIndex).toBe(0)
  })

  it('en pantalla, cada scroll pinta en el siguiente fotograma la posición y el estado del recorrido', async () => {
    const onFrame = vi.fn<(element: HTMLElement, state: JourneyState, progress: number) => void>()
    const { section, state, isOnScreen, observer } = await mountJourney({ onFrame })
    observer.intersect(true)
    expect(isOnScreen.value).toBe(true)

    const top = -4000
    await scrollTo(section, top)
    const progress = scrollProgress(top, SECTION_HEIGHT, VIEWPORT_HEIGHT)
    const expected = journeyStateAt(progress)
    expect(section.style.getPropertyValue('--journey-position')).toBe(expected.position.toFixed(4))
    expect(state.value.pointIndex).toBe(expected.pointIndex)
    expect(state.value.phase).toBe(expected.phase)
    expect(onFrame).toHaveBeenLastCalledWith(section, expect.objectContaining({ pointIndex: expected.pointIndex }), progress)
  })

  it('la zancada avanza solo mientras se hace scroll', async () => {
    const { section, isStepping, observer } = await mountJourney()
    observer.intersect(true)
    await scrollTo(section, topAt(firstWalkingProgress()))
    expect(isStepping.value).toBe(true)
    await vi.advanceTimersByTimeAsync(WALK_IDLE_MS + FRAME_MS)
    expect(isStepping.value).toBe(false)
  })

  it('con el pin móvil escribe las variables del fotograma y el dibujo de Visitas', async () => {
    const { section, visitsDraw, observer } = await mountJourney({ mobilePinned: true })
    observer.intersect(true)
    await scrollTo(section, -(SECTION_HEIGHT - VIEWPORT_HEIGHT))
    const frame = mobileFrameAt(1)
    expect(section.style.getPropertyValue('--curtain')).toBe(`${Number(frame.curtain.toFixed(3))}`)
    expect(visitsDraw.value).toBe(frame.visitsDraw)
    expect(frame.state.pointIndex).toBe(LAST_POINT_INDEX)
  })

  it('sabe si la pestaña está oculta', async () => {
    const { isPageHidden } = await mountJourney()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(isPageHidden.value).toBe(true)
  })

  it('revealLastPoint lleva al final del recorrido solo con el escenario fijado', async () => {
    const scrollToSpy = vi.fn()
    vi.stubGlobal('scrollTo', scrollToSpy)
    const { section, stage, revealLastPoint } = await mountJourney()
    setBox(section, { top: 100, height: SECTION_HEIGHT })
    revealLastPoint()
    expect(scrollToSpy).not.toHaveBeenCalled()

    stage.style.position = 'sticky'
    revealLastPoint()
    expect(scrollToSpy).toHaveBeenCalledWith({ top: window.scrollY + 100 + SECTION_HEIGHT - VIEWPORT_HEIGHT, behavior: 'instant' })
  })

  it('al pausar el movimiento a mitad deja a la vista la tarjeta del punto actual', async () => {
    const { section, state, observer } = await mountJourney()
    observer.intersect(true)
    await scrollTo(section, -readingProgressOf(2) * (SECTION_HEIGHT - VIEWPORT_HEIGHT))
    expect(state.value.pointIndex).toBe(2)
    const card = section.querySelector<HTMLElement>('[data-point-index="2"]')!
    card.scrollIntoView = vi.fn()

    useMotion().set('reduced')
    await vi.advanceTimersByTimeAsync(FRAME_MS)
    expect(card.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' })
  })

  it('al reanudar vuelve al punto de lectura de esa tarjeta si sigue a la vista', async () => {
    const scrollToSpy = vi.fn()
    vi.stubGlobal('scrollTo', scrollToSpy)
    const { section, observer } = await mountJourney()
    observer.intersect(true)
    await scrollTo(section, -readingProgressOf(3) * (SECTION_HEIGHT - VIEWPORT_HEIGHT))
    for (const card of section.querySelectorAll<HTMLElement>('[data-point-index]')) card.scrollIntoView = vi.fn()
    useMotion().set('reduced')
    await vi.advanceTimersByTimeAsync(FRAME_MS)

    setBox(section.querySelector('[data-point-index="3"]')!, { top: 300, height: 200 })
    setBox(section, { top: -2000, height: SECTION_HEIGHT })
    useMotion().set('full')
    await vi.advanceTimersByTimeAsync(FRAME_MS)
    const sectionTop = -2000 + window.scrollY
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: sectionTop + readingProgressOf(3) * (SECTION_HEIGHT - VIEWPORT_HEIGHT),
      behavior: 'instant'
    })
  })

  it('al reanudar sin la tarjeta pausada a la vista, va a la tarjeta más centrada', async () => {
    const scrollToSpy = vi.fn()
    vi.stubGlobal('scrollTo', scrollToSpy)
    useMotion().set('reduced')
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'reduced')
    const { section } = await mountJourney()
    setBox(section, { top: -2000, height: SECTION_HEIGHT })
    setBox(section.querySelector('[data-point-index="4"]')!, { top: VIEWPORT_HEIGHT / 2 - 100, height: 200 })

    useMotion().set('full')
    await vi.advanceTimersByTimeAsync(FRAME_MS)
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: -2000 + window.scrollY + readingProgressOf(4) * (SECTION_HEIGHT - VIEWPORT_HEIGHT),
      behavior: 'instant'
    })
  })

  it('al desmontar deja de escuchar el scroll y de observar', async () => {
    const { section, wrapper, observer } = await mountJourney()
    observer.intersect(true)
    wrapper.unmount()
    expect(observer.disconnected).toBe(true)
    await scrollTo(section, -4000)
    expect(section.style.getPropertyValue('--journey-position')).toBe('')
  })
})
