import type { InjectionKey, Ref } from 'vue'
import {
  SCENE_CATCH_UP_MS,
  SCENE_VISIBLE_RATIO,
  catchUpShown,
  intersectionRatio,
  meetsVisibility,
} from '~~/lib/animations'
import {
  MIN_CARD_PROGRESS_CHANGE,
  cardMotionCssVars,
  cardMotionKindOf,
  flowCardProgress,
  mobileFirstCardProgress,
  pinnedCardProgress,
  profileCounterProgress,
  profileMotionOptions,
  type CardMotionKind,
} from '~~/lib/cardMotion'
import {
  JOURNEY_POINTS,
  MOBILE_TIMELINE,
  PINNED_TIMELINE,
  cardStateAt,
  type CardState,
  type JourneyState,
  type JourneyTimeline,
} from '~~/lib/journey'
import { mobileCardStateAt } from '~~/lib/mobileJourney'
import { useReplayable } from './useReplayable'

/** Avance (0–1) de los contadores de Profile; sin recorrido (u otra página) no se inyecta y cuentan solos. */
export const PROFILE_COUNT_KEY: InjectionKey<Readonly<Ref<number>>> = Symbol('profile-count')

const CARD_SELECTOR = '[data-point-index]'
/** Marca de tarjeta a mitad de animación: solo entonces lleva `will-change`. */
const ACTIVE_ATTRIBUTE = 'data-fx-active'
const WIDE_PIN_QUERY = '(min-width: 768px)'

interface LiveFrame {
  section: HTMLElement
  state: JourneyState
  journeyProgress: number
}

/**
 * Microanimaciones de las tarjetas del recorrido, en el mismo rAF que el holograma (`useJourney`
 * llama a `paint` en cada fotograma con la sección en pantalla). Para cada tarjeta calcula p (lib/cardMotion)
 * según la maqueta (pin de escritorio/tablet, pin móvil o flujo) y escribe sus variables `--fx-*` solo si
 * p cambia. Con animaciones apagadas no escribe nada y quita lo escrito: el CSS pinta el estado final.
 * Al activar, las tarjetas visibles hacen un catch-up de 0 a su p real en 450 ms, sin mover el scroll.
 */
export function useCardMotion(
  isMobilePinned: Readonly<Ref<boolean>>,
  sectionRef?: Readonly<Ref<HTMLElement | null>>,
) {
  const { motion } = useMotion()
  /** 1 en el servidor y sin animación: los contadores muestran el valor final. */
  const profileCount = ref(1)
  const lastProgress = new Map<number, number>()
  const catchingIndexes = new Set<number>()
  let wideQuery: MediaQueryList | undefined
  let latest: LiveFrame | null = null
  let catchingUp = false
  let catchFrame = 0

  function timelineOf(): JourneyTimeline {
    if (isMobilePinned.value) return MOBILE_TIMELINE
    if (wideQuery?.matches) return PINNED_TIMELINE
    return PINNED_TIMELINE
  }

  function cardStateOf(index: number, state: JourneyState): CardState {
    if (isMobilePinned.value) return mobileCardStateAt(index, state)
    if (wideQuery?.matches) return cardStateAt(index, state)
    return index === state.pointIndex ? 'current' : index < state.pointIndex ? 'past' : 'upcoming'
  }

  function progressOf(card: HTMLElement, index: number, state: JourneyState, journeyProgress: number): number {
    if (isMobilePinned.value) {
      if (index === 0) {
        const entry = mobileFirstCardProgress(journeyProgress)
        const onPoint = pinnedCardProgress(0, mobileCardStateAt(0, state), state, MOBILE_TIMELINE)
        return Math.min(1, Math.max(entry, onPoint))
      }
      return pinnedCardProgress(index, mobileCardStateAt(index, state), state, MOBILE_TIMELINE)
    }
    if (wideQuery?.matches) return pinnedCardProgress(index, cardStateAt(index, state), state, PINNED_TIMELINE)
    return flowCardProgress(card.getBoundingClientRect().top, window.innerHeight)
  }

  function writeProgress(
    card: HTMLElement,
    index: number,
    kind: CardMotionKind,
    progress: number,
    state: JourneyState,
    journeyProgress: number,
  ) {
    lastProgress.set(index, progress)
    const timeline = timelineOf()
    const journeyPinned = isMobilePinned.value || !!wideQuery?.matches
    const options = profileMotionOptions(
      index,
      kind,
      cardStateOf(index, state),
      state,
      journeyProgress,
      timeline,
      journeyPinned,
    )
    for (const [name, value] of Object.entries(cardMotionCssVars(kind, progress, options)))
      card.style.setProperty(name, value)
    card.toggleAttribute(ACTIVE_ATTRIBUTE, progress > 0 && progress < 1)
    if (kind === 'profile') profileCount.value = profileCounterProgress(progress, options)
  }

  function eachCard(section: HTMLElement, visit: (card: HTMLElement, index: number, kind: CardMotionKind) => void) {
    for (const card of section.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
      const index = Number(card.dataset.pointIndex)
      const point = JOURNEY_POINTS[index]
      if (!point) continue
      const kind = cardMotionKindOf(point.id)
      if (!kind) continue
      visit(card, index, kind)
    }
  }

  function paint(section: HTMLElement, state: JourneyState, journeyProgress: number) {
    latest = { section, state, journeyProgress }
    if (catchingUp || motion.value !== 'full') return
    eachCard(section, (card, index, kind) => {
      const progress = progressOf(card, index, state, journeyProgress)
      if (Math.abs(progress - (lastProgress.get(index) ?? Number.NEGATIVE_INFINITY)) < MIN_CARD_PROGRESS_CHANGE) return
      writeProgress(card, index, kind, progress, state, journeyProgress)
    })
  }

  function cancelCatchUpFrame() {
    if (!catchFrame) return
    cancelAnimationFrame(catchFrame)
    catchFrame = 0
  }

  /** Visibles con p > 0: de 0 a pLive. El resto (fuera o ya en 0): pLive ya, sin tween. */
  function beginCatchUp() {
    if (!latest || motion.value !== 'full') return
    cancelCatchUpFrame()
    catchingIndexes.clear()
    catchingUp = false
    const frame = latest
    eachCard(frame.section, (card, index, kind) => {
      const pLive = progressOf(card, index, frame.state, frame.journeyProgress)
      const box = card.getBoundingClientRect()
      const visible = meetsVisibility(intersectionRatio(box.top, box.bottom, window.innerHeight), SCENE_VISIBLE_RATIO)
      if (visible && pLive > 0) catchingIndexes.add(index)
      writeProgress(card, index, kind, visible && pLive > 0 ? 0 : pLive, frame.state, frame.journeyProgress)
    })
    if (catchingIndexes.size === 0) return
    catchingUp = true
    const startedAt = performance.now()
    const step = (now: number) => {
      catchFrame = 0
      if (!catchingUp || !latest) return
      const elapsed = now - startedAt
      const current = latest
      eachCard(current.section, (card, index, kind) => {
        const pLive = progressOf(card, index, current.state, current.journeyProgress)
        const progress = catchingIndexes.has(index) ? catchUpShown(elapsed, pLive) : pLive
        writeProgress(card, index, kind, progress, current.state, current.journeyProgress)
      })
      if (elapsed < SCENE_CATCH_UP_MS) catchFrame = requestAnimationFrame(step)
      else {
        catchingUp = false
        catchingIndexes.clear()
      }
    }
    catchFrame = requestAnimationFrame(step)
  }

  /** Animaciones apagadas: estado final al momento, sin variables ni marcas. */
  function reset(section: HTMLElement | null) {
    cancelCatchUpFrame()
    catchingUp = false
    catchingIndexes.clear()
    lastProgress.clear()
    profileCount.value = 1
    for (const card of section?.querySelectorAll<HTMLElement>(CARD_SELECTOR) ?? []) {
      for (const name of [...card.style]) if (name.startsWith('--fx-')) card.style.removeProperty(name)
      card.removeAttribute(ACTIVE_ATTRIBUTE)
    }
  }

  /** Al cambiar de maqueta (pin ↔ flujo) hay que recalcular todas las tarjetas. */
  function invalidate() {
    lastProgress.clear()
  }

  useReplayable({
    element: () => sectionRef?.value ?? latest?.section ?? null,
    threshold: SCENE_VISIBLE_RATIO,
    onEnter: 'skip',
    reset() {},
    play: beginCatchUp,
    finish() {
      reset(sectionRef?.value ?? latest?.section ?? null)
    },
  })

  watch(isMobilePinned, invalidate)

  onMounted(() => {
    wideQuery = window.matchMedia(WIDE_PIN_QUERY)
    wideQuery.addEventListener('change', invalidate)
  })

  onBeforeUnmount(() => wideQuery?.removeEventListener('change', invalidate))

  return { paint, reset, invalidate, profileCount: readonly(profileCount) }
}
