import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BOOKS_SHORT_LINK_ROUTES } from '../../lib/booksShortLink'

interface RedirectRule {
  from: string
  to: string
  status: string
  conditions: string[]
}

const REDIRECTS_FILE = new URL('../../public/_redirects', import.meta.url)
const TRAILING_SLASH = /\/$/

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
/** Netlify empareja las reglas con o sin barra final: se comparan sin ella. */
const withoutTrailingSlash = (path: string) => (path === '/' ? path : path.replace(TRAILING_SLASH, ''))

describe('public/_redirects', () => {
  it('cada regla tiene origen, destino y estado HTTP válidos', () => {
    for (const rule of rules) {
      expect(rule.from).toMatch(/^\//)
      expect(rule.to).toMatch(/^\//)
      expect(rule.status).toMatch(/^(301|302)$/)
    }
  })

  it('ningún destino lleva fragmento (`#`): el Post Inspector de LinkedIn falla con ellos', () => {
    for (const rule of rules) expect(rule.to).not.toContain('#')
  })

  it('los enlaces cortos de Libros no tienen reglas (son páginas que responden 200)', () => {
    const origins = rules.map((rule) => withoutTrailingSlash(rule.from))
    for (const route of BOOKS_SHORT_LINK_ROUTES) expect(origins).not.toContain(route)
  })

  it('no hay orígenes duplicados con las mismas condiciones', () => {
    const keys = rules.map((rule) => `${rule.from} ${rule.conditions.join(' ')}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('no hay bucles: ningún destino vuelve a ser origen de otra regla', () => {
    const origins = new Set(rules.map((rule) => withoutTrailingSlash(rule.from)))
    for (const rule of rules) expect(origins.has(withoutTrailingSlash(rule.to))).toBe(false)
  })
})
