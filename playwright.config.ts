import { defineConfig } from '@playwright/test'

/** Accessibility audit (axe) on the generated site (`npm run generate`), served locally. */
const PORT = 4173
/** Loopback only, as scripts/serve-static.mjs listens (SERVER_HOST). */
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: 'tests/a11y',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    // System Google Chrome (on GitHub runners): no browser download.
    channel: 'chrome',
    // Final animation state: axe measures contrast of what stays on screen, not an intermediate frame.
    reducedMotion: 'reduce'
  },
  webServer: {
    command: `node scripts/serve-static.mjs`,
    url: `${BASE_URL}/en/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI
  }
})
