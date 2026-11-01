import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  THEME_COLORS,
  THEME_NO_FLASH_SCRIPT,
  THEME_STORAGE_KEY,
  parseStoredTheme,
  resolveTheme,
  themeColor,
} from '../../lib/theme'

describe('tema claro / oscuro', () => {
  it('el tema por defecto es el oscuro', () => {
    expect(DEFAULT_THEME).toBe('dark')
  })

  it('solo «light» y «dark» son elecciones guardadas; «system» u otros no cuentan', () => {
    expect(parseStoredTheme('light')).toBe('light')
    expect(parseStoredTheme('dark')).toBe('dark')
    expect(parseStoredTheme('system')).toBeNull()
    expect(parseStoredTheme('sepia')).toBeNull()
    expect(parseStoredTheme(null)).toBeNull()
  })

  it('manda la elección guardada; sin elección, oscuro (el sistema no se consulta)', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme(null)).toBe('dark')
  })

  it('theme-color es el fondo de cada tema y cae al oscuro con valores desconocidos', () => {
    expect(themeColor('light')).toBe(THEME_COLORS.light)
    expect(themeColor('dark')).toBe(THEME_COLORS.dark)
    expect(themeColor('system')).toBe(THEME_COLORS.dark)
  })

  it('theme-color coincide con `--ui-bg` de main.css en claro y en oscuro', () => {
    const css = readFileSync(new URL('../../app/assets/css/main.css', import.meta.url), 'utf8')
    const background = (selector: string) => css.match(new RegExp(`^${selector} \\{[^}]*--ui-bg: (#[0-9a-f]{6});`, 'm'))?.[1]
    expect(background(':root')).toBe(THEME_COLORS.light)
    expect(background('\\.dark')).toBe(THEME_COLORS.dark)
  })
})

describe('script de tema anterior al pintado (el HTML ya sale con class="dark")', () => {
  function runScript({ stored = null as string | null, storageBlocked = false } = {}) {
    const storage = new Map<string, string>(stored === null ? [] : [[THEME_STORAGE_KEY, stored]])
    const classes = new Set(['dark'])
    runInNewContext(THEME_NO_FLASH_SCRIPT, {
      localStorage: {
        getItem: (key: string) => {
          if (storageBlocked) throw new Error('blocked')
          return storage.get(key) ?? null
        },
        removeItem: (key: string) => storage.delete(key),
      },
      document: { documentElement: { classList: { remove: (name: string) => classes.delete(name) } } },
    })
    return { dark: classes.has('dark'), stored: storage.get(THEME_STORAGE_KEY) ?? null }
  }

  it('sin nada guardado se queda oscuro', () => {
    expect(runScript()).toEqual({ dark: true, stored: null })
  })

  it('con «light» guardado quita el oscuro antes de pintar', () => {
    expect(runScript({ stored: 'light' })).toEqual({ dark: false, stored: 'light' })
  })

  it('con «dark» guardado se queda oscuro', () => {
    expect(runScript({ stored: 'dark' })).toEqual({ dark: true, stored: 'dark' })
  })

  it('borra «system» (guardado solo por visitas antiguas) para que color-mode caiga al oscuro', () => {
    expect(runScript({ stored: 'system' })).toEqual({ dark: true, stored: null })
  })

  it('con localStorage bloqueado no falla y se queda oscuro', () => {
    expect(runScript({ storageBlocked: true })).toEqual({ dark: true, stored: null })
  })
})
