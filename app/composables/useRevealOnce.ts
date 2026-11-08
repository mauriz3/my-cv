import type { Ref } from 'vue'
import { useReplayable } from './useReplayable'

export type RevealState = 'static' | 'hidden' | 'revealed'

/**
 * Entrada una sola vez al entrar en el viewport (IntersectionObserver).
 * En el servidor y sin JS: «static» (todo visible). Al montar, «hidden» hasta cruzar `threshold`; luego «revealed».
 * El CSS solo oculta y anima con `data-motion="full"`, así que con animaciones apagadas no hay desplazamiento.
 * Al activar, lo que ya se ve vuelve a entrar una vez; lo que no, espera a cruzar el umbral.
 */
export function useRevealOnce(target: Ref<HTMLElement | null>, threshold: number) {
  const state = ref<RevealState>('static')
  let observer: IntersectionObserver | undefined

  function disarm() {
    observer?.disconnect()
    observer = undefined
  }

  function reveal() {
    state.value = 'revealed'
    disarm()
  }

  function arm() {
    const element = target.value
    if (!element || typeof IntersectionObserver === 'undefined') return
    disarm()
    state.value = 'hidden'
    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        reveal()
      },
      { threshold },
    )
    observer.observe(element)
  }

  useReplayable({
    element: () => target.value,
    threshold,
    onEnter: 'once',
    reset() {
      state.value = 'hidden'
    },
    play() {
      state.value = 'hidden'
      void nextTick(() => {
        state.value = 'revealed'
      })
    },
    finish() {
      state.value = 'revealed'
    },
    defer() {
      state.value = 'hidden'
    },
  })

  onMounted(() => {
    if (!target.value || typeof IntersectionObserver === 'undefined') return
    arm()
  })

  onBeforeUnmount(disarm)

  return { state: readonly(state) }
}
