import type { InjectionKey, Ref } from 'vue'
import {
  MIN_CARD_PROGRESS_CHANGE,
  cardMotionCssVars,
  cardMotionKindOf,
  flowCardProgress,
  mobileFirstCardProgress,
  pinnedCardProgress,
  profileCountProgress,
} from '~~/lib/cardMotion'
import {
  JOURNEY_POINTS,
  MOBILE_TIMELINE,
  PINNED_TIMELINE,
  cardStateAt,
  type JourneyState,
} from '~~/lib/journey'
import { mobileCardStateAt } from '~~/lib/mobileJourney'

/** Avance (0–1) de los contadores de Profile; sin recorrido (u otra página) no se inyecta y cuentan solos. */
export const PROFILE_COUNT_KEY: InjectionKey<Readonly<Ref<number>>> = Symbol('profile-count')

const CARD_SELECTOR = '[data-point-index]'
/** Marca de tarjeta a mitad de animación: solo entonces lleva `will-change`. */
const ACTIVE_ATTRIBUTE = 'data-fx-active'
const WIDE_PIN_QUERY = '(min-width: 768px)'

/**
 * Microanimaciones de las tarjetas del recorrido (Tanda F), en el mismo rAF que el holograma (`useJourney`
 * llama a `paint` en cada fotograma con la sección en pantalla). Para cada tarjeta calcula p (lib/cardMotion)
 * según la maqueta (pin de escritorio/tablet, pin móvil o flujo) y escribe sus variables `--fx-*` solo si
 * p cambia. Con movimiento reducido no escribe nada y quita lo escrito: el CSS pinta el estado final.
 */
export function useCardMotion(isMobilePinned: Readonly<Ref<boolean>>) {
  const { motion } = useMotion()
  /** 1 en el servidor y sin movimiento: los contadores muestran el valor final. */
  const profileCount = ref(1)
  const lastProgress = new Map<number, number>()
  let wideQuery: MediaQueryList | undefined

  function progressOf(card: HTMLElement, index: number, state: JourneyState, journeyProgress: number): number {
    if (isMobilePinned.value) {
      if (index === 0) return mobileFirstCardProgress(journeyProgress)
      return pinnedCardProgress(index, mobileCardStateAt(index, state), state, MOBILE_TIMELINE)
    }
    if (wideQuery?.matches) return pinnedCardProgress(index, cardStateAt(index, state), state, PINNED_TIMELINE)
    return flowCardProgress(card.getBoundingClientRect().top, window.innerHeight)
  }

  function paint(section: HTMLElement, state: JourneyState, journeyProgress: number) {
    if (motion.value !== 'full') return
    for (const card of section.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
      const index = Number(card.dataset.pointIndex)
      const kind = cardMotionKindOf(JOURNEY_POINTS[index]!.id)
      if (!kind) continue
      const progress = progressOf(card, index, state, journeyProgress)
      if (Math.abs(progress - (lastProgress.get(index) ?? Number.NEGATIVE_INFINITY)) < MIN_CARD_PROGRESS_CHANGE) continue
      lastProgress.set(index, progress)
      for (const [name, value] of Object.entries(cardMotionCssVars(kind, progress))) card.style.setProperty(name, value)
      card.toggleAttribute(ACTIVE_ATTRIBUTE, progress > 0 && progress < 1)
      if (kind === 'profile') profileCount.value = profileCountProgress(progress)
    }
  }

  /** Movimiento reducido en caliente: estado final al momento, sin variables ni marcas. */
  function reset(section: HTMLElement | null) {
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

  watch(isMobilePinned, invalidate)

  onMounted(() => {
    wideQuery = window.matchMedia(WIDE_PIN_QUERY)
    wideQuery.addEventListener('change', invalidate)
  })

  onBeforeUnmount(() => wideQuery?.removeEventListener('change', invalidate))

  return { paint, reset, invalidate, profileCount: readonly(profileCount) }
}
