/**
 * Estado «sidebar colapsado» (solo escritorio). Lógica pura, sin Vue ni DOM global,
 * para poder probar el ciclo colapsar y expandir en Vitest.
 */

/** Clase que se pone en `<html>`: el CSS (solo desde xl) pasa de sidebar a raíl de iconos. */
export const SIDEBAR_COLLAPSED_CLASS = 'sidebar-collapsed'
export const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'

const STORED_COLLAPSED = '1'
const STORED_EXPANDED = '0'

export type SidebarStorage = Pick<Storage, 'getItem' | 'setItem'>
export type SidebarRoot = { classList: Pick<DOMTokenList, 'toggle'> }

/** El navegador puede bloquear localStorage (modo privado, políticas): entonces no se recuerda nada. */
export function readCollapsed(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(SIDEBAR_STORAGE_KEY) === STORED_COLLAPSED
  } catch {
    return false
  }
}

function writeCollapsed(storage: Pick<Storage, 'setItem'>, collapsed: boolean): void {
  try {
    storage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? STORED_COLLAPSED : STORED_EXPANDED)
  } catch {
    // Sin almacenamiento el botón sigue funcionando en esta visita.
  }
}

/** Refleja el estado en `<html>` para que el CSS lo aplique. */
export function applyCollapsed(root: SidebarRoot, collapsed: boolean): void {
  root.classList.toggle(SIDEBAR_COLLAPSED_CLASS, collapsed)
}

/** Invierte el estado, lo guarda y lo aplica. Devuelve el estado nuevo. */
export function toggleCollapsed(storage: SidebarStorage, root: SidebarRoot, isCollapsed: boolean): boolean {
  const next = !isCollapsed
  writeCollapsed(storage, next)
  applyCollapsed(root, next)
  return next
}

/**
 * Script inline que corre antes del primer pintado y pone la clase en `<html>`:
 * así un sidebar colapsado no parpadea abierto al cargar. Su hash entra en la CSP
 * con `scripts/build-headers.mjs`.
 */
export const SIDEBAR_NO_FLASH_SCRIPT =
  `try{if(localStorage.getItem('${SIDEBAR_STORAGE_KEY}')==='${STORED_COLLAPSED}')` +
  `document.documentElement.classList.add('${SIDEBAR_COLLAPSED_CLASS}')}catch(e){}`
