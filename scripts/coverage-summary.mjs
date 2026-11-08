/**
 * Tabla Markdown de la cobertura (coverage/coverage-summary.json, de `npm run coverage`) para el
 * resumen del job de GitHub Actions: `node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"`.
 */
import { readFileSync } from 'node:fs'
import { isDirectRun } from './isDirectRun.mjs'

const SUMMARY_FILE = 'coverage/coverage-summary.json'
const METRICS = { lines: 'Líneas', statements: 'Sentencias', functions: 'Funciones', branches: 'Ramas' }

/** `total` de coverage-summary.json → tabla Markdown (una fila por métrica). */
export function coverageSummaryMarkdown(total) {
  const rows = Object.entries(METRICS).map(
    ([metric, label]) => `| ${label} | ${total[metric].pct} % | ${total[metric].covered} / ${total[metric].total} |`
  )
  return ['## Cobertura de tests unitarios', '', '| Métrica | % | Cubierto |', '| --- | ---: | ---: |', ...rows].join('\n')
}

if (isDirectRun(import.meta.url)) {
  console.log(coverageSummaryMarkdown(JSON.parse(readFileSync(SUMMARY_FILE, 'utf8')).total))
}
