import type { Ref } from 'vue'

/** Clase en la raíz cuando el navegador no tiene `animation-timeline: view()`: entonces revela este observador. */
export const REVEAL_FALLBACK_CLASS = 'reveal-fallback'
export const REVEALED_CLASS = 'is-revealed'
const VIEW_TIMELINE_SUPPORT = '(animation-timeline: view())'
const REVEAL_THRESHOLD = 0.2

/**
 * Plan B de las entradas ligadas al scroll: si el CSS no puede usar `view()`, marca la raíz
 * y añade `.is-revealed` a cada elemento de `selector` al entrar en pantalla (una sola vez).
 * Con menos movimiento el CSS ignora todo esto y lo muestra todo.
 */
export function useRevealFallback(root: Readonly<Ref<HTMLElement | null>>, selector: string) {
  let observer: IntersectionObserver | undefined

  function reveal(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add(REVEALED_CLASS)
      observer?.unobserve(entry.target)
    }
  }

  onMounted(() => {
    if (!root.value || CSS.supports(VIEW_TIMELINE_SUPPORT)) return
    root.value.classList.add(REVEAL_FALLBACK_CLASS)
    observer = new IntersectionObserver(reveal, { threshold: REVEAL_THRESHOLD })
    root.value.querySelectorAll(selector).forEach((element) => observer?.observe(element))
  })

  onBeforeUnmount(() => observer?.disconnect())
}
