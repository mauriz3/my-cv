import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, watch } from 'vue'
import { useChartPlayback, type ChartPlaybackRef } from '~/composables/useChartPlayback'
import { finishAnimations } from '~/composables/useReplayable'
import { FakeIntersectionObserver, setBox, stubIntersectionObserver, withSetup } from './helpers'

const DURATION_MS = 700

function mockChart(top: number) {
  const canvas = document.createElement('canvas')
  setBox(canvas, { top, height: 100 })
  return {
    canvas,
    options: { animation: false as false | { duration: number; easing: string } },
    reset: vi.fn(),
    stop: vi.fn(),
    update: vi.fn(),
  }
}

describe('useChartPlayback', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', 800)
    stubIntersectionObserver()
    useMotion().set('reduced')
    finishAnimations()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('visible chart is marked to restart on the same update', async () => {
    const chart = mockChart(0)
    const { result } = await withSetup(() => useChartPlayback(DURATION_MS))
    result.chartRef.value = { chart } as ChartPlaybackRef
    useMotion().set('full')

    expect(chart.reset).toHaveBeenCalledOnce()
    expect(chart.update).not.toHaveBeenCalled()
    expect(chart.options.animation).toEqual({ duration: DURATION_MS, easing: 'easeOutQuart' })
    expect(result.updateMode.value).toBe('default')
  })

  it('off-screen chart waits to enter viewport and animates once', async () => {
    const chart = mockChart(2000)
    const { result } = await withSetup(() => useChartPlayback(DURATION_MS))
    result.chartRef.value = { chart } as ChartPlaybackRef
    useMotion().set('full')

    expect(result.updateMode.value).toBe('none')
    expect(chart.update).not.toHaveBeenCalled()
    FakeIntersectionObserver.last().intersect(true)
    expect(chart.update).toHaveBeenCalledOnce()
    expect(chart.options.animation).toEqual({ duration: DURATION_MS, easing: 'easeOutQuart' })

    useMotion().set('reduced')
    expect(chart.stop).toHaveBeenCalled()
    expect(chart.update).toHaveBeenCalledWith('none')
    expect(chart.options.animation).toBe(false)
  })

  it('when chart is missing on enable, observes once it appears', async () => {
    const { result } = await withSetup(() => useChartPlayback(DURATION_MS))
    useMotion().set('full')
    expect(result.updateMode.value).toBe('none')

    const chart = mockChart(0)
    result.chartRef.value = { chart } as ChartPlaybackRef
    await nextTick()
    FakeIntersectionObserver.last().intersect(true)
    expect(chart.update).toHaveBeenCalledOnce()
  })

  it('theme, locale, and an external mode set the next update to none', async () => {
    const extra = ref<'none' | 'default'>('default')
    const chart = mockChart(0)
    const { result } = await withSetup(() => ({
      playback: useChartPlayback(DURATION_MS, extra),
      colorMode: useColorMode(),
      i18n: useI18n(),
    }))
    result.playback.chartRef.value = { chart } as ChartPlaybackRef
    useMotion().set('full')
    expect(result.playback.updateMode.value).toBe('default')

    extra.value = 'none'
    expect(result.playback.updateMode.value).toBe('none')
    extra.value = 'default'
    expect(result.playback.updateMode.value).toBe('default')

    const modes: string[] = []
    watch(result.playback.updateMode, (mode) => modes.push(mode), { flush: 'sync' })
    result.colorMode.preference = result.colorMode.value === 'dark' ? 'light' : 'dark'
    await nextTick()
    await nextTick()
    result.i18n.locale.value = result.i18n.locale.value === 'en' ? 'es' : 'en'
    await vi.waitFor(() => expect(modes).toEqual(['none', 'default', 'none', 'default']))
  })
})
