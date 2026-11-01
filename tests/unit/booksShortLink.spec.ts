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

describe('enlaces cortos de Libros', () => {
  it('son /en/books y /es/libros', () => {
    expect(BOOKS_SHORT_LINK_ROUTES).toEqual(['/en/books', '/es/libros'])
  })

  it('llevan a la sección del Perfil de su idioma, con o sin barra final en la ruta del Perfil', () => {
    expect(booksSectionUrl('/en')).toBe('/en/#books')
    expect(booksSectionUrl('/es/')).toBe('/es/#books')
  })

  it('el ancla de destino existe en el Perfil', () => {
    const section = readFileSync(new URL('../../app/components/BooksSection.vue', import.meta.url), 'utf8')
    expect(section).toContain(`id="${BOOKS_SECTION_ID}"`)
  })

  it('el respaldo sin JS es un meta refresh inmediato', () => {
    expect(metaRefreshContent('/en/#books')).toBe('0;url=/en/#books')
  })

  it('el script reemplaza la entrada del historial y escapa el destino como literal JS', () => {
    expect(clientRedirectScript('/es/#books')).toBe('location.replace("/es/#books")')
    expect(clientRedirectScript('/x"y')).toBe('location.replace("/x\\"y")')
  })

  it('se prerenderizan como `.html` plano (Netlify: 200 en /en/books, sin 301 a la barra final)', () => {
    expect(prerenderFileName('/en/books', '/en/books/index.html')).toBe('/en/books.html')
    expect(prerenderFileName('/es/libros', '/es/libros/index.html')).toBe('/es/libros.html')
  })

  it('el resto de rutas conserva su fichero', () => {
    expect(prerenderFileName('/en/privacy', '/en/privacy/index.html')).toBe('/en/privacy/index.html')
    expect(prerenderFileName('/en/books-extra', '/en/books-extra/index.html')).toBe('/en/books-extra/index.html')
  })

  it('solo descarta el payload de los enlaces cortos', () => {
    expect(isUnusedPayload('/en/books/_payload.json')).toBe(true)
    expect(isUnusedPayload('/es/libros/_payload.json?_b=123')).toBe(true)
    expect(isUnusedPayload('/en/_payload.json')).toBe(false)
    expect(isUnusedPayload('/en/privacy/_payload.json')).toBe(false)
  })
})
