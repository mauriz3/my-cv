import { useReplayable } from './useReplayable'

/**
 * Animated entry of a page, only once when riding if animations are active.
 * Al desactivar termina al momento. Al volver a activar, se repite una sola vez.
 */
export function useEntranceOnce(durationMs: number) {
  const { isReduced } = useMotion()
  const isEntering = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function finish() {
    clearTimeout(timer)
    isEntering.value = false
  }

  function play() {
    finish()
    void nextTick(() => {
      if (isReduced.value) return
      isEntering.value = true
      timer = setTimeout(finish, durationMs)
    })
  }

  useReplayable({
    element: () => document.documentElement,
    threshold: 0,
    onEnter: 'skip',
    reset: finish,
    play,
    finish,
  })

  onMounted(() => {
    if (isReduced.value || readDocumentMotion() === 'reduced') return
    isEntering.value = true
    timer = setTimeout(finish, durationMs)
  })

  onBeforeUnmount(finish)

  return { isEntering: readonly(isEntering) }
}
