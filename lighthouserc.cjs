/**
 * Lighthouse CI (@lhci/cli). Two profiles on the same site, driven by the country `/geo` returns
 * (scripts/serve-static.mjs runs the real Edge Function with that country):
 * - Default: visit from outside the consent zone with notice (US): all thresholds fail the build. Most traffic
 *   and the only profile on builds without Google Analytics (PRs).
 * - `LHCI_CONSENT=1` (`npm run lighthouse:consent`), first visit from EU/EEA (ES) with the analytics notice:
 *   accessibility, best practices, and SEO fail the build; performance warns only because LCP becomes the
 *   notice rendered after hydrate and `/geo` (see docs/quality.md, ADR-015).
 */
const withConsentBanner = process.env.LHCI_CONSENT === '1'
const GEO_COUNTRY = withConsentBanner ? 'ES' : 'US'
const PERFORMANCE_LEVEL = withConsentBanner ? 'warn' : 'error'

const minScore = (level, score) => [level, { minScore: score, aggregationMethod: 'median-run' }]

module.exports = {
  ci: {
    collect: {
      startServerCommand: `GEO_COUNTRY=${GEO_COUNTRY} node scripts/serve-static.mjs`,
      startServerReadyPattern: 'Sirviendo',
      url: [
        'http://localhost:4173/en/',
        'http://localhost:4173/es/',
        'http://localhost:4173/en/visits',
        'http://localhost:4173/en/privacy',
      ],
      numberOfRuns: 3,
      settings: { chromeFlags: '--headless=new --no-sandbox' },
    },
    assert: {
      assertions: {
        'categories:performance': minScore(PERFORMANCE_LEVEL, 0.85),
        'categories:accessibility': minScore('error', 0.95),
        'categories:best-practices': minScore('error', 0.9),
        'categories:seo': minScore('error', 0.95),
      },
    },
    upload: { target: 'filesystem', outputDir: withConsentBanner ? 'lighthouse-report-consent' : 'lighthouse-report' },
  },
}
