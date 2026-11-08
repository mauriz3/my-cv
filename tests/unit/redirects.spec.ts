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

/** Netlify format: `from to status [conditions]`, with `#` for line comments. */
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
/** Netlify matches rules with or without trailing slash: compare without it. */
const withoutTrailingSlash = (path: string) => (path === '/' ? path : path.replace(TRAILING_SLASH, ''))

describe('public/_redirects', () => {
  it('each rule has valid from, to, and HTTP status', () => {
    for (const rule of rules) {
      expect(rule.from).toMatch(/^\//)
      expect(rule.to).toMatch(/^\//)
      expect(rule.status).toMatch(/^(301|302)$/)
    }
  })

  it('no destination has a fragment (`#`): LinkedIn Post Inspector fails with them', () => {
    for (const rule of rules) expect(rule.to).not.toContain('#')
  })

  it('Books short links have no rules (they are pages that return 200)', () => {
    const origins = rules.map((rule) => withoutTrailingSlash(rule.from))
    for (const route of BOOKS_SHORT_LINK_ROUTES) expect(origins).not.toContain(route)
  })

  it('no duplicate origins with the same conditions', () => {
    const keys = rules.map((rule) => `${rule.from} ${rule.conditions.join(' ')}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('no loops: no destination is another rule’s origin', () => {
    const origins = new Set(rules.map((rule) => withoutTrailingSlash(rule.from)))
    for (const rule of rules) expect(origins.has(withoutTrailingSlash(rule.to))).toBe(false)
  })
})
