import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node',
    // `npm run coverage`. Cuenta todo el código propio en TS/JS, lo carguen los tests o no.
    // Los `.vue` no entran: los tests unitarios no montan componentes y v8 no sabe leer un SFC sin el plugin de Vue.
    coverage: {
      provider: 'v8',
      include: ['{app,lib,data,server,netlify,scripts}/**/*.{ts,mjs}'],
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: 'coverage'
    }
  }
})
