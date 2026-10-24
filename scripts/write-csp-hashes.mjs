/**
 * Tras `nuxt generate`: calcula el hash SHA-256 de cada script inline del HTML generado
 * y lo añade a `script-src` en `.output/public/_headers`. Así la CSP no necesita 'unsafe-inline'.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT_DIR = '.output/public'
const HEADERS_FILE = join(OUTPUT_DIR, '_headers')
const SCRIPT_SRC_PLACEHOLDER = "script-src 'self'"
const INLINE_SCRIPT_PATTERN = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g

function* htmlFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* htmlFiles(path)
    else if (entry.name.endsWith('.html')) yield path
  }
}

const hashes = new Set()
for (const file of htmlFiles(OUTPUT_DIR)) {
  for (const [, content] of readFileSync(file, 'utf8').matchAll(INLINE_SCRIPT_PATTERN)) {
    if (content.trim() === '') continue
    hashes.add(`'sha256-${createHash('sha256').update(content).digest('base64')}'`)
  }
}

const headers = readFileSync(HEADERS_FILE, 'utf8')
if (!headers.includes(SCRIPT_SRC_PLACEHOLDER)) throw new Error(`Falta «${SCRIPT_SRC_PLACEHOLDER}» en _headers`)
writeFileSync(HEADERS_FILE, headers.replace(SCRIPT_SRC_PLACEHOLDER, `${SCRIPT_SRC_PLACEHOLDER} ${[...hashes].join(' ')}`))
console.log(`CSP: ${hashes.size} hashes de scripts inline añadidos a ${HEADERS_FILE}`)
