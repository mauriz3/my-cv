/**
 * Markdown table from coverage (coverage/coverage-summary.json, from `npm run coverage`) for the
 * GitHub Actions job summary: `node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"`.
 */
import { readFileSync } from 'node:fs'
import { isDirectRun } from './isDirectRun.mjs'

const SUMMARY_FILE = 'coverage/coverage-summary.json'
const METRICS = { lines: 'Lines', statements: 'Statements', functions: 'Functions', branches: 'Branches' }

/** `total` from coverage-summary.json → Markdown table (one row per metric). */
export function coverageSummaryMarkdown(total) {
  const rows = Object.entries(METRICS).map(
    ([metric, label]) => `| ${label} | ${total[metric].pct} % | ${total[metric].covered} / ${total[metric].total} |`
  )
  return ['## Unit test coverage', '', '| Metric | % | Covered |', '| --- | ---: | ---: |', ...rows].join('\n')
}

if (isDirectRun(import.meta.url)) {
  console.log(coverageSummaryMarkdown(JSON.parse(readFileSync(SUMMARY_FILE, 'utf8')).total))
}
