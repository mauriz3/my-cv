/**
 * Lighthouse CI (@lhci/cli). Dos perfiles sobre el mismo sitio, según el país que responde `/geo`
 * (scripts/serve-static.mjs ejecuta la Edge Function real con ese país):
 * - Por defecto, visita de fuera de la zona con aviso (US): todos los umbrales bloquean. Es lo que ve la mayoría
 *   de visitas y lo único que existe en builds sin Google Analytics (PRs).
 * - `LHCI_CONSENT=1` (`npm run lighthouse:consent`), primera visita desde la UE/EEE (ES) con el aviso de analítica:
 *   accesibilidad, buenas prácticas y SEO bloquean; rendimiento avisa sin bloquear porque el LCP pasa a ser el
 *   aviso, que se pinta tras hidratar y consultar `/geo` (decisión en docs/calidad.md).
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
