import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MOTION_NO_FLASH_SCRIPT, REDUCE_MOTION_CLASS, REDUCE_MOTION_STORAGE_KEY, SCRIPTING_CLASS } from '../../lib/motion'

/** Ejecuta el script anterior al pintado con dobles de localStorage y `<html>`. */
function runScript(stored?: string, throwsOnRead = false) {
  const classes = new Set<string>()
  const localStorage = {
    getItem: (key: string) => {
      if (throwsOnRead) throw new Error('blocked')
      return key === REDUCE_MOTION_STORAGE_KEY ? (stored ?? null) : null
    },
  }
  runInNewContext(MOTION_NO_FLASH_SCRIPT, {
    localStorage,
    document: { documentElement: { classList: { add: (name: string) => classes.add(name) } } },
  })
  return classes
}

describe('script de movimiento anterior al pintado', () => {
  it('marca siempre que hay JS', () => {
    expect(runScript().has(SCRIPTING_CLASS)).toBe(true)
  })

  it('aplica «Reduce motion» si quedó activado', () => {
    expect(runScript('1').has(REDUCE_MOTION_CLASS)).toBe(true)
  })

  it('no lo aplica si está apagado o no hay nada guardado', () => {
    expect(runScript('0').has(REDUCE_MOTION_CLASS)).toBe(false)
    expect(runScript().has(REDUCE_MOTION_CLASS)).toBe(false)
  })

  it('no lanza error si localStorage está bloqueado', () => {
    const classes = runScript(undefined, true)
    expect(classes.has(SCRIPTING_CLASS)).toBe(true)
    expect(classes.has(REDUCE_MOTION_CLASS)).toBe(false)
  })
})
