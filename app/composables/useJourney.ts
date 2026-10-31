import type { Ref } from 'vue'
import {
  MOBILE_TIMELINE,
  PINNED_TIMELINE,
  WALK_IDLE_MS,
  isStepping,
  journeyStateAt,
  readingProgressOf,
  scrollProgress,
  type JourneyState,
} from '~~/lib/journey'
import { mobileFrameAt, mobileFrameCssVars } from '~~/lib/mobileJourney'

/** Umbrales del observador de la sección (handoff: 0 / 0,3 / 0,6). */
const VISIBILITY_THRESHOLDS = [0, 0.3, 0.6]
const CARD_SELECTOR = '[data-point-index]'
/** En móvil solo se repinta si el progreso cambia más que esto (spec). */
const MIN_PROGRESS_CHANGE = 0.001

/**
 * Sigue el scroll del recorrido: una vez por fotograma (rAF) y solo con la sección en pantalla,
 * escribe la posición del holograma como variable CSS (`--journey-position`, sin pasar por Vue)
 * y expone el estado (punto, fase), si la zancada avanza, si está en pantalla y si la pestaña está oculta.
 * Con el pin móvil usa su reparto (entrada + 5 tramos) y escribe además las variables del fotograma (scrub).
 * Al pausar o reanudar el movimiento mantiene al usuario en el mismo punto, sin repetir los anteriores.
 */
export function useJourney(section: Readonly<Ref<HTMLElement | null>>, isMobilePinned: Readonly<Ref<boolean>>) {
  const timeline = computed(() => (isMobilePinned.value ? MOBILE_TIMELINE : PINNED_TIMELINE))
  const state = ref<JourneyState>(journeyStateAt(0))
  const isSteppingNow = ref(false)
  const isOnScreen = ref(false)
  const isPageHidden = ref(false)
  const { motion } = useMotion()

  let frame = 0
  let lastScrollAt = 0
  let lastMobileProgress = Number.NEGATIVE_INFINITY
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  let observer: IntersectionObserver | undefined

  function readProgress(element: HTMLElement): number {
    const { top, height } = element.getBoundingClientRect()
    return scrollProgress(top, height, window.innerHeight)
  }

  function update() {
    frame = 0
    const element = section.value
    if (!element) return
    const progress = readProgress(element)
    const next = isMobilePinned.value ? paintMobileFrame(element, progress) : journeyStateAt(progress)
    element.style.setProperty('--journey-position', next.position.toFixed(4))
    if (next.pointIndex !== state.value.pointIndex || next.phase !== state.value.phase) state.value = next
    isSteppingNow.value = isStepping(next.phase, performance.now() - lastScrollAt)
  }

  function paintMobileFrame(element: HTMLElement, progress: number): JourneyState {
    const mobileFrame = mobileFrameAt(progress)
    if (Math.abs(progress - lastMobileProgress) >= MIN_PROGRESS_CHANGE) {
      lastMobileProgress = progress
      for (const [name, value] of Object.entries(mobileFrameCssVars(mobileFrame)))
        element.style.setProperty(name, value)
    }
    return mobileFrame.state
  }

  function requestUpdate() {
    if (frame || !isOnScreen.value) return
    frame = requestAnimationFrame(update)
  }

  /** Cada scroll reactiva la zancada; se pausa WALK_IDLE_MS después del último. */
  function onScroll() {
    lastScrollAt = performance.now()
    requestUpdate()
    clearTimeout(idleTimer)
    idleTimer = setTimeout(requestUpdate, WALK_IDLE_MS)
  }

  function onVisibilityChange() {
    isPageHidden.value = document.hidden
  }

  let pointWhenPaused = 0

  function cardAt(element: HTMLElement, pointIndex: number): HTMLElement | null {
    return element.querySelector<HTMLElement>(`[data-point-index="${pointIndex}"]`)
  }

  function isInViewport(card: HTMLElement | null): boolean {
    const box = card?.getBoundingClientRect()
    return Boolean(box && box.bottom > 0 && box.top < window.innerHeight)
  }

  /** Tarjeta más cercana al centro de la ventana (en la versión estática). */
  function cardNearestToCenter(element: HTMLElement): number {
    const middle = window.innerHeight / 2
    const cards = [...element.querySelectorAll<HTMLElement>(CARD_SELECTOR)]
    const distances = cards.map((card) => {
      const { top, bottom } = card.getBoundingClientRect()
      return Math.abs((top + bottom) / 2 - middle)
    })
    return distances.indexOf(Math.min(...distances))
  }

  /** Al reanudar: el punto donde se pausó si su tarjeta sigue a la vista; si no, la tarjeta más centrada. */
  function pointToResume(element: HTMLElement): number {
    return isInViewport(cardAt(element, pointWhenPaused)) ? pointWhenPaused : cardNearestToCenter(element)
  }

  /** Al cambiar de maqueta (pausar / reanudar) deja a la vista el mismo punto en el que estaba el usuario. */
  async function keepPointInView(wasReduced: boolean) {
    const element = section.value
    if (!element || element.getBoundingClientRect().top >= 0) return
    const pointIndex = wasReduced ? pointToResume(element) : state.value.pointIndex
    if (!wasReduced) pointWhenPaused = pointIndex
    await nextTick()
    requestAnimationFrame(() => {
      if (wasReduced) {
        const sectionTop = element.getBoundingClientRect().top + window.scrollY
        const scrollable = element.offsetHeight - window.innerHeight
        window.scrollTo({
          top: sectionTop + readingProgressOf(pointIndex, timeline.value) * scrollable,
          behavior: 'instant',
        })
      } else {
        cardAt(element, pointIndex)?.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
      update()
    })
  }

  // `sync`: se mide antes de que `<html data-motion>` cambie la maqueta. Si `<html>` ya tiene el valor nuevo
  // (sincronización inicial tras hidratar), la maqueta no cambia y no hay nada que recolocar.
  watch(
    motion,
    (next, previous) => {
      if (readDocumentMotion() !== next) keepPointInView(previous === 'reduced')
    },
    { flush: 'sync' },
  )

  // Al entrar o salir del pin móvil cambia el reparto: repintar todo el fotograma.
  watch(isMobilePinned, () => {
    lastMobileProgress = Number.NEGATIVE_INFINITY
    requestUpdate()
  })

  onMounted(() => {
    if (!section.value) return
    observer = new IntersectionObserver(
      ([entry]) => {
        isOnScreen.value = Boolean(entry?.isIntersecting)
        requestUpdate()
      },
      { threshold: VISIBILITY_THRESHOLDS },
    )
    observer.observe(section.value)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', requestUpdate, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    onVisibilityChange()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
    clearTimeout(idleTimer)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', requestUpdate)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { state, isStepping: isSteppingNow, isOnScreen, isPageHidden }
}
