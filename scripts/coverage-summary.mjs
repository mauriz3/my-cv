/**
 * Tabla Markdown de la cobertura (coverage/coverage-summary.json, de `npm run coverage`) para el
 * resumen del job de GitHub Actions: `node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"`.
 */
import { readFileSync } from 'node:fs'

const SUMMARY_FILE = 'coverage/coverage-summary.json'
const METRICS = { lines: 'Líneas', statements: 'Sentencias', functions: 'Funciones', branches: 'Ramas' }

const { total } = JSON.parse(readFileSync(SUMMARY_FILE, 'utf8'))
const rows = Object.entries(METRICS).map(
  ([metric, label]) => `| ${label} | ${total[metric].pct} % | ${total[metric].covered} / ${total[metric].total} |`
)
console.log(['## Cobertura de tests unitarios', '', '| Métrica | % | Cubierto |', '| --- | ---: | ---: |', ...rows].join('\n'))
