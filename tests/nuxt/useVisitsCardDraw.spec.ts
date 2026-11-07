import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { CardState } from '~~/lib/journey'
import { stubMatchMedia, withSetup } from './helpers'

const WIDE_QUERY = '(min-width: 768px)'
/** Retardo + duración del dibujo por tiempo en escritorio y tablet (con margen de un fotograma). */
const DESKTOP_DRAW_TOTAL_MS = 450 + 1050 + 50

async function mountDraw(options: { wide: boolean; mobilePinned: boolean; cardState?: CardState }) {
  const media = stubMatchMedia({ [WIDE_QUERY]: options.wide })
  const cardState = ref<CardState>(options.cardState ?? 'upcoming')
  const isMobilePinned = ref(options.mobilePinned)
  const mobileDraw = ref(0)
  const { result, wrapper } = await withSetup(() => useVisitsCardDraw({ cardState, isMobilePinned, mobileDraw }))
  return { ...result, cardState, isMobilePinned, mobileDraw, media, wrapper }
}

describe('useVisitsCardDraw', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMotion().set('full')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sin pin (estático) está dibujada del todo y no pulsa', async () => {
    const { draw, pulse } = await mountDraw({ wide: false, mobilePinned: false })
    expect(draw.value).toBe(1)
    expect(pulse.value).toBe(false)
  })

  it('en móvil con pin sigue al scroll y pulsa al completarse', async () => {
    const { draw, pulse, mobileDraw } = await mountDraw({ wide: false, mobilePinned: true })
    expect(draw.value).toBe(0)
    mobileDraw.value = 0.5
    await nextTick()
    expect(draw.value).toBe(0.5)
    expect(pulse.value).toBe(false)
    mobileDraw.value = 1
    await nextTick()
    expect(pulse.value).toBe(true)
    mobileDraw.value = 0
    await nextTick()
    expect(pulse.value).toBe(false)
  })

  it('en escritorio con pin se dibuja por tiempo al ser la tarjeta actual y pulsa al acabar', async () => {
    const { draw, pulse, cardState } = await mountDraw({ wide: true, mobilePinned: false })
    expect(draw.value).toBe(0)
    cardState.value = 'current'
    await nextTick()
    expect(draw.value).toBe(0)
    await vi.advanceTimersByTimeAsync(DESKTOP_DRAW_TOTAL_MS)
    expect(draw.value).toBe(1)
    expect(pulse.value).toBe(true)

    cardState.value = 'past'
    await nextTick()
    expect(draw.value).toBe(0)
    expect(pulse.value).toBe(false)
  })

  it('al pasar de escritorio a ancho móvil sin pin vuelve al estado estático', async () => {
    const { draw, media, wrapper } = await mountDraw({ wide: true, mobilePinned: false, cardState: 'past' })
    expect(draw.value).toBe(0)
    media.setMatches(WIDE_QUERY, false)
    await nextTick()
    expect(draw.value).toBe(1)
    wrapper.unmount()
    expect(media.listenerCount(WIDE_QUERY)).toBe(0)
  })

  it('con movimiento reducido en escritorio, dibujada del todo', async () => {
    useMotion().set('reduced')
    const { draw } = await mountDraw({ wide: true, mobilePinned: false, cardState: 'current' })
    expect(draw.value).toBe(1)
  })
})
