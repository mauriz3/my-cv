/**
 * Minimal static server for CI audits (axe and Lighthouse) on `.output/public`.
 * Mimics what matters from Netlify: `/path` → `path.html` or `path/index.html`, 404 with `404.html`,
 * and `_headers` (including CSP), so a broken CSP shows up here too.
 * Compresses text with Brotli like Netlify (without it Lighthouse measures several times more bytes than production)
 * and serves `/geo` with the real Edge Function and a simulated country (GEO_COUNTRY, default ES).
 * Does not send `X-Robots-Tag`: non-production builds add it on purpose and Lighthouse would
 * score it as an SEO failure; the production artifact does not include it (checked by deploy-production).
 * Usage: node scripts/serve-static.mjs [folder]   (port: PORT, default 4173; `/geo` country: GEO_COUNTRY)
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { brotliCompressSync } from 'node:zlib'
import geo, { config as geoConfig } from '../netlify/edge-functions/geo.ts'
import { isDirectRun } from './isDirectRun.mjs'

const DEFAULT_ROOT = '.output/public'
const DEFAULT_PORT = 4173
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
export function parseHeadersFile(text) {
  const rules = []
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      rules.push({ pattern: toRegExp(line.trim()), headers: [] })
      continue
    }
    const separator = line.indexOf(':')
    const name = line.slice(0, separator).trim()
    if (!OMITTED_HEADERS.has(name.toLowerCase())) rules.at(-1)?.headers.push([name, line.slice(separator + 1).trim()])
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

async function resolveFile(root, urlPath) {
  const base = join(root, normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, ''))
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

/** Server for generated site in `root` (not listening yet). `geoCountry`: country for `/geo`. */
export async function createStaticServer(root, { geoCountry = DEFAULT_GEO_COUNTRY } = {}) {
  const headerRules = parseHeadersFile(await readFile(join(root, '_headers'), 'utf8').catch(() => ''))
  /** Brotli per file, once (generated site does not change while serving). */
  const compressed = new Map()
  return createServer(async (request, response) => {
    const urlPath = new URL(request.url ?? '/', 'http://localhost').pathname
    if (urlPath === geoConfig.path) return serveGeo(request, response, geoCountry)
    const file = await resolveFile(root, urlPath)
    const servedFile = file ?? join(root, '404.html')
    let body = await readFile(servedFile).catch(() => Buffer.from('Not found'))
    response.setHeader('Content-Type', CONTENT_TYPES[extname(servedFile)] ?? 'application/octet-stream')
    if (COMPRESSIBLE_EXTENSIONS.has(extname(servedFile))) {
      response.setHeader('Vary', 'Accept-Encoding')
      if (acceptsBrotli(request.headers['accept-encoding'])) {
        body = compressed.get(servedFile) ?? brotliCompressSync(body)
        compressed.set(servedFile, body)
        response.setHeader('Content-Encoding', 'br')
      }
    }
    for (const rule of headerRules) {
      if (rule.pattern.test(urlPath)) for (const [name, value] of rule.headers) response.setHeader(name, value)
    }
    response.writeHead(file ? 200 : 404)
    response.end(request.method === 'HEAD' ? undefined : body)
  })
}

if (isDirectRun(import.meta.url)) {
  const root = process.argv[2] ?? DEFAULT_ROOT
  const port = Number(process.env.PORT ?? DEFAULT_PORT)
  const server = await createStaticServer(root, { geoCountry: process.env.GEO_COUNTRY || DEFAULT_GEO_COUNTRY })
  server.listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`))
}
