/**
 * Collapsed sidebar state (desktop only). Pure logic, no global Vue or DOM,
 * so collapse/expand cycle can be tested in Vitest.
 */

/** Class on `<html>`: CSS (xl and up) switches from sidebar to icon rail. */
export const SIDEBAR_COLLAPSED_CLASS = 'sidebar-collapsed'
export const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'

const STORED_COLLAPSED = '1'
const STORED_EXPANDED = '0'

export type SidebarStorage = Pick<Storage, 'getItem' | 'setItem'>
export type SidebarRoot = { classList: Pick<DOMTokenList, 'toggle'> }

/** Browser may block localStorage (private mode, policies): then nothing is remembered. */
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
    // Without storage the button still works for this visit.
  }
}

/** Reflect state on `<html>` so CSS applies it. */
export function applyCollapsed(root: SidebarRoot, collapsed: boolean): void {
  root.classList.toggle(SIDEBAR_COLLAPSED_CLASS, collapsed)
}

/** Toggle state, persist, and apply. Returns the new state. */
export function toggleCollapsed(storage: SidebarStorage, root: SidebarRoot, isCollapsed: boolean): boolean {
  const next = !isCollapsed
  writeCollapsed(storage, next)
  applyCollapsed(root, next)
  return next
}

/**
 * Inline script before first paint sets the class on `<html>`:
 * a collapsed sidebar does not flash open on load. Its hash is in CSP via `scripts/build-headers.mjs`.
 */
export const SIDEBAR_NO_FLASH_SCRIPT =
  `try{if(localStorage.getItem('${SIDEBAR_STORAGE_KEY}')==='${STORED_COLLAPSED}')` +
  `document.documentElement.classList.add('${SIDEBAR_COLLAPSED_CLASS}')}catch(e){}`
