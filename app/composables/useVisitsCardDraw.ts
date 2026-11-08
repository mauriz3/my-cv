import type { Ref } from 'vue'
import { clamp01, easeInOutCubic as easeDraw } from '~~/lib/easing'
import type { CardState } from '~~/lib/journey'

/** Desktop and tablet (by time): the mini-graph starts after the card and lasts as long as the spec sequence. */
const DESKTOP_DRAW_DELAY_MS = 450
const DESKTOP_DRAW_MS = 1050
const WIDE_PIN_QUERY = '(min-width: 768px)'

/**
 * Advance (0–1) of the drawing of the "Visits" card of the tour (mini-graph, donut and account of the KPIs)
 * and if the "View Visits" button should be pressed.
 * · Mobile with pin: it is scrolled (`mobileDraw`, from the frame); press once when completed.
 * · Tablet and desktop with pin: by time, each time the card becomes the current one; press when finished.
 * · Static (reduced movement, guards, without JS): drawn completely and without a pulse.
 */
export function useVisitsCardDraw(options: {
  cardState: Readonly<Ref<CardState>>
  isMobilePinned: Readonly<Ref<boolean>>
  mobileDraw: Readonly<Ref<number>>
}) {
  const { cardState, isMobilePinned, mobileDraw } = options
  const { motion } = useMotion()
  const draw = ref(1)
  const pulse = ref(false)
  const isWide = ref(false)
  let frame = 0
  let delayTimer: ReturnType<typeof setTimeout> | undefined
  let wideQuery: MediaQueryList | undefined

  const isWidePinned = computed(() => isWide.value && motion.value === 'full')

  function stopTween() {
    cancelAnimationFrame(frame)
    clearTimeout(delayTimer)
  }

  function startTween() {
    stopTween()
    draw.value = 0
    pulse.value = false
    delayTimer = setTimeout(() => {
      const startTime = performance.now()
      const step = (time: number) => {
        const progress = clamp01((time - startTime) / DESKTOP_DRAW_MS)
        draw.value = easeDraw(progress)
        if (progress < 1) frame = requestAnimationFrame(step)
        else pulse.value = true
      }
      frame = requestAnimationFrame(step)
    }, DESKTOP_DRAW_DELAY_MS)
  }

  function sync() {
    if (isMobilePinned.value) {
      stopTween()
      draw.value = mobileDraw.value
      if (mobileDraw.value <= 0) pulse.value = false
      else if (mobileDraw.value >= 1) pulse.value = true
    } else if (isWidePinned.value) {
      if (cardState.value === 'current') startTween()
      else {
        stopTween()
        draw.value = 0
        pulse.value = false
      }
    } else {
      stopTween()
      draw.value = 1
      pulse.value = false
    }
  }

  function onWideChange() {
    isWide.value = Boolean(wideQuery?.matches)
  }

  onMounted(() => {
    wideQuery = window.matchMedia(WIDE_PIN_QUERY)
    wideQuery.addEventListener('change', onWideChange)
    onWideChange()
    watch([cardState, isMobilePinned, isWidePinned], sync, { immediate: true })
    watch(mobileDraw, () => {
      if (isMobilePinned.value) sync()
    })
  })

  onBeforeUnmount(() => {
    stopTween()
    wideQuery?.removeEventListener('change', onWideChange)
  })

  return { draw: readonly(draw), pulse: readonly(pulse) }
}
