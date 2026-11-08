import { intersectionRatio, meetsVisibility } from '~~/lib/animations'

export type ReplaySource = 'start' | 'enter'

export interface Replayable {
  element: () => Element | null
  threshold: number
  /**
   * `once`: si no estaba a la vista, se reproduce al entrar.
   * `skip`: solo al activar si ya se veía (las escenas que no se veían siguen el scroll, sin catch-up).
   */
  onEnter: 'once' | 'skip'
  reset: () => void
  play: (source: ReplaySource) => void
  finish: () => void
  defer?: () => void
}

interface ReplayEntry extends Replayable {
  pending: boolean
}

/** Umbrales que usa el único observador (gráficas 0,25, contadores 0,2, resto cualquiera). */
const OBSERVER_RATIOS = [0, 0.2, 0.25, 0.5, 1]

const registry = new Set<ReplayEntry>()
let observer: IntersectionObserver | undefined

function ratioOf(element: Element): number {
  // La página entera cuenta como visible: la entrada de Visitas no depende de un rectángulo medible.
  if (element === document.documentElement || element === document.body) return 1
  const box = element.getBoundingClientRect()
  return intersectionRatio(box.top, box.bottom, window.innerHeight)
}

function entryRatio(entry: IntersectionObserverEntry): number {
  return Number.isFinite(entry.intersectionRatio) ? entry.intersectionRatio : entry.isIntersecting ? 1 : 0
}

function ensureObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          for (const item of registry) {
            if (!item.pending || item.element() !== entry.target) continue
            if (!meetsVisibility(entryRatio(entry), item.threshold)) continue
            item.pending = false
            observer?.unobserve(entry.target)
            item.reset()
            item.play('enter')
          }
        }
      },
      { threshold: OBSERVER_RATIOS },
    )
  }
  return observer
}

/** Vuelve a observar los pendientes cuyo elemento ya existe (una gráfica que acaba de crearse). */
export function observePendingReplayables() {
  const pending = [...registry].filter((item) => item.pending)
  if (pending.length === 0) return
  const current = ensureObserver()
  if (!current) return
  for (const item of pending) {
    const element = item.element()
    if (element) current.observe(element)
  }
}

/** START: lo visible se reinicia y se reproduce; lo demás queda pendiente o, si `skip`, sigue su curso. */
export function replayAnimations() {
  for (const item of registry) {
    const element = item.element()
    const visible = element ? meetsVisibility(ratioOf(element), item.threshold) : false
    if (visible) {
      item.pending = false
      item.reset()
      item.play('start')
      continue
    }
    item.defer?.()
    item.pending = item.onEnter === 'once'
  }
  observePendingReplayables()
}

/** STOP: estado final de todo lo registrado y se olvida lo que aún no se había reproducido. */
export function finishAnimations() {
  for (const item of registry) {
    item.pending = false
    item.finish()
  }
  observer?.disconnect()
  observer = undefined
}

/** Registra un componente animable mientras está montado. */
export function useReplayable(options: Replayable) {
  const entry: ReplayEntry = { ...options, pending: false }

  onMounted(() => registry.add(entry))
  onBeforeUnmount(() => {
    entry.pending = false
    registry.delete(entry)
  })
}
