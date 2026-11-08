import { ANIMATIONS_STORAGE_KEY, isEffectiveOn, parseStoredAnimation, type AnimationChoice } from '~~/lib/animations'
import { MOTION_ATTRIBUTE, MOTION_STORAGE_KEY, SYSTEM_REDUCED_MOTION_QUERY, type MotionPreference } from '~~/lib/motion'
import { finishAnimations, replayAnimations } from './useReplayable'

/**
 * Último ON/OFF aplicado. Sirve para no reiniciar en un re-render, un cambio de tema o de idioma.
 * Nace en null: la primera sincronización con `<html>` no cuenta como activación.
 */
let wasOn: boolean | null = null
let stopListening: (() => void) | undefined
const pulseStops = new Set<() => void>()

/** El botón registra aquí cómo cancelar su pulso; un clic o reduced-motion lo llama. */
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
    // Sin almacenamiento la elección vale solo en esta visita.
  }
  try {
    localStorage.removeItem(MOTION_STORAGE_KEY)
  } catch {
    // La clave antigua se ignora igual; se borrará en la próxima elección que sí pueda escribir.
  }
}

function systemPrefersReduced(): boolean {
  return window.matchMedia(SYSTEM_REDUCED_MOTION_QUERY).matches
}

function applyDocument(motion: MotionPreference) {
  document.documentElement.setAttribute(MOTION_ATTRIBUTE, motion)
}

/**
 * Preferencia de animaciones compartida. En el servidor está apagada: el script inline es quien
 * fija `<html>` antes de pintar, y el cliente se alinea con él sin reproducir nada.
 */
export function useAnimations() {
  const stored = useState<AnimationChoice | null>('animations-choice', () => null)
  const prefersReducedMotion = useState('animations-prm', () => false)
  const override = useState('animations-override', () => false)
  const motion = useState<MotionPreference>('motion', () => 'reduced')
  const isReduced = computed(() => motion.value === 'reduced')
  const effectiveOn = computed(() => isEffectiveOn(stored.value, prefersReducedMotion.value, override.value))

  /**
   * Aplica ON/OFF. El ref cambia antes que el atributo: quien escucha (el recorrido) todavía ve
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

  /** Para tests y para forzar un estado sin pasar por el botón. No escribe en localStorage. */
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
   * Alinea el estado con lo que el script ya pintó. El atributo se escribe antes que el ref:
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

/** Una vez por visita: estado desde localStorage y escucha del sistema y de otras pestañas. */
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
