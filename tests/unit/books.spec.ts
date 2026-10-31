import { describe, expect, it } from 'vitest'
import { BOOKS_REVEAL_STAGGER_MS, coverStatusOf, revealDelayMs } from '../../lib/books'

describe('portada de un libro', () => {
  it('cargando mientras el <img> no ha terminado', () => {
    expect(coverStatusOf({ complete: false, naturalWidth: 0 })).toBe('loading')
  })

  it('cargada si terminó con medidas', () => {
    expect(coverStatusOf({ complete: true, naturalWidth: 317 })).toBe('loaded')
  })

  it('error si terminó sin medidas (falló antes o después de hidratar)', () => {
    expect(coverStatusOf({ complete: true, naturalWidth: 0 })).toBe('error')
  })
})

describe('entrada escalonada', () => {
  it('la primera tarjeta entra sin retraso y cada siguiente 120 ms después', () => {
    expect([0, 1, 2].map(revealDelayMs)).toEqual([0, BOOKS_REVEAL_STAGGER_MS, 2 * BOOKS_REVEAL_STAGGER_MS])
  })

  it('un índice negativo no adelanta la entrada', () => {
    expect(revealDelayMs(-1)).toBe(0)
  })
})
