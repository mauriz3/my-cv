import { ANIMATIONS_STORAGE_KEY, isEffectiveOn, parseStoredAnimation, type AnimationChoice } from '~~/lib/animations'
import { MOTION_ATTRIBUTE, MOTION_STORAGE_KEY, SYSTEM_REDUCED_MOTION_QUERY, type MotionPreference } from '~~/lib/motion'
import { finishAnimations, replayAnimations } from './useReplayable'

/**
 * Last ON/off applied. It serves not to restart in a re-start, a change of theme or language.
 * Born in null: the first synchronization with `<html>` does not count as activation.
 */
let wasOn: boolean | null = null
let stopListening: (() => void) | undefined
const pulseStops = new Set<() => void>()

/** The button records here how to cancel your pulse; a click or reduced-motion calls it. */
export function registerPulseStop(stop: () => void) {
  pulseStops.add(stop)
  onScopeDispose(() => pulseStops.delete(stop))
}

function cancelPulse() {
  for (const stop of pulseStops) stop()
}

function readStored(): AnimationChoice | null {
  try {
    return parseStoredAnimation(localStorage.getItem(ANIMATIONS_STORAGE_KEY))
  } catch {
    return null
  }
}

function writeStored(choice: AnimationChoice) {
  try {
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, choice)
  } catch {
    // Without storage the choice is valid only on this visit.
  }
  try {
    localStorage.removeItem(MOTION_STORAGE_KEY)
  } catch {
    // The old key is still ignored; it will be deleted at the next choice you can enter.
  }
}

function systemPrefersReduced(): boolean {
  return window.matchMedia(SYSTEM_REDUCED_MOTION_QUERY).matches
}

function applyDocument(motion: MotionPreference) {
  document.documentElement.setAttribute(MOTION_ATTRIBUTE, motion)
}

/**
 * Shared animation preference. On the server it is turned off: the inline script is who
 * fixed `<html>` before painting, and the client aligns with it without reproducing anything.
 */
export function useAnimations() {
  const stored = useState<AnimationChoice | null>('animations-choice', () => null)
  const prefersReducedMotion = useState('animations-prm', () => false)
  const override = useState('animations-override', () => false)
  const motion = useState<MotionPreference>('motion', () => 'reduced')
  const isReduced = computed(() => motion.value === 'reduced')
  const effectiveOn = computed(() => isEffectiveOn(stored.value, prefersReducedMotion.value, override.value))

  /**
   * Apply ON/off. The ref changes before the attribute: the listener (the tour) still sees
   * la maqueta anterior y puede mantener el punto en pantalla. Si no hay cambio, no reinicia nada.
   */
  function commit(on: boolean) {
    const changed = wasOn !== on
    wasOn = on
    motion.value = on ? 'full' : 'reduced'
    applyDocument(on ? 'full' : 'reduced')
    if (!changed) return
    if (on) replayAnimations()
    else finishAnimations()
  }

  /** For tests and to force a state without going through the button. Does not write to localStorage. */
  function set(next: MotionPreference) {
    stored.value = next === 'full' ? 'on' : 'off'
    override.value = next === 'full' && prefersReducedMotion.value
    commit(next === 'full')
  }

  function toggle() {
    const next: AnimationChoice = effectiveOn.value ? 'off' : 'on'
    writeStored(next)
    stored.value = next
    override.value = next === 'on' && prefersReducedMotion.value
    cancelPulse()
    commit(next === 'on')
  }

  /**
   * Aligns the status with what the script already painted. Attribute is written before ref:
   * si alguien ya escucha, ve que la maqueta no cambia y no recoloca ni reinicia.
   */
  function hydrate() {
    stored.value = readStored()
    prefersReducedMotion.value = systemPrefersReduced()
    override.value = false
    const on = isEffectiveOn(stored.value, prefersReducedMotion.value, false)
    applyDocument(on ? 'full' : 'reduced')
    wasOn = on
    motion.value = on ? 'full' : 'reduced'
  }

  function onPreferenceChange(matches: boolean) {
    prefersReducedMotion.value = matches
    if (matches) {
      override.value = false
      cancelPulse()
    }
    commit(isEffectiveOn(stored.value, prefersReducedMotion.value, override.value))
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== ANIMATIONS_STORAGE_KEY) return
    stored.value = parseStoredAnimation(event.newValue)
    commit(isEffectiveOn(stored.value, prefersReducedMotion.value, override.value))
  }

  return {
    stored,
    prefersReducedMotion,
    override,
    motion: readonly(motion),
    isReduced,
    effectiveOn,
    set,
    toggle,
    hydrate,
    onPreferenceChange,
    onStorage,
  }
}

/** Once per visit: status from localStorage and listen to the system and other tabs. */
export function startAnimationsSync() {
  const animations = useAnimations()
  stopListening?.()
  animations.hydrate()
  const media = window.matchMedia(SYSTEM_REDUCED_MOTION_QUERY)
  const onChange = (event: MediaQueryListEvent) => animations.onPreferenceChange(event.matches)
  const onStore = (event: StorageEvent) => animations.onStorage(event)
  media.addEventListener('change', onChange)
  window.addEventListener('storage', onStore)
  stopListening = () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener('storage', onStore)
  }
}
