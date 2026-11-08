import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BOOKS_SECTION_ID,
  BOOKS_SHORT_LINK_ROUTES,
  booksSectionUrl,
  clientRedirectScript,
  isUnusedPayload,
  metaRefreshContent,
  prerenderFileName
} from '../../lib/booksShortLink'

describe('Books short links', () => {
  it('are /en/books and /es/libros', () => {
    expect(BOOKS_SHORT_LINK_ROUTES).toEqual(['/en/books', '/es/libros'])
  })

  it('point to the Profile books section per locale, with or without trailing slash on Profile', () => {
    expect(booksSectionUrl('/en')).toBe('/en/#books')
    expect(booksSectionUrl('/es/')).toBe('/es/#books')
  })

  it('destination anchor exists on Profile', () => {
    const section = readFileSync(new URL('../../app/components/BooksSection.vue', import.meta.url), 'utf8')
    expect(section).toContain(`id="${BOOKS_SECTION_ID}"`)
  })

  it('no-JS fallback is an immediate meta refresh', () => {
    expect(metaRefreshContent('/en/#books')).toBe('0;url=/en/#books')
  })

  it('script replaces history entry and escapes destination as JS literal', () => {
    expect(clientRedirectScript('/es/#books')).toBe('location.replace("/es/#books")')
    expect(clientRedirectScript('/x"y')).toBe('location.replace("/x\\"y")')
  })

  it('prerender as flat `.html` (Netlify: 200 on /en/books, no 301 to trailing slash)', () => {
    expect(prerenderFileName('/en/books', '/en/books/index.html')).toBe('/en/books.html')
    expect(prerenderFileName('/es/libros', '/es/libros/index.html')).toBe('/es/libros.html')
  })

  it('other routes keep their file', () => {
    expect(prerenderFileName('/en/privacy', '/en/privacy/index.html')).toBe('/en/privacy/index.html')
    expect(prerenderFileName('/en/books-extra', '/en/books-extra/index.html')).toBe('/en/books-extra/index.html')
  })

  it('only drops payload for short-link routes', () => {
    expect(isUnusedPayload('/en/books/_payload.json')).toBe(true)
    expect(isUnusedPayload('/es/libros/_payload.json?_b=123')).toBe(true)
    expect(isUnusedPayload('/en/_payload.json')).toBe(false)
    expect(isUnusedPayload('/en/privacy/_payload.json')).toBe(false)
  })
})
