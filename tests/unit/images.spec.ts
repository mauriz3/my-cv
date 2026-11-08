import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cvFacts } from '../../data/cv.shared'
import { SOCIAL_IMAGE } from '../../lib/socialMeta'

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url))
const OG_IMAGE_SCRIPT = new URL('../../scripts/og-image.mjs', import.meta.url)
const RASTER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico'])

/** Raster not using WebP, with reason (see README → Images). */
const NON_WEBP_EXCEPTIONS: Record<string, string> = {
  '/og-cv.png': 'og:image / twitter:image: LinkedIn crawler does not handle WebP well',
  '/favicon.ico': 'favicon browsers request by default at /favicon.ico',
  '/webtele.jpg': 'JPEG already compressed: equivalent-quality WebP is larger',
}

/** Browsers request /favicon.ico even when no page links it. */
const IMPLICIT_IMAGES = ['/favicon.ico']

/** WebP dimensions (VP8, VP8L, or VP8X) from RIFF header. */
function webpSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Not a WebP file')
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
  throw new Error(`Unknown WebP chunk: ${chunk}`)
}

/** Public paths (`/folder/file.ext`) for all raster images under `public/`. */
function publicRasterImages(directory = PUBLIC_DIR): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return publicRasterImages(path)
    return RASTER_EXTENSIONS.has(extname(entry.name).toLowerCase()) ? [`/${relative(PUBLIC_DIR, path)}`] : []
  })
}

/** Avatar used by `scripts/og-image.mjs` for the preview image. */
function ogImageAvatar(): string {
  const match = /fileUrl\('public(\/[^']+)'\)/.exec(readFileSync(OG_IMAGE_SCRIPT, 'utf8'))
  if (!match?.[1]) throw new Error('scripts/og-image.mjs missing avatar in public/')
  return match[1]
}

const referencedImages = [
  ...cvFacts.projects.map((project) => `/${project.image}`),
  ...cvFacts.books.map((book) => book.cover.src),
  SOCIAL_IMAGE.path,
  ogImageAvatar(),
  ...IMPLICIT_IMAGES,
]

describe('public/ images', () => {
  it.each(referencedImages)('%s exists in public/', (image) => {
    expect(publicRasterImages()).toContain(image)
  })

  it('no unreferenced images', () => {
    expect(publicRasterImages().filter((image) => !referencedImages.includes(image))).toEqual([])
  })

  it('all raster is WebP except documented exceptions', () => {
    const notWebp = publicRasterImages().filter((image) => extname(image) !== '.webp')
    expect(notWebp.sort()).toEqual(Object.keys(NON_WEBP_EXCEPTIONS).sort())
  })

  it('social preview stays PNG', () => {
    expect(SOCIAL_IMAGE.path).toBe('/og-cv.png')
    expect(SOCIAL_IMAGE.type).toBe('image/png')
  })

  it.each(cvFacts.books)('cover «$id» width/height match real dimensions', ({ cover }) => {
    expect(webpSize(readFileSync(join(PUBLIC_DIR, cover.src)))).toEqual({ width: cover.width, height: cover.height })
  })
})
