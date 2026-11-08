import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  SIDEBAR_COLLAPSED_CLASS,
  SIDEBAR_NO_FLASH_SCRIPT,
  SIDEBAR_STORAGE_KEY,
  readCollapsed,
  toggleCollapsed,
} from '../../lib/sidebar'

/** Minimal localStorage and `<html>` doubles. */
function createFakes(initialStored?: string) {
  const store = new Map<string, string>()
  if (initialStored !== undefined) store.set(SIDEBAR_STORAGE_KEY, initialStored)
  const classes = new Set<string>()
  return {
    store,
    classes,
    storage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
    root: {
      classList: {
        toggle: (name: string, force?: boolean) => {
          if (force) classes.add(name)
          else classes.delete(name)
          return Boolean(force)
        },
      },
    },
  }
}

describe('collapsible sidebar', () => {
  it('expanded by default', () => {
    expect(readCollapsed(createFakes().storage)).toBe(false)
  })

  it('one click collapses and another expands, persisting and applying each state', () => {
    const { storage, root, store, classes } = createFakes()

    const collapsed = toggleCollapsed(storage, root, false)
    expect(collapsed).toBe(true)
    expect(readCollapsed(storage)).toBe(true)
    expect(store.get(SIDEBAR_STORAGE_KEY)).toBe('1')
    expect(classes.has(SIDEBAR_COLLAPSED_CLASS)).toBe(true)

    const expanded = toggleCollapsed(storage, root, collapsed)
    expect(expanded).toBe(false)
    expect(readCollapsed(storage)).toBe(false)
    expect(store.get(SIDEBAR_STORAGE_KEY)).toBe('0')
    expect(classes.has(SIDEBAR_COLLAPSED_CLASS)).toBe(false)
  })

  it('remembers collapsed state across visits', () => {
    expect(readCollapsed(createFakes('1').storage)).toBe(true)
  })

  it('when localStorage fails, does not break: reads expanded and toggle still works', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    const { root, classes } = createFakes()
    expect(readCollapsed(blocked)).toBe(false)
    expect(toggleCollapsed(blocked, root, false)).toBe(true)
    expect(classes.has(SIDEBAR_COLLAPSED_CLASS)).toBe(true)
  })
})

describe('pre-paint script (no flash)', () => {
  function runScript(stored?: string, throwsOnRead = false) {
    const { classes, storage } = createFakes(stored)
    const localStorage = throwsOnRead
      ? { getItem: () => { throw new Error('blocked') } }
      : storage
    runInNewContext(SIDEBAR_NO_FLASH_SCRIPT, {
      localStorage,
      document: { documentElement: { classList: { add: (name: string) => classes.add(name) } } },
    })
    return classes
  }

  it('adds the class when sidebar was collapsed', () => {
    expect(runScript('1').has(SIDEBAR_COLLAPSED_CLASS)).toBe(true)
  })

  it('does not add the class when expanded or nothing stored', () => {
    expect(runScript('0').size).toBe(0)
    expect(runScript().size).toBe(0)
  })

  it('does not throw when localStorage is blocked', () => {
    expect(runScript(undefined, true).size).toBe(0)
  })
})
