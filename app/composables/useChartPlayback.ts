import type { Ref } from 'vue'
import { CHART_VISIBLE_RATIO } from '~~/lib/animations'
import { chartAnimation, markChartReplay } from '~/utils/chartOptions'
import { observePendingReplayables, useReplayable } from './useReplayable'

/** Trozo de Chart.js que hace falta para reiniciar sin arrastrar el tipo completo del canvas. */
interface ChartHandle {
  canvas: HTMLCanvasElement | null
  options: { animation?: false | { duration: number; easing: string } }
  reset: () => void
  stop: () => void
  update: (mode?: 'none' | 'default') => void
}

export interface ChartPlaybackRef {
  chart: ChartHandle | null
}

/**
 * Reproducción de una gráfica Chart.js al activar las animaciones.
 * La gráfica no se destruye y los datos no se tocan: si se ve, `reset()` + `update()` en la misma
 * actualización; si no, queda pendiente y anima una sola vez al entrar.
 * Tema, idioma y resize no reinician: el modo de actualización pasa a `none`.
 */
export function useChartPlayback(durationMs: number, extraQuiet?: Readonly<Ref<'none' | 'default'>>) {
  const chartRef = ref<ChartPlaybackRef | null>(null)
  const { isReduced } = useMotion()
  const hold = ref(false)
  const quiet = ref(false)
  const colorMode = useColorMode()
  const { locale } = useI18n()

  const updateMode = computed<'none' | 'default'>(() => {
    if (quiet.value || hold.value || isReduced.value || extraQuiet?.value === 'none') return 'none'
    return 'default'
  })

  function instance(): ChartHandle | null {
    return chartRef.value?.chart ?? null
  }

  useReplayable({
    element: () => instance()?.canvas ?? null,
    threshold: CHART_VISIBLE_RATIO,
    onEnter: 'once',
    reset() {
      instance()?.reset()
    },
    play(source) {
      const chart = instance()
      hold.value = false
      if (!chart) return
      markChartReplay(chart)
      chart.options.animation = chartAnimation(false, durationMs)
      if (source === 'enter') chart.update()
    },
    finish() {
      hold.value = false
      const chart = instance()
      if (!chart) return
      chart.options.animation = false
      chart.stop()
      chart.update('none')
    },
    defer() {
      hold.value = true
    },
  })

  async function quietForRender() {
    quiet.value = true
    await nextTick()
    await nextTick()
    quiet.value = false
  }

  watch(() => colorMode.value, () => void quietForRender())
  watch(locale, () => void quietForRender())
  watch(chartRef, () => observePendingReplayables())

  return { chartRef, updateMode }
}
