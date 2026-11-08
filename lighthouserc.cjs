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
/** Same loopback host and port as scripts/serve-static.mjs (SERVER_HOST, DEFAULT_PORT). */
const BASE_URL = 'http://127.0.0.1:4173'
/** Must match SERVER_READY_MARKER in scripts/serve-static.mjs (checked in tests/unit/serveStatic.spec.ts). */
const SERVER_READY_PATTERN = 'Serving'
const AUDITED_PATHS = ['/en/', '/es/', '/en/visits', '/en/privacy']
/**
 * The production artifact carries gtag: block every measurement domain (lib/analytics.ts, ANALYTICS_CSP_SOURCES)
 * so CI never sends real hits to Google Analytics. Blocked requests fail with `ERR_BLOCKED_BY_CLIENT.Inspector`,
 * which Lighthouse's errors-in-console audit ignores by default. Checked in tests/unit/analytics.spec.ts.
 */
const MEASUREMENT_URL_PATTERNS = ['*googletagmanager.com*', '*google-analytics.com*', '*analytics.google.com*']

const minScore = (level, score) => [level, { minScore: score, aggregationMethod: 'median-run' }]

module.exports = {
  ci: {
    collect: {
      startServerCommand: `GEO_COUNTRY=${GEO_COUNTRY} node scripts/serve-static.mjs`,
      startServerReadyPattern: SERVER_READY_PATTERN,
      url: AUDITED_PATHS.map((path) => `${BASE_URL}${path}`),
      numberOfRuns: 3,
      settings: { chromeFlags: '--headless=new --no-sandbox', blockedUrlPatterns: MEASUREMENT_URL_PATTERNS },
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
