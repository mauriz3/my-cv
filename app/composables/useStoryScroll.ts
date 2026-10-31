import type { Ref } from 'vue'
import { holoPoseAt, scrollProgress, stageAt, type StoryStage } from '~~/lib/story'

/** Umbrales del observador: avisa al entrar, al salir y en cada cuarto visible. */
const VISIBILITY_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1]

/**
 * Sigue el scroll de la sección del storytelling: escribe `--p` y la pose del holograma como variables CSS
 * (sin pasar por Vue en cada fotograma) y expone el tramo activo, si la sección está en pantalla
 * y si la pestaña está oculta. Solo calcula con la sección en pantalla, una vez por fotograma (rAF).
 * El CSS decide si usa esas variables (solo con pin y movimiento).
 */
export function useStoryScroll(section: Readonly<Ref<HTMLElement | null>>) {
  const stage = ref<StoryStage>(stageAt(0))
  const isOnScreen = ref(false)
  const isPageHidden = ref(false)

  let frame = 0
  let observer: IntersectionObserver | undefined

  function update() {
    frame = 0
    const element = section.value
    if (!element) return
    const { top, height } = element.getBoundingClientRect()
    const progress = scrollProgress(top, height, window.innerHeight)
    const pose = holoPoseAt(progress)
    element.style.setProperty('--p', progress.toFixed(4))
    element.style.setProperty('--holo-scale', pose.scale.toFixed(3))
    element.style.setProperty('--holo-x', `${pose.xPercent.toFixed(2)}%`)
    element.style.setProperty('--holo-y', `${pose.yPx.toFixed(1)}px`)
    const current = stageAt(progress)
    if (current.id !== stage.value.id) stage.value = current
  }

  function requestUpdate() {
    if (frame || !isOnScreen.value) return
    frame = requestAnimationFrame(update)
  }

  function onVisibilityChange() {
    isPageHidden.value = document.hidden
  }

  onMounted(() => {
    if (!section.value) return
    observer = new IntersectionObserver(
      ([entry]) => {
        isOnScreen.value = Boolean(entry?.isIntersecting)
        requestUpdate()
      },
      { threshold: VISIBILITY_THRESHOLDS },
    )
    observer.observe(section.value)
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    onVisibilityChange()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', requestUpdate)
    window.removeEventListener('resize', requestUpdate)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { stage, isOnScreen, isPageHidden }
}
