import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url))

/** Mínimo exigido en las cuatro métricas de cobertura (líneas, sentencias, funciones y ramas). */
const COVERAGE_THRESHOLD_PERCENT = 80

export default defineConfig({
  test: {
    projects: [
      // Lógica pura, datos, funciones de Netlify y scripts: Node, sin Nuxt.
      // `~~` (raíz) como en Nuxt, para la ruta de Nitro de `server/`.
      { resolve: { alias: { '~~': ROOT_DIR } }, test: { name: 'unit', include: ['tests/unit/**/*.spec.ts'], environment: 'node' } },
      // Composables y utilidades de `app/`: entorno Nuxt (@nuxt/test-utils, happy-dom) con auto-imports e i18n.
      await defineVitestProject({ test: { name: 'nuxt', include: ['tests/nuxt/**/*.spec.ts'], environment: 'nuxt' } })
    ],
    // `npm run coverage`. Cuenta todo el código propio en TS/JS, lo carguen los tests o no. Los `.vue`
    // (componentes y páginas) aún no entran: los cubren axe/Playwright y tendrán sus tests en otra PR.
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
