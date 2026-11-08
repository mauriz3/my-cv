/**
 * Light / dark theme (Maurizio’s request): DARK by default on first load.
 * Pure logic, no global Vue or DOM. State is from @nuxtjs/color-mode (via @nuxt/ui):
 * `dark` / `light` class on `<html>` and sun/moon choice in localStorage.
 *
 * Decision: prefers-color-scheme does NOT apply. With no stored choice, dark wins; only an explicit
 * button choice («light» or «dark») changes theme, persisted across pages and locales.
 */

export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'dark'

/** @nuxtjs/color-mode key (its default); fixed in nuxt.config so it does not drift silently. */
export const THEME_STORAGE_KEY = 'nuxt-color-mode'

/** Mobile browser bar color: page background (`--ui-bg`) per theme. */
export const THEME_COLORS: Record<Theme, string> = { light: '#f6f8fa', dark: '#0d1117' }

/**
 * Only «light» and «dark» are button choices. Any other value (e.g. «system», which color-mode
 * stored when default was follow-system) is not a choice: ignored.
 */
export function parseStoredTheme(stored: string | null): Theme | null {
  return THEMES.find((theme) => theme === stored) ?? null
}

/** Stored choice wins; if none, dark (system is not consulted). */
export function resolveTheme(stored: Theme | null): Theme {
  return stored ?? DEFAULT_THEME
}

export function themeColor(theme: string): string {
  return THEME_COLORS[parseStoredTheme(theme) ?? DEFAULT_THEME]
}

/**
 * Inline script before first paint and before color-mode’s script (end of `<head>`).
 * HTML already has `class="dark"`; here:
 *  1. Remove stored values that are not a choice (legacy «system») so color-mode falls back to dark.
 *  2. With stored «light», remove `dark` before paint (color-mode adds `light` right after).
 * Hash is in CSP via `scripts/build-headers.mjs`.
 */
export const THEME_NO_FLASH_SCRIPT =
  `var t=null;try{t=localStorage.getItem('${THEME_STORAGE_KEY}');` +
  `if(t!==null&&t!=='light'&&t!=='dark'){localStorage.removeItem('${THEME_STORAGE_KEY}');t=null}}catch(e){}` +
  `if(t==='light')document.documentElement.classList.remove('dark')`
