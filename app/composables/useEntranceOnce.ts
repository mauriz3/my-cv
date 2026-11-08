import { useReplayable } from './useReplayable'

/**
 * Entrada animada de una página, una sola vez al montar si las animaciones están activas.
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
