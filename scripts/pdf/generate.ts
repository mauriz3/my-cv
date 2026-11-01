/**
 * Genera public/Resume-Maurizio-Rendon-{en,es}.pdf desde `data/cv.*.ts` (HTML de impresión + Chromium).
 * Uso: `npm run pdf` (ver scripts/pdf/README.md). Necesita Google Chrome o `CHROME_PATH`.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { chromium, type Browser } from 'playwright-core'
import { LOCALES, type Locale } from '../../data/schema'
import { buildPdfContent } from './content'
import { renderCvHtml } from './template'

const PDF_DIR = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(PDF_DIR, '../../public')
const STYLESHEET_URL = pathToFileURL(path.join(PDF_DIR, 'cv-print.css')).href
const CHROME_EXECUTABLE = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const PAGE_FORMAT = 'A4'
/** Páginas exactas que pide el diseño (hoja 1 y hoja 2). */
const EXPECTED_PAGES = 2
const KEYWORDS = ['Senior Software Engineer', 'Full stack', 'Back End', 'Front End', 'Node.js', 'React', 'Next.js', 'TypeScript', 'Vue.js', 'Chart.js', 'Cypress']

export const pdfFileName = (locale: Locale) => `Resume-Maurizio-Rendon-${locale}.pdf`

async function renderPdf(browser: Browser, workDir: string, locale: Locale) {
  const content = buildPdfContent(locale)
  const htmlPath = path.join(workDir, `cv-${locale}.html`)
  await writeFile(htmlPath, renderCvHtml(content, STYLESHEET_URL), 'utf8')

  const page = await browser.newPage()
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const pdfBytes = await page.pdf({ format: PAGE_FORMAT, printBackground: true, preferCSSPageSize: true, tagged: true, outline: true })
  await page.close()
  return { content, pdfBytes }
}

/** Metadatos limpios: sin rutas ni nombres de herramientas del equipo que lo genera. */
async function cleanMetadata(pdfBytes: Uint8Array, content: ReturnType<typeof buildPdfContent>) {
  const pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false })
  pdf.setTitle(content.fullName, { showInWindowTitleBar: true })
  pdf.setAuthor(content.fullName)
  pdf.setSubject(content.subject)
  pdf.setKeywords(KEYWORDS)
  pdf.setCreator(content.documentTitle)
  pdf.setProducer(content.documentTitle)
  pdf.setLanguage(content.lang)
  const now = new Date()
  pdf.setCreationDate(now)
  pdf.setModificationDate(now)
  return { bytes: await pdf.save({ useObjectStreams: false }), pageCount: pdf.getPageCount() }
}

const workDir = await mkdtemp(path.join(tmpdir(), 'cv-pdf-'))
const browser = await chromium.launch({ executablePath: CHROME_EXECUTABLE })
try {
  for (const locale of LOCALES) {
    const { content, pdfBytes } = await renderPdf(browser, workDir, locale)
    const { bytes, pageCount } = await cleanMetadata(pdfBytes, content)
    if (pageCount !== EXPECTED_PAGES) throw new Error(`${pdfFileName(locale)}: ${pageCount} páginas (el diseño pide ${EXPECTED_PAGES})`)
    await writeFile(path.join(OUTPUT_DIR, pdfFileName(locale)), bytes)
    console.log(`${pdfFileName(locale)}: ${pageCount} páginas`)
  }
} finally {
  await browser.close()
  await rm(workDir, { recursive: true, force: true })
}
