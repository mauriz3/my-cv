import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { MOTION_ATTRIBUTE } from '~~/lib/motion'
import { FakeIntersectionObserver, setBox, stubIntersectionObserver, withSetup } from './helpers'

const ENTRANCE_MS = 600

describe('useEntranceOnce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMotion().set('full')
  })

  afterEach(() => {
    vi.useRealTimers()
    useMotion().set('full')
  })

  it('con movimiento entra al montar y termina pasado su tiempo', async () => {
    const { result } = await withSetup(() => useEntranceOnce(ENTRANCE_MS))
    expect(result.isEntering.value).toBe(true)
    vi.advanceTimersByTime(ENTRANCE_MS - 1)
    expect(result.isEntering.value).toBe(true)
    vi.advanceTimersByTime(1)
    expect(result.isEntering.value).toBe(false)
  })

  it('si se desactivan las animaciones a mitad, termina al momento y al activar vuelve a entrar', async () => {
    const { result } = await withSetup(() => useEntranceOnce(ENTRANCE_MS))
    useMotion().set('reduced')
    await nextTick()
    expect(result.isEntering.value).toBe(false)
    useMotion().set('full')
    await nextTick()
    expect(result.isEntering.value).toBe(true)
    vi.advanceTimersByTime(ENTRANCE_MS)
    expect(result.isEntering.value).toBe(false)
  })

  it('con <html data-motion="reduced"> no hay entrada', async () => {
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'reduced')
    const { result } = await withSetup(() => useEntranceOnce(ENTRANCE_MS))
    expect(result.isEntering.value).toBe(false)
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE)
  })
})

describe('useRevealOnce', () => {
  beforeEach(stubIntersectionObserver)
  afterEach(() => vi.unstubAllGlobals())

  it('se oculta al montar y se revela una sola vez al cruzar el umbral', async () => {
    const target = ref<HTMLElement | null>(document.createElement('section'))
    const { result } = await withSetup(() => useRevealOnce(target, 0.3))
    const observer = FakeIntersectionObserver.last()
    expect(result.state.value).toBe('hidden')
    expect(observer.options?.threshold).toBe(0.3)

    observer.intersect(false)
    expect(result.state.value).toBe('hidden')
    observer.intersect(true)
    expect(result.state.value).toBe('revealed')
    expect(observer.disconnected).toBe(true)
  })

  it('sin elemento o sin IntersectionObserver se queda estático (todo visible)', async () => {
    const { result } = await withSetup(() => useRevealOnce(ref(null), 0.3))
    expect(result.state.value).toBe('static')
    vi.stubGlobal('IntersectionObserver', undefined)
    Reflect.deleteProperty(window, 'IntersectionObserver')
    const { result: withoutObserver } = await withSetup(() => useRevealOnce(ref(document.createElement('div')), 0.3))
    expect(withoutObserver.state.value).toBe('static')
  })

  it('al activar, lo que se ve vuelve a entrar y al desactivar queda en su estado final', async () => {
    vi.stubGlobal('innerHeight', 800)
    const target = ref<HTMLElement | null>(document.createElement('section'))
    setBox(target.value!, { top: 0, height: 200 })
    useMotion().set('reduced')
    const { result } = await withSetup(() => useRevealOnce(target, 0.3))
    useMotion().set('full')
    expect(result.state.value).toBe('hidden')
    await nextTick()
    expect(result.state.value).toBe('revealed')
    useMotion().set('reduced')
    expect(result.state.value).toBe('revealed')
  })

  it('lo que no se ve al activar espera a entrar', async () => {
    vi.stubGlobal('innerHeight', 800)
    const target = ref<HTMLElement | null>(document.createElement('section'))
    setBox(target.value!, { top: 2000, height: 200 })
    useMotion().set('reduced')
    const { result } = await withSetup(() => useRevealOnce(target, 0.3))
    useMotion().set('full')
    expect(result.state.value).toBe('hidden')
    FakeIntersectionObserver.last().intersect(true)
    await nextTick()
    expect(result.state.value).toBe('revealed')
  })

  it('al desmontar deja de observar', async () => {
    const { wrapper } = await withSetup(() => useRevealOnce(ref(document.createElement('div')), 0.3))
    wrapper.unmount()
    expect(FakeIntersectionObserver.last().disconnected).toBe(true)
  })
})
