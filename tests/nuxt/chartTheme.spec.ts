import { describe, expect, it, vi } from 'vitest'
import { watch } from 'vue'
import {
  CHART_FONT_SIZE_PX,
  baseChartOptions,
  categoryAxis,
  chartAnimation,
  chartTooltip,
  finishAnimationsWhenDisabled,
  markChartReplay,
  valueAxis
} from '~/utils/chartOptions'
import type { ChartTheme } from '~/composables/useChartTheme'
import { withSetup } from './helpers'

const THEME: ChartTheme = {
  series: ['#1', '#2', '#3', '#4', '#5'],
  sequential: 'rgba(0,0,0,.5)',
  grid: '#grid',
  text: '#text',
  muted: '#muted',
  surface: '#surface',
  font: 'Inter'
}

describe('opciones comunes de las gráficas', () => {
  it('con movimiento reducido no anima; si no, anima la duración pedida', () => {
    expect(chartAnimation(true, 800)).toBe(false)
    expect(chartAnimation(false, 800)).toEqual({ duration: 800, easing: 'easeOutQuart' })
    expect(baseChartOptions(THEME, true, 800).animation).toBe(false)
    expect(baseChartOptions(THEME, false, 800).transitions.resize.animation.duration).toBe(0)
  })

  it('el tooltip invierte el contraste del tema y las gráficas no pintan leyenda en el canvas', () => {
    const tooltip = chartTooltip(THEME)
    expect(tooltip.backgroundColor).toBe(THEME.text)
    expect(tooltip.bodyColor).toBe(THEME.surface)
    expect(tooltip.bodyFont).toEqual({ family: 'Inter', size: CHART_FONT_SIZE_PX })
    expect(baseChartOptions(THEME, false, 800).plugins.legend.display).toBe(false)
  })

  it('ejes: categorías sin rejilla; valores desde 0 con la rejilla del tema', () => {
    expect(categoryAxis(THEME).grid.display).toBe(false)
    expect(categoryAxis(THEME).border.color).toBe(THEME.grid)
    expect(valueAxis(THEME)).toMatchObject({ beginAtZero: true, grid: { color: THEME.grid }, ticks: { maxTicksLimit: 5 } })
  })

  it('al llegar animation: false para la animación en curso', () => {
    const stop = vi.fn()
    const beforeUpdate = finishAnimationsWhenDisabled.beforeUpdate!.bind(finishAnimationsWhenDisabled)
    beforeUpdate({ options: { animation: false }, stop } as never, {} as never, {})
    expect(stop).toHaveBeenCalledOnce()
    beforeUpdate({ options: { animation: { duration: 1 } }, stop } as never, {} as never, {})
    expect(stop).toHaveBeenCalledOnce()
  })

  it('si está marcada, la siguiente actualización la devuelve a su base una sola vez', () => {
    const reset = vi.fn()
    const chart = { options: { animation: { duration: 1 } }, stop: vi.fn(), reset }
    markChartReplay(chart)
    const beforeUpdate = finishAnimationsWhenDisabled.beforeUpdate!.bind(finishAnimationsWhenDisabled)
    beforeUpdate(chart as never, {} as never, {})
    expect(reset).toHaveBeenCalledOnce()
    beforeUpdate(chart as never, {} as never, {})
    expect(reset).toHaveBeenCalledOnce()
  })
})

describe('useChartTheme', () => {
  it('lee los tokens del tema al montar y otra vez, sin animar, al cambiar claro/oscuro', async () => {
    const root = document.documentElement.style
    root.setProperty('--ui-primary', '#0969da')
    root.setProperty('--ui-border', '#d0d7de')
    const { result } = await withSetup(() => ({ chart: useChartTheme(), colorMode: useColorMode() }))
    const { theme, updateMode } = result.chart
    expect(theme.value?.series[0]).toBe('#0969da')
    expect(theme.value?.grid).toBe('#d0d7de')

    const modes: string[] = []
    watch(updateMode, (mode) => modes.push(mode), { flush: 'sync' })
    root.setProperty('--ui-primary', '#58a6ff')
    result.colorMode.preference = result.colorMode.value === 'dark' ? 'light' : 'dark'
    await vi.waitFor(() => expect(theme.value?.series[0]).toBe('#58a6ff'))
    await vi.waitFor(() => expect(modes).toEqual(['none', 'default']))
  })
})
