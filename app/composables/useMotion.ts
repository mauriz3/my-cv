import {
  MOTION_ATTRIBUTE,
  MOTION_STORAGE_KEY,
  SYSTEM_REDUCED_MOTION_QUERY,
  parseStoredMotion,
  resolveMotion,
  toggledMotion,
  type MotionPreference,
} from '~~/lib/motion'

/**
 * Valor vigente en `<html>` (lo fija el script anterior al pintado). Para decidir en `onMounted`
 * sin esperar a que el estado reactivo se sincronice tras la hidratación. Solo en cliente.
 */
export function readDocumentMotion(): MotionPreference {
  return parseStoredMotion(document.documentElement.getAttribute(MOTION_ATTRIBUTE)) ?? 'full'
}

function readStoredMotion(): MotionPreference | null {
  try {
    return parseStoredMotion(localStorage.getItem(MOTION_STORAGE_KEY))
  } catch {
    return null
  }
}

function applyToDocument(motion: MotionPreference) {
  document.documentElement.setAttribute(MOTION_ATTRIBUTE, motion)
}

/**
 * Preferencia de movimiento compartida (botón global de la cabecera, recorrido, contadores, gráficas).
 * Fuente de verdad: `<html data-motion>`. En el servidor vale «full» y no se usa para pintar.
 */
export function useMotion() {
  const motion = useState<MotionPreference>('motion', () => 'full')
  const isReduced = computed(() => motion.value === 'reduced')

  function set(next: MotionPreference) {
    motion.value = next
    applyToDocument(next)
  }

  /** Elección manual: se guarda y deja de seguir al sistema. */
  function toggle() {
    const next = toggledMotion(motion.value)
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, next)
    } catch {
      // Sin almacenamiento el botón sigue funcionando en esta visita.
    }
    set(next)
  }

  return { motion: readonly(motion), isReduced, toggle, set }
}

/**
 * Sincroniza el estado con `<html>` (tras hidratar, para que el HTML del servidor coincida)
 * y sigue a prefers-reduced-motion mientras no haya elección manual.
 */
export function startMotionSync() {
  const { set } = useMotion()
  set(readDocumentMotion())
  window.matchMedia(SYSTEM_REDUCED_MOTION_QUERY).addEventListener('change', (event) => {
    if (readStoredMotion() === null) set(resolveMotion(null, event.matches))
  })
}
