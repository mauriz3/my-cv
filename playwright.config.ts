import { defineConfig } from '@playwright/test'

/** Auditoría de accesibilidad (axe) sobre el sitio ya generado (`npm run generate`), servido en local. */
const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'tests/a11y',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    // Google Chrome del sistema (viene en los runners de GitHub): sin descargar navegadores.
    channel: 'chrome',
    // Estado final de las animaciones: axe mide el contraste de lo que queda en pantalla, no de un fotograma intermedio.
    reducedMotion: 'reduce'
  },
  webServer: {
    command: `node scripts/serve-static.mjs`,
    url: `${BASE_URL}/en/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI
  }
})
