import type { Ref } from 'vue'
import { CHART_VISIBLE_RATIO } from '~~/lib/animations'
import { chartAnimation, markChartReplay } from '~/utils/chartOptions'
import { observePendingReplayables, useReplayable } from './useReplayable'

/** Chart.js slice needed to restart animation without importing the full canvas type. */
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
 * Playing a Chart.js chart when animations are activated.
 * The graph is not destroyed and the data is not touched: if seen, `reset()` + `update()` in it
 * update; if not, it is pending and encourages only once when entering.
 * Theme, language and resize do not restart: the update mode changes to `none`.
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
