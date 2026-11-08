import { describe, expect, it } from 'vitest'
import { BOOKS_REVEAL_STAGGER_MS, coverStatusOf, revealDelayMs } from '../../lib/books'

describe('book cover', () => {
  it('loading while the <img> has not finished', () => {
    expect(coverStatusOf({ complete: false, naturalWidth: 0 })).toBe('loading')
  })

  it('loaded when complete with dimensions', () => {
    expect(coverStatusOf({ complete: true, naturalWidth: 317 })).toBe('loaded')
  })

  it('error when complete without dimensions (failed before or after hydrate)', () => {
    expect(coverStatusOf({ complete: true, naturalWidth: 0 })).toBe('error')
  })
})

describe('staggered reveal', () => {
  it('first card has no delay; each next is 120 ms later', () => {
    expect([0, 1, 2].map(revealDelayMs)).toEqual([0, BOOKS_REVEAL_STAGGER_MS, 2 * BOOKS_REVEAL_STAGGER_MS])
  })

  it('a negative index does not advance the reveal', () => {
    expect(revealDelayMs(-1)).toBe(0)
  })
})
