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
import { readFile, realpath, stat } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import geo, { config as geoConfig } from '../netlify/edge-functions/geo.ts'
import { isDirectRun } from './isDirectRun.mjs'

const DEFAULT_ROOT = '.output/public'
const DEFAULT_PORT = 4173
const SHUTDOWN_TIMEOUT_MS = 5000
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

/** Parse quality numerically, treating invalid/duplicate exclusions conservatively. */
function encodingQualities(header) {
  const qualities = new Map()
  for (const entry of header.toLowerCase().split(',')) {
    const [coding = '', ...params] = entry.split(';').map((part) => part.trim())
    if (!coding) continue
    const weights = params.filter((part) => /^q\s*=/.test(part))
    const q = weights[0]?.split('=')[1]?.trim()
    const quality = weights.length > 1 || params.length !== weights.length ? 0 : q === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(q) ? Number(q) : 0
    qualities.set(coding, Math.min(qualities.get(coding) ?? 1, quality))
  }
  return qualities
}

/** Explicit exclusions override wildcards; missing Accept-Encoding keeps identity. */
export function acceptsBrotli(acceptEncoding = '') {
  const qualities = encodingQualities(acceptEncoding)
  return (qualities.get('br') ?? qualities.get('*') ?? 0) > 0
}

/** Prefer the highest quality supported encoding, Brotli on ties; null means 406. */
export function negotiateEncoding(acceptEncoding = '') {
  const qualities = encodingQualities(acceptEncoding)
  const quality = (coding) => qualities.get(coding) ?? qualities.get('*') ?? 0
  const encoding = quality('br') >= quality('gzip') ? 'br' : 'gzip'
  const best = quality(encoding)
  const identity = qualities.get('identity') ?? (qualities.get('*') === 0 ? 0 : 1)
  if (best > 0 && (qualities.get('identity') === undefined || best >= identity)) return encoding
  return identity > 0 ? 'identity' : null
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

/** Resolve symlinks as well as lexical paths. Published content must remain immutable. */
async function containedFile(root, candidate) {
  try {
    const canonical = await realpath(candidate)
    if (!canonical.startsWith(`${root}${sep}`)) return null
    return (await stat(canonical)).isFile() ? canonical : null
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null
    throw error
  }
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

function isPrivatePath(path) {
  return path.split('/').some((part) => part.startsWith('.') || part === '_headers' || part === '_redirects')
}

async function resolveFile(root, urlPath) {
  const decoded = decodeURIComponent(urlPath)
  if (decoded.includes('\\') || decoded.includes('\0') || isPrivatePath(decoded)) return null
  const directory = resolve(root)
  const base = resolve(directory, `.${decoded}`)
  if (!base.startsWith(`${directory}${sep}`) && base !== directory) return null
  for (const candidate of [base, `${base}.html`, join(base, 'index.html')]) {
    const canonical = await containedFile(directory, candidate)
    if (canonical && !isPrivatePath(relative(directory, canonical))) return canonical
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
 * @param {{ geoCountry?: string | null, omitNoindex?: boolean, requireHeaders?: boolean }} options
 */
export async function createStaticServer(root, { geoCountry = DEFAULT_GEO_COUNTRY, omitNoindex = true, requireHeaders = false } = {}) {
  root = await realpath(root)
  const headersFile = await containedFile(root, join(root, '_headers'))
  if (requireHeaders && !headersFile) throw new Error('Static security headers are required')
  const headerRules = parseHeadersFile(headersFile ? await readFile(headersFile, 'utf8') : '', { omitNoindex })
  if (requireHeaders) {
    const globalHeaders = new Map(headerRules.filter((rule) => rule.pattern.test('/')).flatMap((rule) =>
      rule.headers.map(([name, value]) => [name.toLowerCase(), value])))
    const critical = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy',
      'permissions-policy', 'strict-transport-security', 'cross-origin-opener-policy']
    if (critical.some((name) => !globalHeaders.get(name)) || globalHeaders.get('x-content-type-options') !== 'nosniff') {
      throw new Error('Static security headers are incomplete')
    }
  }
  const redirectsFile = await containedFile(root, join(root, '_redirects'))
  const redirects = parseRedirectsFile(redirectsFile ? await readFile(redirectsFile, 'utf8') : '')
  /** At most one cached result per encoding/file; the published tree is immutable. */
  const compressed = new Map()
  return createServer(async (request, response) => {
    try {
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
      if (urlPath === geoConfig.path) return await serveGeo(request, response, geoCountry)
      const file = await resolveFile(root, urlPath)
      const servedFile = file ?? await resolveFile(root, '/404.html')
      let body = servedFile ? await readFile(servedFile) : Buffer.from('Not found')
      const extension = servedFile ? extname(servedFile) : '.txt'
      if (!response.hasHeader('Content-Type')) response.setHeader('Content-Type', CONTENT_TYPES[extension] ?? 'application/octet-stream')
      if (COMPRESSIBLE_EXTENSIONS.has(extension)) {
        response.setHeader('Vary', 'Accept-Encoding')
        const encoding = negotiateEncoding(request.headers['accept-encoding'])
        if (!encoding) {
          response.writeHead(406)
          return response.end()
        }
        if (encoding !== 'identity') {
          const cacheKey = `${encoding}:${servedFile}`
          body = compressed.get(cacheKey) ?? (encoding === 'br' ? brotliCompressSync(body) : gzipSync(body))
          compressed.set(cacheKey, body)
          response.setHeader('Content-Encoding', encoding)
        }
      }
      response.writeHead(file ? 200 : 404)
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch {
      if (response.headersSent) return response.destroy()
      response.removeHeader('Content-Encoding')
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      response.end(request.method === 'HEAD' ? undefined : 'Internal server error')
    }
  })
}

/** Bounded graceful shutdown: drain requests, then terminate remaining connections. */
export function closeStaticServer(server, timeoutMs = SHUTDOWN_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => server.closeAllConnections(), timeoutMs)
    timer.unref()
    server.close(() => { clearTimeout(timer); resolve() })
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
  const server = await createStaticServer(root, { geoCountry, omitNoindex: !container, requireHeaders: container })
  server.listen(port, host, () => console.log(serverReadyMessage(root, port, host)))
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { void closeStaticServer(server) })
}
