/**
 * Tras `nuxt generate`, completa `.output/public/_headers`:
 *  1. Añade a `script-src` el hash SHA-256 de cada script inline del HTML generado,
 *     así la CSP no necesita 'unsafe-inline'.
 *  2. Añade `X-Robots-Tag: noindex` en todo despliegue que no sea producción
 *     (Netlify expone CONTEXT = production | branch-deploy | deploy-preview).
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT_DIR = '.output/public'
const HEADERS_FILE = join(OUTPUT_DIR, '_headers')
const SCRIPT_SRC_PLACEHOLDER = "script-src 'self'"
const PRODUCTION_CONTEXT = 'production'
const NOINDEX_HEADER = '  X-Robots-Tag: noindex, nofollow'
const ALL_PATHS_RULE = '/*\n'
const EXECUTABLE_INLINE_SCRIPT = /<script(?![^>]*\ssrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g

function* htmlFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* htmlFiles(path)
    else if (entry.name.endsWith('.html')) yield path
  }
}

function collectInlineScriptHashes() {
  const hashes = new Set()
  for (const file of htmlFiles(OUTPUT_DIR)) {
    for (const [, content] of readFileSync(file, 'utf8').matchAll(EXECUTABLE_INLINE_SCRIPT)) {
      if (content.trim() === '') continue
      hashes.add(`'sha256-${createHash('sha256').update(content).digest('base64')}'`)
    }
  }
  return [...hashes]
}

function withScriptHashes(headers, hashes) {
  if (!headers.includes(SCRIPT_SRC_PLACEHOLDER)) throw new Error(`Falta «${SCRIPT_SRC_PLACEHOLDER}» en _headers`)
  return headers.replace(SCRIPT_SRC_PLACEHOLDER, `${SCRIPT_SRC_PLACEHOLDER} ${hashes.join(' ')}`)
}

function withNoindex(headers) {
  if (!headers.startsWith(ALL_PATHS_RULE)) throw new Error('_headers debe empezar por la regla «/*»')
  return headers.replace(ALL_PATHS_RULE, `${ALL_PATHS_RULE}${NOINDEX_HEADER}\n`)
}

const hashes = collectInlineScriptHashes()
let headers = withScriptHashes(readFileSync(HEADERS_FILE, 'utf8'), hashes)
const isProduction = process.env.CONTEXT === PRODUCTION_CONTEXT
if (!isProduction) headers = withNoindex(headers)

writeFileSync(HEADERS_FILE, headers)
console.log(`Cabeceras: ${hashes.length} hashes CSP; noindex ${isProduction ? 'NO' : 'sí'} (CONTEXT=${process.env.CONTEXT ?? 'sin definir'})`)
