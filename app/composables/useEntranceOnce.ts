/**
 * Entrada animada de una página, una sola vez: `isEntering` vale true desde el montaje y durante `durationMs`
 * si el movimiento está activo. Si se reduce a mitad, termina al momento (el CSS salta al estado final)
 * y al reanudar no vuelve a empezar: lo ya visto no se repite.
 */
export function useEntranceOnce(durationMs: number) {
  const { isReduced } = useMotion()
  const isEntering = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function finish() {
    clearTimeout(timer)
    isEntering.value = false
  }

  onMounted(() => {
    if (readDocumentMotion() === 'reduced') return
    isEntering.value = true
    timer = setTimeout(finish, durationMs)
  })

  watch(isReduced, (reduced) => {
    if (reduced) finish()
  })

  onBeforeUnmount(finish)

  return { isEntering: readonly(isEntering) }
}
