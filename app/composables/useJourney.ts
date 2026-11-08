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

/** Section observer thresholds (handoff: 0 / 0.3 / 0.6). */
const VISIBILITY_THRESHOLDS = [0, 0.3, 0.6]
const CARD_SELECTOR = '[data-point-index]'
/** On mobile it is only repainted if the progress changes more than this (spec). */
const MIN_PROGRESS_CHANGE = 0.001

/**
 * Follow the scroll of the tour: once per frame (rAF) and only with the section on screen,
 * write the hologram position as CSS variable (`--journey-position`, bypassing Vue)
 * and exposes the status (point, phase), if the stride advances, if it is on screen and if the tab is hidden.
 * With the mobile pin, use its distribution (input + 6 sections) and also write the variables of the frame (scrub)
 * and exposes the drawing of the Visits card (`visitsDraw'), which is also linked to the scroll.
 * Al pausar o reanudar el movimiento mantiene al usuario en el mismo punto, sin repetir los anteriores.
 * `onFrame`: extra work in the same frame (micro animations of the cards): a single rAF for everything.
 */
export function useJourney(
  section: Readonly<Ref<HTMLElement | null>>,
  isMobilePinned: Readonly<Ref<boolean>>,
  options: { onFrame?: (element: HTMLElement, state: JourneyState, progress: number) => void } = {},
) {
  const timeline = computed(() => (isMobilePinned.value ? MOBILE_TIMELINE : PINNED_TIMELINE))
  const state = ref<JourneyState>(journeyStateAt(0))
  const isSteppingNow = ref(false)
  const isOnScreen = ref(false)
  const isPageHidden = ref(false)
  const visitsDraw = ref(0)
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
    options.onFrame?.(element, next, progress)
  }

  function paintMobileFrame(element: HTMLElement, progress: number): JourneyState {
    const mobileFrame = mobileFrameAt(progress)
    if (Math.abs(progress - lastMobileProgress) >= MIN_PROGRESS_CHANGE) {
      lastMobileProgress = progress
      for (const [name, value] of Object.entries(mobileFrameCssVars(mobileFrame)))
        element.style.setProperty(name, value)
      if (mobileFrame.visitsDraw !== visitsDraw.value) visitsDraw.value = mobileFrame.visitsDraw
    }
    return mobileFrame.state
  }

  function requestUpdate() {
    if (frame || !isOnScreen.value) return
    frame = requestAnimationFrame(update)
  }

  /** Each scroll reactivates the stride; WALK_IDLE_MS is paused after the last one. */
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

  /** Card closest to the center of the window (in the static version). */
  function cardNearestToCenter(element: HTMLElement): number {
    const middle = window.innerHeight / 2
    const cards = [...element.querySelectorAll<HTMLElement>(CARD_SELECTOR)]
    const distances = cards.map((card) => {
      const { top, bottom } = card.getBoundingClientRect()
      return Math.abs((top + bottom) / 2 - middle)
    })
    return distances.indexOf(Math.min(...distances))
  }

  /** When resuming: the point where it was paused if your card is still in view; if not, the most centered card. */
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

  /**
   * Leads to the end of the tour (last point, Visits card visible): when your button receives the focus
   * of the keyboard with the stage set. In the static version, the browser already leaves it visible.
   */
  function revealLastPoint() {
    const element = section.value
    const stage = element?.firstElementChild
    if (!element || !stage || getComputedStyle(stage).position !== 'sticky') return
    const sectionTop = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: sectionTop + element.offsetHeight - window.innerHeight, behavior: 'instant' })
  }

  // `sync`: se mide antes de que `<html data-motion>` cambie la maqueta. Si `<html>` ya tiene el valor nuevo
  // (initial synchronization after hydrating), the model does not change and there is nothing to reposition.
  watch(
    motion,
    (next, previous) => {
      if (readDocumentMotion() !== next) keepPointInView(previous === 'reduced')
    },
    { flush: 'sync' },
  )

  // When entering or leaving the mobile pin, the distribution changes: repaint the entire frame.
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

  return { state, isStepping: isSteppingNow, isOnScreen, isPageHidden, visitsDraw, revealLastPoint }
}
