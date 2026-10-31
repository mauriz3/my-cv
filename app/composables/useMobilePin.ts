import type { Ref } from 'vue'
import { MOBILE_PIN_QUERY } from '~~/lib/mobileJourney'

/** Lo pone esta guarda si alguna tarjeta no cabe en su zona: el CSS vuelve a la versión estática. */
const CARDS_FIT_ATTRIBUTE = 'data-cards-fit'
const CARDS_SELECTOR = '.journey__cards'

/**
 * ¿Recorrido móvil con pin? El CSS ya lo activa con la media query (ancho y alto de móvil) y
 * `data-motion="full"`, sin esperar al JS (sin saltos al cargar). Aquí se añade la última guarda de la spec:
 * que la tarjeta más alta quepa en su zona; si no, `data-cards-fit="false"` y versión estática.
 */
export function useMobilePin(section: Readonly<Ref<HTMLElement | null>>) {
  const { motion } = useMotion()
  const matchesViewport = ref(false)
  const cardsFit = ref(true)
  const isMobilePinned = computed(() => matchesViewport.value && motion.value === 'full' && cardsFit.value)
  let viewportQuery: MediaQueryList | undefined

  /** Mide con la maqueta de pin (se quita la marca un instante, sin pintar) y decide. */
  function checkCardsFit() {
    const element = section.value
    if (!element || !matchesViewport.value || readDocumentMotion() !== 'full') return
    element.removeAttribute(CARDS_FIT_ATTRIBUTE)
    const zone = element.querySelector<HTMLElement>(CARDS_SELECTOR)
    const cards = zone ? [...zone.children].filter((card): card is HTMLElement => card instanceof HTMLElement) : []
    cardsFit.value = Boolean(zone) && cards.every((card) => card.offsetHeight <= zone!.clientHeight)
    if (!cardsFit.value) element.setAttribute(CARDS_FIT_ATTRIBUTE, 'false')
  }

  function onViewportChange() {
    matchesViewport.value = Boolean(viewportQuery?.matches)
    checkCardsFit()
  }

  // Al reanudar el movimiento, medir cuando `<html data-motion>` ya ha cambiado.
  watch(motion, () => nextTick(checkCardsFit))

  onMounted(() => {
    viewportQuery = window.matchMedia(MOBILE_PIN_QUERY)
    viewportQuery.addEventListener('change', onViewportChange)
    onViewportChange()
    // Con las fuentes definitivas el texto puede ocupar otra altura.
    document.fonts?.ready.then(checkCardsFit)
  })

  onBeforeUnmount(() => viewportQuery?.removeEventListener('change', onViewportChange))

  return { isMobilePinned }
}
