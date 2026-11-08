import { describe, expect, it } from 'vitest'
import { coverageSummaryMarkdown } from '../../scripts/coverage-summary.mjs'

const metric = (covered: number, total: number) => ({ covered, total, pct: Math.round((covered / total) * 10_000) / 100 })

describe('scripts/coverage-summary.mjs', () => {
  it('renders a Markdown table with the four metrics', () => {
    const markdown = coverageSummaryMarkdown({
      lines: metric(90, 100),
      statements: metric(85, 100),
      functions: metric(8, 10),
      branches: metric(3, 4)
    })
    expect(markdown.split('\n')).toEqual([
      '## Unit test coverage',
      '',
      '| Metric | % | Covered |',
      '| --- | ---: | ---: |',
      '| Lines | 90 % | 90 / 100 |',
      '| Statements | 85 % | 85 / 100 |',
      '| Functions | 80 % | 8 / 10 |',
      '| Branches | 75 % | 3 / 4 |'
    ])
  })
})
