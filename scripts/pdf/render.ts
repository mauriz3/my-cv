/**
 * Del contenido del CV al PDF final: HTML de impresión → PDF de Chromium → metadatos limpios.
 * Lo usa `generate.ts` (CLI); recibe el navegador para poder probarlo sin Chrome.
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import type { Browser } from 'playwright-core'
import { LOCALES, type Locale } from '../../data/schema'
import { buildPdfContent } from './content'
import { renderCvHtml } from './template'

const PDF_DIR = path.dirname(fileURLToPath(import.meta.url))
const STYLESHEET_URL = pathToFileURL(path.join(PDF_DIR, 'cv-print.css')).href
const PAGE_FORMAT = 'A4'
/** Páginas exactas que pide el diseño (hoja 1 y hoja 2). */
export const EXPECTED_PAGES = 2
export const PDF_KEYWORDS = ['Senior Software Engineer', 'Full stack', 'Back End', 'Front End', 'Node.js', 'React', 'Next.js', 'TypeScript', 'Vue.js', 'Chart.js', 'Cypress']

export const pdfFileName = (locale: Locale) => `Resume-Maurizio-Rendon-${locale}.pdf`

/** Solo lo que se usa del navegador (Playwright). */
export type PdfBrowser = Pick<Browser, 'newPage'>

async function renderPdf(browser: PdfBrowser, workDir: string, locale: Locale) {
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
export async function cleanMetadata(pdfBytes: Uint8Array, content: ReturnType<typeof buildPdfContent>, now = new Date()) {
  const pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false })
  pdf.setTitle(content.fullName, { showInWindowTitleBar: true })
  pdf.setAuthor(content.fullName)
  pdf.setSubject(content.subject)
  pdf.setKeywords(PDF_KEYWORDS)
  pdf.setCreator(content.documentTitle)
  pdf.setProducer(content.documentTitle)
  pdf.setLanguage(content.lang)
  pdf.setCreationDate(now)
  pdf.setModificationDate(now)
  return { bytes: await pdf.save({ useObjectStreams: false }), pageCount: pdf.getPageCount() }
}

/** Escribe el PDF de cada idioma en `outputDir`; falla si alguno no tiene las páginas del diseño. */
export async function writeCvPdfs(browser: PdfBrowser, options: { workDir: string; outputDir: string; log?: (line: string) => void }) {
  for (const locale of LOCALES) {
    const { content, pdfBytes } = await renderPdf(browser, options.workDir, locale)
    const { bytes, pageCount } = await cleanMetadata(pdfBytes, content)
    if (pageCount !== EXPECTED_PAGES) throw new Error(`${pdfFileName(locale)}: ${pageCount} páginas (el diseño pide ${EXPECTED_PAGES})`)
    await writeFile(path.join(options.outputDir, pdfFileName(locale)), bytes)
    options.log?.(`${pdfFileName(locale)}: ${pageCount} páginas`)
  }
}
