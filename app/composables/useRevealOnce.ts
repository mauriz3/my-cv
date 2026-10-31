import type { Ref } from 'vue'

export type RevealState = 'static' | 'hidden' | 'revealed'

/**
 * Entrada una sola vez al entrar en el viewport (IntersectionObserver).
 * En el servidor y sin JS: «static» (todo visible). Al montar, «hidden» hasta cruzar `threshold`; luego «revealed».
 * El CSS solo oculta y anima con `data-motion="full"`, así que con movimiento reducido no hay desplazamiento.
 */
export function useRevealOnce(target: Ref<HTMLElement | null>, threshold: number) {
  const state = ref<RevealState>('static')
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    if (!target.value || !('IntersectionObserver' in window)) return
    state.value = 'hidden'
    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        state.value = 'revealed'
        observer?.disconnect()
      },
      { threshold },
    )
    observer.observe(target.value)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { state: readonly(state) }
}
