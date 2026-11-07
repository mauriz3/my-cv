/**
 * Servidor estático mínimo para las auditorías de CI (axe y Lighthouse) sobre `.output/public`.
 * Imita lo que importa de Netlify: `/ruta` → `ruta.html` o `ruta/index.html`, 404 con `404.html`
 * y las cabeceras de `_headers` (CSP incluida), así una CSP rota también se nota aquí.
 * `X-Robots-Tag` no se envía: fuera de producción el build lo añade a propósito y Lighthouse lo
 * puntuaría como fallo de SEO; el artefacto de producción no lo lleva (lo comprueba deploy-production).
 * Uso: node scripts/serve-static.mjs [carpeta]   (puerto: PORT, por defecto 4173)
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = process.argv[2] ?? '.output/public'
const PORT = Number(process.env.PORT ?? 4173)
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

/** `_headers` de Netlify: una línea de ruta y debajo, indentadas, sus cabeceras. */
function parseHeadersFile(text) {
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

/** `*` = cualquier resto de la ruta; `:param` = un solo segmento. */
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

async function resolveFile(urlPath) {
  const base = join(ROOT, normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, ''))
  for (const candidate of [base, `${base}.html`, join(base, 'index.html')]) {
    if (await isFile(candidate)) return candidate
  }
  return null
}

const headerRules = parseHeadersFile(await readFile(join(ROOT, '_headers'), 'utf8').catch(() => ''))

createServer(async (request, response) => {
  const urlPath = new URL(request.url ?? '/', 'http://localhost').pathname
  const file = await resolveFile(urlPath)
  const servedFile = file ?? join(ROOT, '404.html')
  const body = await readFile(servedFile).catch(() => 'Not found')
  response.setHeader('Content-Type', CONTENT_TYPES[extname(servedFile)] ?? 'application/octet-stream')
  for (const rule of headerRules) {
    if (rule.pattern.test(urlPath)) for (const [name, value] of rule.headers) response.setHeader(name, value)
  }
  response.writeHead(file ? 200 : 404)
  response.end(request.method === 'HEAD' ? undefined : body)
}).listen(PORT, () => console.log(`Sirviendo ${ROOT} en http://localhost:${PORT}`))
