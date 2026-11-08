import { intersectionRatio, meetsVisibility } from '~~/lib/animations'

export type ReplaySource = 'start' | 'enter'

export interface Replayable {
  element: () => Element | null
  threshold: number
  /**
   * `once`: si no estaba a la vista, se reproduce al entrar.
   * `skip`: only when activated if it was already seen (the scenes that were not seen follow the scroll, without catch-up).
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

/** Thresholds used by the single observer (graphs 0.25, counters 0.2, any remainder). */
const OBSERVER_RATIOS = [0, 0.2, 0.25, 0.5, 1]

const registry = new Set<ReplayEntry>()
let observer: IntersectionObserver | undefined

function ratioOf(element: Element): number {
  // The entire page counts as visible: the Visits entry does not depend on a measurable rectangle.
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

/** Look again at the slopes whose element already exists (a graph that has just been created). */
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

/** START: the visible is restarted and reproduced; the rest is pending or, if `skip`, it runs its course. */
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

/** STOP: final state of everything recorded and forgetting what had not yet been played. */
export function finishAnimations() {
  for (const item of registry) {
    item.pending = false
    item.finish()
  }
  observer?.disconnect()
  observer = undefined
}

/** Register an animatable component while it is assembled. */
export function useReplayable(options: Replayable) {
  const entry: ReplayEntry = { ...options, pending: false }

  onMounted(() => registry.add(entry))
  onBeforeUnmount(() => {
    entry.pending = false
    registry.delete(entry)
  })
}
