import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface RedirectRule {
  from: string
  to: string
  status: string
  conditions: string[]
}

const REDIRECTS_FILE = new URL('../../public/_redirects', import.meta.url)
const BOOKS_SECTION_ID = 'books'
const PERMANENT = '301'
const BOOKS_SHORT_LINKS = [
  { from: '/en/books', to: `/en/#${BOOKS_SECTION_ID}` },
  { from: '/en/books/', to: `/en/#${BOOKS_SECTION_ID}` },
  { from: '/es/libros', to: `/es/#${BOOKS_SECTION_ID}` },
  { from: '/es/libros/', to: `/es/#${BOOKS_SECTION_ID}` },
]

/** Formato de Netlify: `origen destino estado [condiciones]`, con `#` para comentarios de línea. */
function parseRedirects(text: string): RedirectRule[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status, ...conditions] = line.split(/\s+/)
      return { from: from!, to: to!, status: status!, conditions }
    })
}

const rules = parseRedirects(readFileSync(REDIRECTS_FILE, 'utf8'))
const pathOf = (url: string) => url.split('#')[0]!

describe('public/_redirects', () => {
  it('cada regla tiene origen, destino y estado HTTP válidos', () => {
    for (const rule of rules) {
      expect(rule.from).toMatch(/^\//)
      expect(rule.to).toMatch(/^\//)
      expect(rule.status).toMatch(/^(301|302)$/)
    }
  })

  it('los enlaces cortos de Libros redirigen con 301 a la sección del Perfil', () => {
    for (const link of BOOKS_SHORT_LINKS) {
      expect(rules).toContainEqual({ ...link, status: PERMANENT, conditions: [] })
    }
  })

  it('no hay orígenes duplicados con las mismas condiciones', () => {
    const keys = rules.map((rule) => `${rule.from} ${rule.conditions.join(' ')}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('no hay bucles: ningún destino vuelve a ser origen de otra regla', () => {
    const origins = new Set(rules.map((rule) => rule.from))
    for (const rule of rules) expect(origins.has(pathOf(rule.to))).toBe(false)
  })

  it('el ancla de destino existe en el Perfil', () => {
    const section = readFileSync(new URL('../../app/components/BooksSection.vue', import.meta.url), 'utf8')
    expect(section).toContain(`id="${BOOKS_SECTION_ID}"`)
  })
})
