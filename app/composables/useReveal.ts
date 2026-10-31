import type { Ref } from 'vue'

/** Clase en la raíz cuando el JS va a revelar: solo entonces existe el estado oculto en el CSS. */
export const REVEAL_ENABLED_CLASS = 'reveal-enabled'
export const REVEALED_CLASS = 'is-revealed'
const REVEAL_THRESHOLD = 0.2

/**
 * Entrada de capas por tiempo (700 ms) al entrar en pantalla, una sola vez.
 * Va por IntersectionObserver y no ligada al scroll (`view()`): así ninguna posición de scroll deja
 * texto a medio fundir (contraste < 4,5:1). Con menos movimiento el CSS lo muestra todo.
 */
export function useReveal(root: Readonly<Ref<HTMLElement | null>>, selector: string) {
  let observer: IntersectionObserver | undefined

  function reveal(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add(REVEALED_CLASS)
      observer?.unobserve(entry.target)
    }
  }

  onMounted(() => {
    if (!root.value) return
    root.value.classList.add(REVEAL_ENABLED_CLASS)
    observer = new IntersectionObserver(reveal, { threshold: REVEAL_THRESHOLD })
    root.value.querySelectorAll(selector).forEach((element) => observer?.observe(element))
  })

  onBeforeUnmount(() => observer?.disconnect())
}
