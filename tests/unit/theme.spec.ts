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

describe('light / dark theme', () => {
  it('default theme is dark', () => {
    expect(DEFAULT_THEME).toBe('dark')
  })

  it('only «light» and «dark» are stored choices; «system» and others do not count', () => {
    expect(parseStoredTheme('light')).toBe('light')
    expect(parseStoredTheme('dark')).toBe('dark')
    expect(parseStoredTheme('system')).toBeNull()
    expect(parseStoredTheme('sepia')).toBeNull()
    expect(parseStoredTheme(null)).toBeNull()
  })

  it('stored choice wins; without choice, dark (system preference is not consulted)', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme(null)).toBe('dark')
  })

  it('theme-color is each theme’s background and falls back to dark for unknown values', () => {
    expect(themeColor('light')).toBe(THEME_COLORS.light)
    expect(themeColor('dark')).toBe(THEME_COLORS.dark)
    expect(themeColor('system')).toBe(THEME_COLORS.dark)
  })

  it('theme-color matches `--ui-bg` in main.css for light and dark', () => {
    const css = readFileSync(new URL('../../app/assets/css/main.css', import.meta.url), 'utf8')
    const background = (selector: string) => css.match(new RegExp(`^${selector} \\{[^}]*--ui-bg: (#[0-9a-f]{6});`, 'm'))?.[1]
    expect(background(':root')).toBe(THEME_COLORS.light)
    expect(background('\\.dark')).toBe(THEME_COLORS.dark)
  })
})

describe('pre-paint theme script (HTML already has class="dark")', () => {
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

  it('stays dark when nothing stored', () => {
    expect(runScript()).toEqual({ dark: true, stored: null })
  })

  it('with stored «light» removes dark before paint', () => {
    expect(runScript({ stored: 'light' })).toEqual({ dark: false, stored: 'light' })
  })

  it('with stored «dark» stays dark', () => {
    expect(runScript({ stored: 'dark' })).toEqual({ dark: true, stored: 'dark' })
  })

  it('clears «system» (legacy visits only) so color-mode falls back to dark', () => {
    expect(runScript({ stored: 'system' })).toEqual({ dark: true, stored: null })
  })

  it('when localStorage is blocked, does not fail and stays dark', () => {
    expect(runScript({ storageBlocked: true })).toEqual({ dark: true, stored: null })
  })
})
