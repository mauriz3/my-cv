import { describe, expect, it } from 'vitest'
import { coverageSummaryMarkdown } from '../../scripts/coverage-summary.mjs'

const metric = (covered: number, total: number) => ({ covered, total, pct: Math.round((covered / total) * 10_000) / 100 })

describe('scripts/coverage-summary.mjs', () => {
  it('pinta una tabla Markdown con las cuatro métricas', () => {
    const markdown = coverageSummaryMarkdown({
      lines: metric(90, 100),
      statements: metric(85, 100),
      functions: metric(8, 10),
      branches: metric(3, 4)
    })
    expect(markdown.split('\n')).toEqual([
      '## Cobertura de tests unitarios',
      '',
      '| Métrica | % | Cubierto |',
      '| --- | ---: | ---: |',
      '| Líneas | 90 % | 90 / 100 |',
      '| Sentencias | 85 % | 85 / 100 |',
      '| Funciones | 80 % | 8 / 10 |',
      '| Ramas | 75 % | 3 / 4 |'
    ])
  })
})
