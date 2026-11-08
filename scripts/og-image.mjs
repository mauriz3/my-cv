// Genera public/og-cv.png (1200×630), la imagen de Open Graph / Twitter de todas las páginas.
// Reproducible: colores de los tokens de marca de main.css y fuentes locales de @fontsource-variable.
// Uso (ver README): npm i --no-save playwright-core && node scripts/og-image.mjs
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { isDirectRun } from './isDirectRun.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUTPUT = join(ROOT, 'public/og-cv.png')
const WIDTH = 1200
const HEIGHT = 630
const NAME = 'Maurizio Rendon'
const HEADLINE = 'Senior Software Engineer'
const DOMAIN = 'mauriziorendon.com'

const fileUrl = (path) => pathToFileURL(join(ROOT, path)).href
const FONT_INTER = fileUrl('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
const FONT_DISPLAY = fileUrl('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2')
const AVATAR = fileUrl('public/me.webp')

/** Lee un token `--color-brand-N` de main.css: la imagen usa el azul real de la marca. */
export function brandColor(css, step) {
  const match = css.match(new RegExp(`--color-brand-${step}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match?.[1]) throw new Error(`Falta --color-brand-${step} en main.css`)
  return match[1]
}

/** Colores de la imagen a partir de main.css: fondo (700 → 900), textos suaves (100) y acento (300). */
export function brandPalette(css) {
  const [brand, brandDeep, brandSoft, brandAccent] = [700, 900, 100, 300].map((step) => brandColor(css, step))
  return { brand, brandDeep, brandSoft, brandAccent }
}

/** HTML de la imagen (1200×630): dominio, nombre, titular y avatar; sin datos de contacto. */
export function ogImageHtml({ brand, brandDeep, brandSoft, brandAccent }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url(${FONT_INTER}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'Space Grotesk'; src: url(${FONT_DISPLAY}) format('woff2'); font-weight: 300 700; }
* { margin: 0; box-sizing: border-box; }
body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; font-family: Inter, sans-serif; color: #fff;
  background: linear-gradient(135deg, ${brand} 0%, ${brand} 55%, ${brandDeep} 100%);
  display: flex; align-items: center; justify-content: space-between; padding: 0 96px; }
.text { display: flex; flex-direction: column; gap: 28px; }
.domain { font-size: 28px; font-weight: 500; color: ${brandSoft}; letter-spacing: .02em; }
h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 92px; line-height: 1; letter-spacing: -.02em; }
.rule { width: 120px; height: 8px; border-radius: 4px; background: ${brandAccent}; }
p { font-size: 46px; font-weight: 500; color: ${brandSoft}; }
img { width: 300px; height: 300px; border-radius: 50%; box-shadow: 0 0 0 10px rgba(255,255,255,.18); }
</style></head><body>
<div class="text"><span class="domain">${DOMAIN}</span><h1>${NAME}</h1><div class="rule"></div><p>${HEADLINE}</p></div>
<img src="${AVATAR}" alt="">
</body></html>`
}

async function renderOgImage() {
  const css = await readFile(join(ROOT, 'app/assets/css/main.css'), 'utf8')
  const dir = await mkdtemp(join(tmpdir(), 'og-image-'))
  const page = join(dir, 'og.html')
  await writeFile(page, ogImageHtml(brandPalette(css)))
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' })
  try {
    const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })
    await tab.goto(pathToFileURL(page).href)
    await tab.evaluate(() => document.fonts.ready)
    await tab.screenshot({ path: OUTPUT, type: 'png' })
    console.log(`Escrito ${OUTPUT}`)
  } finally {
    await browser.close()
    await rm(dir, { recursive: true, force: true })
  }
}

if (isDirectRun(import.meta.url)) await renderOgImage()
