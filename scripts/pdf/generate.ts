/**
 * Genera public/Resume-Maurizio-Rendon-{en,es}.pdf desde `data/cv.*.ts` (HTML de impresión + Chromium).
 * Uso: `npm run pdf` (ver scripts/pdf/README.md). Necesita Google Chrome o `CHROME_PATH`.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { writeCvPdfs } from './render'

const OUTPUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public')
const CHROME_EXECUTABLE = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'

const workDir = await mkdtemp(path.join(tmpdir(), 'cv-pdf-'))
const browser = await chromium.launch({ executablePath: CHROME_EXECUTABLE })
try {
  await writeCvPdfs(browser, { workDir, outputDir: OUTPUT_DIR, log: console.log })
} finally {
  await browser.close()
  await rm(workDir, { recursive: true, force: true })
}
