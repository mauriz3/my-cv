import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import { LOCALES } from '../../data/schema'
import { buildPdfContent } from '../../scripts/pdf/content'
import { EXPECTED_PAGES, PDF_KEYWORDS, cleanMetadata, pdfFileName, writeCvPdfs, type PdfBrowser } from '../../scripts/pdf/render'

async function pdfWithPages(pageCount: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setProducer('Skia/PDF m156')
  pdf.setCreator('Chromium /home/user/project')
  for (let index = 0; index < pageCount; index++) pdf.addPage()
  return pdf.save()
}

/** Fake browser: returns a PDF with requested page count and records what was printed. */
function fakeBrowser(pageCount: number) {
  const printed: { url: string; options: unknown }[] = []
  const browser = {
    newPage: async () => {
      let url = ''
      return {
        goto: async (target: string) => void (url = target),
        evaluate: async () => undefined,
        pdf: async (options: unknown) => {
          printed.push({ url, options })
          return Buffer.from(await pdfWithPages(pageCount))
        },
        close: async () => undefined
      }
    }
  } as unknown as PdfBrowser
  return { browser, printed }
}

describe('scripts/pdf/render.ts', () => {
  it('names each PDF by locale', () => {
    expect(pdfFileName('es')).toBe('Resume-Maurizio-Rendon-es.pdf')
  })

  it('leaves clean CV metadata, without paths or team tooling', async () => {
    const content = buildPdfContent('en')
    const now = new Date('2026-11-07T12:00:00Z')
    const { bytes, pageCount } = await cleanMetadata(await pdfWithPages(EXPECTED_PAGES), content, now)
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false })
    expect(pageCount).toBe(EXPECTED_PAGES)
    expect(pdf.getTitle()).toBe(content.fullName)
    expect(pdf.getAuthor()).toBe(content.fullName)
    expect(pdf.getSubject()).toBe(content.subject)
    expect(pdf.getKeywords()).toBe(PDF_KEYWORDS.join(' '))
    expect(pdf.getCreator()).toBe(content.documentTitle)
    expect(pdf.getProducer()).toBe(content.documentTitle)
    expect(pdf.getCreationDate()).toEqual(now)
  })

  it('prints each locale HTML on A4 and writes one PDF per locale', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'cv-pdf-work-'))
    const outputDir = mkdtempSync(join(tmpdir(), 'cv-pdf-out-'))
    const { browser, printed } = fakeBrowser(EXPECTED_PAGES)
    const log = vi.fn()
    await writeCvPdfs(browser, { workDir, outputDir, log })

    expect(readdirSync(outputDir).sort()).toEqual(LOCALES.map(pdfFileName).sort())
    expect(printed.map(({ url }) => url.split('/').pop())).toEqual(LOCALES.map((locale) => `cv-${locale}.html`))
    expect(printed[0]!.options).toMatchObject({ format: 'A4', tagged: true })
    expect(readFileSync(join(workDir, 'cv-en.html'), 'utf8')).toContain(buildPdfContent('en').fullName)
    expect(log).toHaveBeenCalledWith(`${pdfFileName('en')}: ${EXPECTED_PAGES} pages`)
  })

  it('fails if PDF does not have design page count', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'cv-pdf-out-'))
    const { browser } = fakeBrowser(EXPECTED_PAGES + 1)
    await expect(writeCvPdfs(browser, { workDir: tmpdir(), outputDir })).rejects.toThrow(`3 pages (design requires ${EXPECTED_PAGES})`)
    expect(readdirSync(outputDir)).toEqual([])
  })
})
