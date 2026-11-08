import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cvFacts } from '../../data/cv.shared'
import { SOCIAL_IMAGE } from '../../lib/socialMeta'

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url))
const OG_IMAGE_SCRIPT = new URL('../../scripts/og-image.mjs', import.meta.url)
const RASTER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico'])

/** Ráster que no van en WebP, con su motivo (ver README → Imágenes). */
const NON_WEBP_EXCEPTIONS: Record<string, string> = {
  '/og-cv.png': 'og:image / twitter:image: el rastreador de LinkedIn no admite bien WebP',
  '/favicon.ico': 'favicon que los navegadores piden por defecto en /favicon.ico',
  '/webtele.jpg': 'JPEG ya comprimido: su WebP con calidad equivalente pesa más',
}

/** El navegador pide /favicon.ico aunque ninguna página lo enlace. */
const IMPLICIT_IMAGES = ['/favicon.ico']

/** Medidas de un WebP (VP8, VP8L o VP8X) leyendo su cabecera RIFF. */
function webpSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('No es un WebP')
  }
  const chunk = bytes.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 }
  }
  throw new Error(`Bloque WebP desconocido: ${chunk}`)
}

/** Rutas públicas (`/carpeta/fichero.ext`) de todas las imágenes ráster de `public/`. */
function publicRasterImages(directory = PUBLIC_DIR): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return publicRasterImages(path)
    return RASTER_EXTENSIONS.has(extname(entry.name).toLowerCase()) ? [`/${relative(PUBLIC_DIR, path)}`] : []
  })
}

/** Avatar que usa `scripts/og-image.mjs` para generar la imagen de vista previa. */
function ogImageAvatar(): string {
  const match = /fileUrl\('public(\/[^']+)'\)/.exec(readFileSync(OG_IMAGE_SCRIPT, 'utf8'))
  if (!match?.[1]) throw new Error('scripts/og-image.mjs sin avatar en public/')
  return match[1]
}

const referencedImages = [
  ...cvFacts.projects.map((project) => `/${project.image}`),
  ...cvFacts.books.map((book) => book.cover.src),
  SOCIAL_IMAGE.path,
  ogImageAvatar(),
  ...IMPLICIT_IMAGES,
]

describe('imágenes de public/', () => {
  it.each(referencedImages)('%s existe en public/', (image) => {
    expect(publicRasterImages()).toContain(image)
  })

  it('no hay imágenes sin usar', () => {
    expect(publicRasterImages().filter((image) => !referencedImages.includes(image))).toEqual([])
  })

  it('todo ráster es WebP salvo las excepciones documentadas', () => {
    const notWebp = publicRasterImages().filter((image) => extname(image) !== '.webp')
    expect(notWebp.sort()).toEqual(Object.keys(NON_WEBP_EXCEPTIONS).sort())
  })

  it('la vista previa social sigue en PNG', () => {
    expect(SOCIAL_IMAGE.path).toBe('/og-cv.png')
    expect(SOCIAL_IMAGE.type).toBe('image/png')
  })

  it.each(cvFacts.books)('la portada de «$id» tiene en width/height sus medidas reales', ({ cover }) => {
    expect(webpSize(readFileSync(join(PUBLIC_DIR, cover.src)))).toEqual({ width: cover.width, height: cover.height })
  })
})
