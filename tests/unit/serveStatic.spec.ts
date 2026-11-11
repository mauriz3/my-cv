import { once } from 'node:events'
import { createServer as createHttpServer } from 'node:http'
import { createConnection } from 'node:net'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, unlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  SERVER_HOST,
  SERVER_READY_MARKER,
  acceptsBrotli,
  createStaticServer,
  closeStaticServer,
  negotiateEncoding,
  parseHeadersFile,
  parseRedirectsFile,
  preferredLanguage,
  serverReadyMessage
} from '../../scripts/serve-static.mjs'

const lighthouseConfig = createRequire(import.meta.url)('../../lighthouserc.cjs') as {
  ci: { collect: { startServerReadyPattern: string; url: string[] } }
}

const HEADERS_FILE = `/*
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin

# Comment
/api/visits/*
  Content-Type: application/json; charset=utf-8

/_nuxt/:file
  Cache-Control: public, max-age=31536000, immutable
`

/** Minimal generated site with Nuxt’s three page shapes + Netlify. */
function createSite(): string {
  const root = mkdtempSync(join(tmpdir(), 'serve-static-'))
  mkdirSync(join(root, 'en'))
  mkdirSync(join(root, 'api/visits'), { recursive: true })
  mkdirSync(join(root, '_nuxt/builds'), { recursive: true })
  writeFileSync(join(root, '_headers'), HEADERS_FILE)
  writeFileSync(join(root, '_redirects'), '# Root redirects\n/ /es/ 302 Language=es\n/ /en/ 302\n')
  writeFileSync(join(root, '.env'), 'NOT_PUBLIC')
  writeFileSync(join(root, 'en/index.html'), '<h1>Profile</h1>')
  writeFileSync(join(root, 'en/books.html'), '<p>Books</p>')
  writeFileSync(join(root, '404.html'), '<h1>404</h1>')
  writeFileSync(join(root, 'api/visits/7d'), '{"range":"7d"}')
  writeFileSync(join(root, '_nuxt/app.js'), 'console.log(1)')
  writeFileSync(join(root, '_nuxt/builds/latest.json'), '{}')
  writeFileSync(join(root, 'me.webp'), 'RIFF')
  return root
}

describe('scripts/serve-static.mjs', () => {
  it('reads _headers by rules, ignores comments, does not send X-Robots-Tag', () => {
    const rules = parseHeadersFile(HEADERS_FILE)
    expect(rules.map((rule) => rule.headers)).toEqual([
      [['Content-Security-Policy', "default-src 'self'"],
        ['X-Content-Type-Options', 'nosniff'], ['X-Frame-Options', 'DENY'],
        ['Referrer-Policy', 'strict-origin-when-cross-origin'],
        ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
        ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
        ['Cross-Origin-Opener-Policy', 'same-origin']],
      [['Content-Type', 'application/json; charset=utf-8']],
      [['Cache-Control', 'public, max-age=31536000, immutable']]
    ])
    const [allPaths, api, nuxtAsset] = rules.map((rule) => rule.pattern)
    expect(allPaths!.test('/en/visits')).toBe(true)
    expect(api!.test('/api/visits/7d')).toBe(true)
    expect(nuxtAsset!.test('/_nuxt/app.js')).toBe(true)
    expect(nuxtAsset!.test('/_nuxt/builds/latest.json')).toBe(false)
  })

  it('retains noindex outside audit mode', () => {
    expect(parseHeadersFile(HEADERS_FILE, { omitNoindex: false })[0]!.headers)
      .toContainEqual(['X-Robots-Tag', 'noindex, nofollow'])
  })

  it('parses local redirects and rejects unsupported rules instead of silently drifting', () => {
    expect(parseRedirectsFile('/ /en/ 302')).toEqual([{ from: '/', to: '/en/', status: 302, language: undefined }])
    for (const rule of ['/ https://example.test 302', '/ /en/ 200', '/* /en/:splat 301', '/ /en/ 302 Country=es', '/ /en/ 302 Language=es extra']) {
      expect(() => parseRedirectsFile(rule)).toThrow('Unsupported static redirect rule')
    }
    expect(preferredLanguage()).toBeUndefined()
    expect(preferredLanguage('en;q=0.5,es-ES;q=0.9')).toBe('es')
    expect(preferredLanguage('es;q=0,en')).toBe('en')
    expect(preferredLanguage('es;q=invalid,en;q=2')).toBeUndefined()
  })

  it('accepts Brotli only when client asks without q=0', () => {
    expect(acceptsBrotli('gzip, deflate, br')).toBe(true)
    expect(acceptsBrotli('br;q=1.0, gzip;q=0.5')).toBe(true)
    expect(acceptsBrotli('gzip, br;q=0')).toBe(false)
    expect(acceptsBrotli('gzip')).toBe(false)
    expect(acceptsBrotli()).toBe(false)
    for (const quality of ['0', '0.0', '0.000', '-1', '2', 'NaN', 'invalid']) {
      expect(acceptsBrotli(`br;q=${quality}`)).toBe(false)
      expect(negotiateEncoding(`gzip;q=${quality}, br;q=0`)).toBe('identity')
    }
    expect(acceptsBrotli('BR; Q = 0.5')).toBe(true)
    expect(acceptsBrotli('*;q=1, br;q=0.0')).toBe(false)
    expect(acceptsBrotli('br;q=1,br;q=0')).toBe(false)
    expect(acceptsBrotli('br;q=1;q=0')).toBe(false)
    expect(acceptsBrotli('br;invalid')).toBe(false)
    expect(acceptsBrotli('*;q=0.5')).toBe(true)
    expect(negotiateEncoding('gzip;q=1, br;q=0.5')).toBe('gzip')
    expect(negotiateEncoding('gzip;q=0.5,br;q=1')).toBe('br')
    expect(negotiateEncoding('gzip;q=0.5,br;q=0.5')).toBe('br')
    expect(negotiateEncoding('identity;q=1,br;q=0.5')).toBe('identity')
    expect(negotiateEncoding('gzip;q=0,br;q=0,identity;q=0')).toBeNull()
    expect(negotiateEncoding('*;q=0')).toBeNull()
    expect(negotiateEncoding('*;q=0,identity;q=1')).toBe('identity')
  })

  it('Lighthouse waits for the ready line the server prints and audits the loopback host', () => {
    const { startServerReadyPattern, url } = lighthouseConfig.ci.collect
    const readyLine = serverReadyMessage('.output/public', 4173)
    expect(readyLine.startsWith(SERVER_READY_MARKER)).toBe(true)
    expect(new RegExp(startServerReadyPattern).test(readyLine)).toBe(true)
    for (const auditedUrl of url) expect(new URL(auditedUrl).hostname).toBe(SERVER_HOST)
  })

  describe('server', () => {
    let baseUrl = ''
    let server: Awaited<ReturnType<typeof createStaticServer>>

    beforeAll(async () => {
      server = await createStaticServer(createSite(), { geoCountry: 'FR' })
      await new Promise<void>((resolve) => server.listen(0, SERVER_HOST, resolve))
      baseUrl = `http://${SERVER_HOST}:${(server.address() as AddressInfo).port}`
    })

    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

    it('serves /path as path/index.html or path.html, like Netlify', async () => {
      const profile = await fetch(`${baseUrl}/en`)
      expect(profile.status).toBe(200)
      expect(profile.headers.get('content-type')).toBe('text/html; charset=utf-8')
      expect(await profile.text()).toBe('<h1>Profile</h1>')
      expect(await (await fetch(`${baseUrl}/en/books`)).text()).toBe('<p>Books</p>')
    })

    it('redirects the root by preferred language using _redirects', async () => {
      for (const [language, target] of [['es-ES,en;q=0.8', '/es/'], ['en,es;q=0.8', '/en/'], ['fr', '/en/']]) {
        const response = await fetch(`${baseUrl}/`, { headers: { 'accept-language': language! }, redirect: 'manual' })
        expect(response.status).toBe(302)
        expect(response.headers.get('location')).toBe(target)
        expect(response.headers.get('content-security-policy')).toBe("default-src 'self'")
      }
    })

    it('rejects malformed escapes, hidden files and unsupported methods without crashing', async () => {
      for (const path of ['/.env', '/_headers', '/_redirects', '/..%5c.env', '/%00']) {
        expect((await fetch(`${baseUrl}${path}`)).status).toBe(404)
      }
      expect((await fetch(`${baseUrl}/%broken`)).status).toBe(400)
      const post = await fetch(`${baseUrl}/en`, { method: 'POST' })
      expect(post.status).toBe(405)
      expect(post.headers.get('allow')).toBe('GET, HEAD')
      expect((await fetch(`${baseUrl}/en/`)).status).toBe(200)
    })

    it('applies matching _headers rules', async () => {
      const visits = await fetch(`${baseUrl}/api/visits/7d`)
      expect(visits.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(visits.headers.get('content-security-policy')).toBe("default-src 'self'")
      expect(visits.headers.get('x-robots-tag')).toBeNull()
      const asset = await fetch(`${baseUrl}/_nuxt/app.js`)
      expect(asset.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
      expect(asset.headers.get('cache-control')).toContain('immutable')
    })

    it('404 serves 404.html and does not escape site folder', async () => {
      const missing = await fetch(`${baseUrl}/missing`)
      expect(missing.status).toBe(404)
      expect(await missing.text()).toBe('<h1>404</h1>')
      expect((await fetch(`${baseUrl}/..%2F..%2F..%2Fetc%2Fpasswd`)).status).toBe(404)
    })

    it('compresses text with Brotli like Netlify, not images', async () => {
      const page = await fetch(`${baseUrl}/en`, { headers: { 'accept-encoding': 'br' } })
      expect(page.headers.get('content-encoding')).toBe('br')
      expect(page.headers.get('vary')).toBe('Accept-Encoding')
      expect(await page.text()).toBe('<h1>Profile</h1>') // fetch decompresses: valid Brotli
      const plain = await fetch(`${baseUrl}/en`, { headers: { 'accept-encoding': 'identity' } })
      expect(plain.headers.get('content-encoding')).toBeNull()
      expect(await plain.text()).toBe('<h1>Profile</h1>')
      const image = await fetch(`${baseUrl}/me.webp`, { headers: { 'accept-encoding': 'br' } })
      expect(image.headers.get('content-encoding')).toBeNull()
      expect(image.headers.get('content-type')).toBe('image/webp')
    })

    it('honors Brotli and gzip exclusions and returns valid gzip', async () => {
      for (const quality of ['0', '0.0', '0.000']) {
        const response = await fetch(`${baseUrl}/en`, { headers: { 'accept-encoding': `br;q=${quality},gzip;q=${quality}` } })
        expect(response.headers.get('content-encoding')).toBeNull()
        expect(await response.text()).toBe('<h1>Profile</h1>')
      }
      const gzip = await fetch(`${baseUrl}/en`, { headers: { 'accept-encoding': 'br;q=0,gzip;q=1' } })
      expect(gzip.headers.get('content-encoding')).toBe('gzip')
      expect(await gzip.text()).toBe('<h1>Profile</h1>')
      expect((await fetch(`${baseUrl}/en`, { headers: { 'accept-encoding': '*;q=0' } })).status).toBe(406)
    })

    it('/geo responds with Edge Function and simulated country', async () => {
      const geo = await fetch(`${baseUrl}/geo`)
      expect(geo.status).toBe(200)
      expect(geo.headers.get('cache-control')).toBe('no-store')
      expect(await geo.json()).toEqual({ country: 'FR' })
      expect(await (await fetch(`${baseUrl}/geo`, { method: 'HEAD' })).text()).toBe('')
      expect((await fetch(`${baseUrl}/geo`, { method: 'POST' })).status).toBe(405)
    })

    it('HEAD returns headers without body', async () => {
      const head = await fetch(`${baseUrl}/en`, { method: 'HEAD' })
      expect(head.status).toBe(200)
      expect(await head.text()).toBe('')
    })
  })

  it('container mode preserves noindex and uses unknown country without credentials', async () => {
    const server = await createStaticServer(createSite(), { omitNoindex: false, geoCountry: null, requireHeaders: true })
    await new Promise<void>((resolve) => server.listen(0, SERVER_HOST, resolve))
    try {
      const origin = `http://${SERVER_HOST}:${(server.address() as AddressInfo).port}`
      expect((await fetch(`${origin}/en/`)).headers.get('x-robots-tag')).toBe('noindex, nofollow')
      expect(await (await fetch(`${origin}/geo`)).json()).toEqual({ country: null })
      expect(serverReadyMessage('public', 8080, '0.0.0.0')).toContain('http://0.0.0.0:8080')
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('requires readable, complete security headers in strict container mode', async () => {
    const root = createSite()
    unlinkSync(join(root, '_headers'))
    await expect(createStaticServer(root, { requireHeaders: true })).rejects.toThrow('Static security headers are required')
    writeFileSync(join(root, '_headers'), "/*\n  Content-Security-Policy: default-src 'self'\n")
    await expect(createStaticServer(root, { requireHeaders: true })).rejects.toThrow('Static security headers are incomplete')
  })

  it('contains symlink files, directories, 404 fallback and security metadata', async () => {
    const root = createSite()
    const outside = mkdtempSync(join(tmpdir(), 'outside-static-'))
    writeFileSync(join(outside, 'marker.txt'), 'OUTSIDE_MARKER')
    writeFileSync(join(outside, '_headers'), HEADERS_FILE)
    symlinkSync(join(outside, 'marker.txt'), join(root, 'linked.txt'))
    symlinkSync(outside, join(root, 'linked-directory'))
    symlinkSync(join(root, 'en/index.html'), join(root, 'internal.txt'))
    symlinkSync(join(root, '.env'), join(root, 'private-alias.txt'))
    symlinkSync(join(root, '_headers'), join(root, 'headers-alias.txt'))
    unlinkSync(join(root, '404.html'))
    symlinkSync(join(outside, 'marker.txt'), join(root, '404.html'))
    const server = await createStaticServer(root)
    await new Promise<void>((resolve) => server.listen(0, SERVER_HOST, resolve))
    try {
      const origin = `http://${SERVER_HOST}:${(server.address() as AddressInfo).port}`
      for (const path of ['/linked.txt', '/linked-directory/marker.txt', '/private-alias.txt', '/headers-alias.txt', '/missing', '/404.html']) {
        const response = await fetch(`${origin}${path}`)
        expect(response.status).toBe(404)
        expect(await response.text()).not.toContain('OUTSIDE_MARKER')
      }
      expect(await (await fetch(`${origin}/internal.txt`)).text()).toBe('<h1>Profile</h1>')
    } finally {
      await closeStaticServer(server)
    }
    unlinkSync(join(root, '_headers'))
    symlinkSync(join(outside, '_headers'), join(root, '_headers'))
    await expect(createStaticServer(root, { requireHeaders: true })).rejects.toThrow('Static security headers are required')
  })

  it('isolates unexpected request errors with a generic 500 and keeps serving', async () => {
    const root = createSite()
    symlinkSync('loop.txt', join(root, 'loop.txt'))
    const server = await createStaticServer(root)
    await new Promise<void>((resolve) => server.listen(0, SERVER_HOST, resolve))
    try {
      const origin = `http://${SERVER_HOST}:${(server.address() as AddressInfo).port}`
      const response = await fetch(`${origin}/loop.txt`)
      expect(response.status).toBe(500)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.text()).toBe('Internal server error')
      expect((await fetch(`${origin}/loop.txt`, { method: 'HEAD' })).status).toBe(500)
      expect((await fetch(`${origin}/en/`)).status).toBe(200)
    } finally {
      await closeStaticServer(server)
    }
  })

  it('bounds shutdown even with an active unfinished response', async () => {
    const server = createHttpServer((_request, response) => response.write('pending'))
    await new Promise<void>((resolve) => server.listen(0, SERVER_HOST, resolve))
    const socket = createConnection({ host: SERVER_HOST, port: (server.address() as AddressInfo).port })
    await once(socket, 'connect')
    socket.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
    await once(socket, 'data')
    const closed = once(socket, 'close')
    await closeStaticServer(server, 20)
    await closed
    expect(server.listening).toBe(false)
  })

  it('without _headers serves the same, no extra headers', async () => {
    const root = mkdtempSync(join(tmpdir(), 'serve-static-'))
    writeFileSync(join(root, 'index.html'), 'ok')
    const server = await createStaticServer(root)
    await new Promise<void>((resolve) => server.listen(0, SERVER_HOST, resolve))
    const origin = `http://${SERVER_HOST}:${(server.address() as AddressInfo).port}`
    const response = await fetch(`${origin}/`)
    expect(await response.text()).toBe('ok')
    expect(response.headers.get('content-security-policy')).toBeNull()
    expect(await (await fetch(`${origin}/geo`)).json()).toEqual({ country: 'ES' })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})
