import { mountSuspended } from '@nuxt/test-utils/runtime'
import { vi } from 'vitest'
import { defineComponent, h } from 'vue'

// happy-dom: `CSSStyleDeclaration` no es iterable como en los navegadores (`[...element.style]`).
if (!(Symbol.iterator in CSSStyleDeclaration.prototype)) {
  Object.defineProperty(CSSStyleDeclaration.prototype, Symbol.iterator, {
    *value(this: CSSStyleDeclaration) {
      for (let index = 0; index < this.length; index++) yield this.item(index)
    }
  })
}

/** Monta un componente mínimo que llama al composable en su `setup` (con contexto de Nuxt y ciclo de vida). */
export async function withSetup<T>(composable: () => T) {
  let result!: T
  const wrapper = await mountSuspended(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      }
    })
  )
  return { result, wrapper }
}

/** IntersectionObserver controlable: `intersect(true)` simula que el elemento entra en pantalla. */
export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly observed: Element[] = []
  disconnected = false

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit
  ) {
    FakeIntersectionObserver.instances.push(this)
  }

  observe(element: Element) {
    this.observed.push(element)
  }

  disconnect() {
    this.disconnected = true
  }

  intersect(isIntersecting: boolean) {
    const entries = this.observed.map((target) => ({ isIntersecting, target }) as IntersectionObserverEntry)
    this.callback(entries, this as unknown as IntersectionObserver)
  }

  static last() {
    return FakeIntersectionObserver.instances.at(-1)!
  }
}

export function stubIntersectionObserver() {
  FakeIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
}

/** `matchMedia` controlable por consulta: `setMatches(query, true)` avisa a los oyentes como el navegador. */
export function stubMatchMedia(initial: Record<string, boolean> = {}) {
  const matches = new Map(Object.entries(initial))
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return matches.get(query) ?? false
    },
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set())
      listeners.get(query)!.add(listener)
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.get(query)?.delete(listener)
  }))
  return {
    setMatches(query: string, value: boolean) {
      matches.set(query, value)
      for (const listener of listeners.get(query) ?? []) listener({ matches: value, media: query } as MediaQueryListEvent)
    },
    listenerCount: (query: string) => listeners.get(query)?.size ?? 0
  }
}

/** Caja de un elemento para `getBoundingClientRect` (happy-dom no maqueta). */
export function setBox(element: Element, box: { top: number; height: number }) {
  const rect = { top: box.top, bottom: box.top + box.height, height: box.height, left: 0, right: 0, width: 0, x: 0, y: box.top }
  element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect
}
