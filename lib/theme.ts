/**
 * Tema claro / oscuro (petición de Maurizio): OSCURO por defecto en la primera carga.
 * Lógica pura, sin Vue ni DOM global. El estado lo lleva @nuxtjs/color-mode (lo trae @nuxt/ui):
 * clase `dark` / `light` en `<html>` y la elección del botón sol/luna en localStorage.
 *
 * Decisión: prefers-color-scheme NO cuenta. Sin elección guardada manda el oscuro; solo una elección
 * explícita con el botón («light» o «dark») cambia el tema, y se respeta en todas las páginas e idiomas.
 */

export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'dark'

/** Clave de @nuxtjs/color-mode (su valor por defecto); se fija en nuxt.config para que no cambie a escondidas. */
export const THEME_STORAGE_KEY = 'nuxt-color-mode'

/** Color de la barra del navegador en móvil: el fondo de la página (`--ui-bg`) de cada tema. */
export const THEME_COLORS: Record<Theme, string> = { light: '#f6f8fa', dark: '#0d1117' }

/**
 * Solo «light» y «dark» son elecciones del botón. Cualquier otro valor (p. ej. «system», que color-mode
 * guardaba solo cuando la preferencia por defecto era seguir al sistema) no es una elección: se ignora.
 */
export function parseStoredTheme(stored: string | null): Theme | null {
  return THEMES.find((theme) => theme === stored) ?? null
}

/** Manda la elección guardada; si no la hay, el oscuro (el sistema no se consulta). */
export function resolveTheme(stored: Theme | null): Theme {
  return stored ?? DEFAULT_THEME
}

export function themeColor(theme: string): string {
  return THEME_COLORS[parseStoredTheme(theme) ?? DEFAULT_THEME]
}

/**
 * Script inline que corre antes del primer pintado y antes del script de color-mode (que va al final del `<head>`).
 * El HTML ya sale con `class="dark"`; aquí:
 *  1. Se borra lo guardado que no sea una elección («system» de visitas antiguas), así color-mode cae al oscuro.
 *  2. Con «light» guardado se quita `dark` antes de pintar (color-mode añade `light` justo después).
 * Su hash entra en la CSP con `scripts/build-headers.mjs`.
 */
export const THEME_NO_FLASH_SCRIPT =
  `var t=null;try{t=localStorage.getItem('${THEME_STORAGE_KEY}');` +
  `if(t!==null&&t!=='light'&&t!=='dark'){localStorage.removeItem('${THEME_STORAGE_KEY}');t=null}}catch(e){}` +
  `if(t==='light')document.documentElement.classList.remove('dark')`
