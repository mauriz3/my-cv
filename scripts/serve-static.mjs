/**
 * Static server for CI audits and the dependency-free Docker runtime on `.output/public`.
 * Mimics what matters from Netlify: `/path` → `path.html` or `path/index.html`, 404 with `404.html`,
 * and `_headers` (including CSP), so a broken CSP shows up here too.
 * Compresses text with Brotli like Netlify (without it Lighthouse measures several times more bytes than production)
 * and serves `/geo` with the real Edge Function and a simulated country (GEO_COUNTRY, default ES).
 * In audit mode, does not send `X-Robots-Tag`: non-production builds add it on purpose and Lighthouse would
 * score it as an SEO failure; the production artifact does not include it (checked by deploy-production).
 * Loopback by default. `--container` binds all interfaces, preserves noindex and uses unknown country.
 * Usage: node scripts/serve-static.mjs [folder]   (port: PORT, default 4173; `/geo` country: GEO_COUNTRY)
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { brotliCompressSync } from 'node:zlib'
import geo, { config as geoConfig } from '../netlify/edge-functions/geo.ts'
import { isDirectRun } from './isDirectRun.mjs'

const DEFAULT_ROOT = '.output/public'
const DEFAULT_PORT = 4173
/** Loopback only: CI and local audits must not expose the site to other hosts. */
export const SERVER_HOST = '127.0.0.1'
/** Start of the line printed once listening; lighthouserc.cjs waits for it (`startServerReadyPattern`). */
export const SERVER_READY_MARKER = 'Serving'
/**
 * Country returned by `/geo` locally (real Edge Function, simulated country). Default ES: analytics notice
 * appears, as for EU/EEA visits in production (the strictest case).
 */
const DEFAULT_GEO_COUNTRY = 'ES'
const OMITTED_HEADERS = new Set(['x-robots-tag'])
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
}

/** MIME types Netlify serves compressed (text); images, fonts, and PDF are already compressed. */
const COMPRESSIBLE_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt'])

/** Does the client accept Brotli? (`Accept-Encoding: gzip, deflate, br`, without `br;q=0`). */
export function acceptsBrotli(acceptEncoding = '') {
  return acceptEncoding.split(',').some((part) => {
    const [coding = '', ...params] = part.split(';').map((token) => token.trim())
    return coding === 'br' && !params.includes('q=0')
  })
}

/** Netlify `_headers`: one route line and indented headers below it. */
export function parseHeadersFile(text, { omitNoindex = true } = {}) {
  const rules = []
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      rules.push({ pattern: toRegExp(line.trim()), headers: [] })
      continue
    }
    const separator = line.indexOf(':')
    const name = line.slice(0, separator).trim()
    if (!omitNoindex || !OMITTED_HEADERS.has(name.toLowerCase())) rules.at(-1)?.headers.push([name, line.slice(separator + 1).trim()])
  }
  return rules
}

/** `*` = any rest of the path; `:param` = a single segment. */
function toRegExp(pathPattern) {
  const source = pathPattern
    .split('/')
    .map((segment) => (segment === '*' ? '.*' : segment.startsWith(':') ? '[^/]+' : segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return new RegExp(`^${source}$`)
}

async function isFile(path) {
  return (await stat(path).catch(() => null))?.isFile() ?? false
}

/** Supported Netlify subset: literal local redirects with an optional Language condition. Fail closed on drift. */
export function parseRedirectsFile(text) {
  return text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).map((line) => {
    const [from, to, status, condition, ...extra] = line.trim().split(/\s+/)
    if (!/^\/(?!\/)[\w/-]*$/.test(from ?? '') || !/^\/(?!\/)[\w/-]*$/.test(to ?? '') ||
        !['301', '302', '307', '308'].includes(status) || extra.length ||
        (condition && !/^Language=[a-z]{2}$/.test(condition))) {
      throw new Error('Unsupported static redirect rule')
    }
    return { from, to, status: Number(status), language: condition?.slice('Language='.length) }
  })
}

/** Best supported preference; invalid and explicitly excluded languages do not match. */
export function preferredLanguage(header = '') {
  return header.toLowerCase().split(',').map((part) => {
    const [language = '', quality] = part.trim().split(';q=')
    return { language: language.split('-')[0], quality: quality === undefined ? 1 : Number(quality) }
  }).filter(({ language, quality }) => language && quality > 0 && quality <= 1).sort((a, b) => b.quality - a.quality)[0]?.language
}

async function resolveFile(root, urlPath) {
  const decoded = decodeURIComponent(urlPath)
  if (decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some((part) =>
    part.startsWith('.') || part === '_headers' || part === '_redirects')) return null
  const directory = resolve(root)
  const base = resolve(directory, `.${decoded}`)
  if (!base.startsWith(`${directory}${sep}`) && base !== directory) return null
  for (const candidate of [base, `${base}.html`, join(base, 'index.html')]) {
    if (await isFile(candidate)) return candidate
  }
  return null
}

/** `/geo` with the production Edge Function and simulated country (no Netlify edge locally). */
async function serveGeo(request, response, country) {
  const geoResponse = geo(new Request('http://localhost/geo', { method: request.method }), { geo: { country: { code: country } } })
  response.writeHead(geoResponse.status, Object.fromEntries(geoResponse.headers))
  response.end(request.method === 'HEAD' ? undefined : await geoResponse.text())
}

/**
 * Server for generated site in `root` (not listening yet).
 * @param {string} root
 * @param {{ geoCountry?: string | null, omitNoindex?: boolean }} options
 */
export async function createStaticServer(root, { geoCountry = DEFAULT_GEO_COUNTRY, omitNoindex = true } = {}) {
  const headerRules = parseHeadersFile(await readFile(join(root, '_headers'), 'utf8').catch(() => ''), { omitNoindex })
  const redirects = parseRedirectsFile(await readFile(join(root, '_redirects'), 'utf8').catch(() => ''))
  /** Brotli per file, once (generated site does not change while serving). */
  const compressed = new Map()
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.writeHead(405, { Allow: 'GET, HEAD' })
      return response.end()
    }
    let urlPath
    try {
      urlPath = new URL(request.url ?? '/', 'http://localhost').pathname
      decodeURIComponent(urlPath)
    } catch {
      response.writeHead(400)
      return response.end()
    }
    for (const rule of headerRules) {
      if (rule.pattern.test(urlPath)) for (const [name, value] of rule.headers) response.setHeader(name, value)
    }
    const redirect = redirects.find((rule) => rule.from === urlPath &&
      (!rule.language || rule.language === preferredLanguage(request.headers['accept-language'])))
    if (redirect) {
      response.writeHead(redirect.status, { Location: redirect.to })
      return response.end()
    }
    if (urlPath === geoConfig.path) return serveGeo(request, response, geoCountry)
    const file = await resolveFile(root, urlPath)
    const servedFile = file ?? join(root, '404.html')
    let body = await readFile(servedFile).catch(() => Buffer.from('Not found'))
    if (!response.hasHeader('Content-Type')) response.setHeader('Content-Type', CONTENT_TYPES[extname(servedFile)] ?? 'application/octet-stream')
    if (COMPRESSIBLE_EXTENSIONS.has(extname(servedFile))) {
      response.setHeader('Vary', 'Accept-Encoding')
      if (acceptsBrotli(request.headers['accept-encoding'])) {
        body = compressed.get(servedFile) ?? brotliCompressSync(body)
        compressed.set(servedFile, body)
        response.setHeader('Content-Encoding', 'br')
      }
    }
    response.writeHead(file ? 200 : 404)
    response.end(request.method === 'HEAD' ? undefined : body)
  })
}

/** Line printed when the server is ready (starts with `SERVER_READY_MARKER`). */
export function serverReadyMessage(root, port, host = SERVER_HOST) {
  return `${SERVER_READY_MARKER} ${root} at http://${host}:${port}`
}

if (isDirectRun(import.meta.url)) {
  const root = process.argv[2] ?? DEFAULT_ROOT
  const port = Number(process.env.PORT ?? DEFAULT_PORT)
  const container = process.argv.includes('--container')
  const host = container ? '0.0.0.0' : SERVER_HOST
  const geoCountry = process.env.GEO_COUNTRY || (container ? null : DEFAULT_GEO_COUNTRY)
  const server = await createStaticServer(root, { geoCountry, omitNoindex: !container })
  server.listen(port, host, () => console.log(serverReadyMessage(root, port, host)))
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close())
}
