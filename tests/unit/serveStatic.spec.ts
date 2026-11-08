import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { acceptsBrotli, createStaticServer, parseHeadersFile } from '../../scripts/serve-static.mjs'

const HEADERS_FILE = `/*
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'

# Comentario
/api/visits/*
  Content-Type: application/json; charset=utf-8

/_nuxt/:file
  Cache-Control: public, max-age=31536000, immutable
`

/** Sitio generado mínimo con las tres formas de página de Nuxt + Netlify. */
function createSite(): string {
  const root = mkdtempSync(join(tmpdir(), 'serve-static-'))
  mkdirSync(join(root, 'en'))
  mkdirSync(join(root, 'api/visits'), { recursive: true })
  mkdirSync(join(root, '_nuxt/builds'), { recursive: true })
  writeFileSync(join(root, '_headers'), HEADERS_FILE)
  writeFileSync(join(root, 'en/index.html'), '<h1>Perfil</h1>')
  writeFileSync(join(root, 'en/books.html'), '<p>Libros</p>')
  writeFileSync(join(root, '404.html'), '<h1>404</h1>')
  writeFileSync(join(root, 'api/visits/7d'), '{"range":"7d"}')
  writeFileSync(join(root, '_nuxt/app.js'), 'console.log(1)')
  writeFileSync(join(root, '_nuxt/builds/latest.json'), '{}')
  writeFileSync(join(root, 'me.webp'), 'RIFF')
  return root
}

describe('scripts/serve-static.mjs', () => {
  it('lee _headers por reglas, ignora comentarios y no envía X-Robots-Tag', () => {
    const rules = parseHeadersFile(HEADERS_FILE)
    expect(rules.map((rule) => rule.headers)).toEqual([
      [['Content-Security-Policy', "default-src 'self'"]],
      [['Content-Type', 'application/json; charset=utf-8']],
      [['Cache-Control', 'public, max-age=31536000, immutable']]
    ])
    const [allPaths, api, nuxtAsset] = rules.map((rule) => rule.pattern)
    expect(allPaths!.test('/en/visits')).toBe(true)
    expect(api!.test('/api/visits/7d')).toBe(true)
    expect(nuxtAsset!.test('/_nuxt/app.js')).toBe(true)
    expect(nuxtAsset!.test('/_nuxt/builds/latest.json')).toBe(false)
  })

  it('acepta Brotli solo si el cliente lo pide sin q=0', () => {
    expect(acceptsBrotli('gzip, deflate, br')).toBe(true)
    expect(acceptsBrotli('br;q=1.0, gzip;q=0.5')).toBe(true)
    expect(acceptsBrotli('gzip, br;q=0')).toBe(false)
    expect(acceptsBrotli('gzip')).toBe(false)
    expect(acceptsBrotli()).toBe(false)
  })

  describe('servidor', () => {
    let baseUrl = ''
    let server: Awaited<ReturnType<typeof createStaticServer>>

    beforeAll(async () => {
      server = await createStaticServer(createSite(), { geoCountry: 'FR' })
      await new Promise<void>((resolve) => server.listen(0, resolve))
      baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
    })

    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

    it('sirve /ruta como ruta/index.html o ruta.html, igual que Netlify', async () => {
      const profile = await fetch(`${baseUrl}/en`)
      expect(profile.status).toBe(200)
      expect(profile.headers.get('content-type')).toBe('text/html; charset=utf-8')
      expect(await profile.text()).toBe('<h1>Perfil</h1>')
      expect(await (await fetch(`${baseUrl}/en/books`)).text()).toBe('<p>Libros</p>')
    })

    it('aplica las cabeceras de _headers que casan con la ruta', async () => {
      const visits = await fetch(`${baseUrl}/api/visits/7d`)
      expect(visits.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(visits.headers.get('content-security-policy')).toBe("default-src 'self'")
      expect(visits.headers.get('x-robots-tag')).toBeNull()
      const asset = await fetch(`${baseUrl}/_nuxt/app.js`)
      expect(asset.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
      expect(asset.headers.get('cache-control')).toContain('immutable')
    })

    it('responde 404 con 404.html y no sale de la carpeta del sitio', async () => {
      const missing = await fetch(`${baseUrl}/no-existe`)
      expect(missing.status).toBe(404)
      expect(await missing.text()).toBe('<h1>404</h1>')
      expect((await fetch(`${baseUrl}/..%2F..%2F..%2Fetc%2Fpasswd`)).status).toBe(404)
    })

    it('comprime el texto con Brotli como Netlify, no las imágenes', async () => {
      const page = await fetch(`${baseUrl}/en`, { headers: { 'accept-encoding': 'br' } })
      expect(page.headers.get('content-encoding')).toBe('br')
      expect(page.headers.get('vary')).toBe('Accept-Encoding')
      expect(await page.text()).toBe('<h1>Perfil</h1>') // fetch lo descomprime: Brotli válido
      const plain = await fetch(`${baseUrl}/en`, { headers: { 'accept-encoding': 'identity' } })
      expect(plain.headers.get('content-encoding')).toBeNull()
      expect(await plain.text()).toBe('<h1>Perfil</h1>')
      const image = await fetch(`${baseUrl}/me.webp`, { headers: { 'accept-encoding': 'br' } })
      expect(image.headers.get('content-encoding')).toBeNull()
      expect(image.headers.get('content-type')).toBe('image/webp')
    })

    it('/geo responde con la Edge Function y el país simulado', async () => {
      const geo = await fetch(`${baseUrl}/geo`)
      expect(geo.status).toBe(200)
      expect(geo.headers.get('cache-control')).toBe('no-store')
      expect(await geo.json()).toEqual({ country: 'FR' })
      expect(await (await fetch(`${baseUrl}/geo`, { method: 'HEAD' })).text()).toBe('')
      expect((await fetch(`${baseUrl}/geo`, { method: 'POST' })).status).toBe(405)
    })

    it('HEAD devuelve las cabeceras sin cuerpo', async () => {
      const head = await fetch(`${baseUrl}/en`, { method: 'HEAD' })
      expect(head.status).toBe(200)
      expect(await head.text()).toBe('')
    })
  })

  it('sin _headers sirve igual, sin cabeceras extra', async () => {
    const root = mkdtempSync(join(tmpdir(), 'serve-static-'))
    writeFileSync(join(root, 'index.html'), 'ok')
    const server = await createStaticServer(root)
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const response = await fetch(`http://localhost:${(server.address() as AddressInfo).port}/`)
    expect(await response.text()).toBe('ok')
    expect(response.headers.get('content-security-policy')).toBeNull()
    expect(await (await fetch(`http://localhost:${(server.address() as AddressInfo).port}/geo`)).json()).toEqual({ country: 'ES' })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})
