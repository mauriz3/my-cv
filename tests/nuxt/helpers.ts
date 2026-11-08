import { mountSuspended } from '@nuxt/test-utils/runtime'
import { vi } from 'vitest'
import { defineComponent, h } from 'vue'

// happy-dom: `CSSStyleDeclaration` is not iterable like in browsers (`[...element.style]`).
if (!(Symbol.iterator in CSSStyleDeclaration.prototype)) {
  Object.defineProperty(CSSStyleDeclaration.prototype, Symbol.iterator, {
    *value(this: CSSStyleDeclaration) {
      for (let index = 0; index < this.length; index++) yield this.item(index)
    }
  })
}

/** Mounts a minimal component that calls the composable in `setup` (with Nuxt context and lifecycle). */
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

/** Controllable IntersectionObserver: `intersect(true)` simulates the element entering the viewport. */
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

  unobserve(element: Element) {
    const index = this.observed.indexOf(element)
    if (index >= 0) this.observed.splice(index, 1)
  }

  disconnect() {
    this.disconnected = true
  }

  intersect(isIntersecting: boolean, ratio = isIntersecting ? 1 : 0) {
    const entries = this.observed.map(
      (target) => ({ isIntersecting, intersectionRatio: ratio, target }) as IntersectionObserverEntry,
    )
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

/** In-memory Web Storage when the Nuxt test env has no `localStorage` (e.g. SSR-only setup). */
export function ensureWebStorage() {
  if (typeof globalThis.localStorage !== 'undefined') return
  const make = () => {
    const map = new Map<string, string>()
    return {
      get length() {
        return map.size
      },
      clear: () => map.clear(),
      getItem: (key: string) => map.get(key) ?? null,
      key: (index: number) => [...map.keys()][index] ?? null,
      removeItem: (key: string) => {
        map.delete(key)
      },
      setItem: (key: string, value: string) => {
        map.set(key, value)
      },
    }
  }
  vi.stubGlobal('localStorage', make())
  vi.stubGlobal('sessionStorage', make())
}

/** Controllable `matchMedia` per query: `setMatches(query, true)` notifies listeners like the browser. */
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

/** Element box for `getBoundingClientRect` (happy-dom does not layout). */
export function setBox(element: Element, box: { top: number; height: number }) {
  const rect = { top: box.top, bottom: box.top + box.height, height: box.height, left: 0, right: 0, width: 0, x: 0, y: box.top }
  element.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect
}
