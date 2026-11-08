import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ANALYTICS_CSP_SOURCES } from '../../lib/analytics'
import { buildHeaders, inlineScriptHashes } from '../../scripts/build-headers.mjs'

const HEADERS_TEMPLATE = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8')
const INLINE_SCRIPT = 'document.documentElement.dataset.motion="full"'
const cspHash = (content: string) => `'sha256-${createHash('sha256').update(content).digest('base64')}'`
const page = (body: string) => `<!doctype html><html><head>${body}</head><body></body></html>`

describe('scripts/build-headers.mjs', () => {
  it('hashea solo los scripts inline ejecutables, sin repetir', () => {
    const hashes = inlineScriptHashes([
      page(`<script>${INLINE_SCRIPT}</script><script src="/_nuxt/app.js"></script>`),
      page(`<script type="application/ld+json">{"@type":"Person"}</script><script type="application/json">{}</script>`),
      page(`<script>${INLINE_SCRIPT}</script><script>  </script>`)
    ])
    expect(hashes).toEqual([cspHash(INLINE_SCRIPT)])
  })

  it('fuera de producción añade los hashes a script-src y noindex a todas las rutas, sin orígenes de GA', () => {
    const { headers, hashCount, isProduction } = buildHeaders(HEADERS_TEMPLATE, [page(`<script>${INLINE_SCRIPT}</script>`)], 'deploy-preview')
    expect(isProduction).toBe(false)
    expect(hashCount).toBe(1)
    expect(headers).toContain(`script-src 'self' ${cspHash(INLINE_SCRIPT)}`)
    expect(headers.startsWith('/*\n  X-Robots-Tag: noindex, nofollow\n')).toBe(true)
    expect(headers).not.toContain(ANALYTICS_CSP_SOURCES['script-src'][0])
  })

  it('en producción permite los orígenes de Google Analytics y no lleva noindex', () => {
    const { headers, isProduction } = buildHeaders(HEADERS_TEMPLATE, [], 'production')
    expect(isProduction).toBe(true)
    expect(headers).not.toContain('X-Robots-Tag')
    for (const [directive, sources] of Object.entries(ANALYTICS_CSP_SOURCES)) {
      expect(headers).toContain(`${directive} 'self' ${sources.join(' ')}`)
    }
  })

  it('falla si a la plantilla le falta lo que debe completar', () => {
    expect(() => buildHeaders('/*\n  X-Frame-Options: DENY\n', [], 'production')).toThrow("script-src 'self'")
    expect(() => buildHeaders("/*\n  Content-Security-Policy: script-src 'self'\n", [], 'production')).toThrow('connect-src')
    expect(() => buildHeaders("/api/*\n  Content-Security-Policy: script-src 'self'\n", [], undefined)).toThrow('«/*»')
  })
})
