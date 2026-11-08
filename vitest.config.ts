import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url))

/** Minimum required on all four coverage metrics (lines, statements, functions, branches). */
const COVERAGE_THRESHOLD_PERCENT = 80

export default defineConfig({
  test: {
    projects: [
      // Pure logic, data, Netlify functions, and scripts: Node, no Nuxt.
      // `~~` (root) as in Nuxt, for Nitro's `server/` path.
      { resolve: { alias: { '~~': ROOT_DIR } }, test: { name: 'unit', include: ['tests/unit/**/*.spec.ts'], environment: 'node' } },
      // `app/` composables and utils: Nuxt env (@nuxt/test-utils, happy-dom) with auto-imports and i18n.
      await defineVitestProject({ test: { name: 'nuxt', include: ['tests/nuxt/**/*.spec.ts'], environment: 'nuxt' } })
    ],
    // `npm run coverage`. Counts all owned TS/JS whether tests load it or not. `.vue`
    // files (components and pages) are not included yet: axe/Playwright cover them; unit tests land in another PR.
    coverage: {
      provider: 'v8',
      include: ['app/{composables,utils}/**/*.ts', '{lib,data,server,netlify,scripts}/**/*.{ts,mjs}'],
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: COVERAGE_THRESHOLD_PERCENT,
        statements: COVERAGE_THRESHOLD_PERCENT,
        functions: COVERAGE_THRESHOLD_PERCENT,
        branches: COVERAGE_THRESHOLD_PERCENT
      }
    }
  }
})
