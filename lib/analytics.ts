/**
 * Google Analytics (gtag.js) with Consent Mode v2: all «denied» by default and `analytics_storage`
 * moves to «granted» only if the user accepts the notice. Pure logic for Vitest.
 */

/** GA4 measurement ID (public). Loaded only on production builds. */
export const ANALYTICS_MEASUREMENT_ID = 'G-9HF9362QE9'
export const GTAG_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_MEASUREMENT_ID}`

/** Measurement origins (hit delivery): connect-src and img-src. */
const ANALYTICS_COLLECT_SOURCES = [
  'https://*.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
] as const

/**
 * Origins CSP adds to each directive when analytics is enabled. `script-src` only allows the exact
 * gtag.js host (the only external script); wildcards are for measurement requests.
 */
export const ANALYTICS_CSP_SOURCES = {
  'script-src': [new URL(GTAG_SCRIPT_URL).origin],
  'connect-src': ANALYTICS_COLLECT_SOURCES,
  'img-src': ANALYTICS_COLLECT_SOURCES,
} as const satisfies Record<string, readonly string[]>

export const CONSENT_STORAGE_KEY = 'analytics-consent'
export type ConsentChoice = 'granted' | 'denied'

const CONSENT_CHOICES: readonly string[] = ['granted', 'denied']

export type ConsentStorage = Pick<Storage, 'getItem' | 'setItem'>
export type Gtag = (command: 'consent', action: 'update', params: Record<string, string>) => void

/** Stored choice, or `null` if none yet (then show the notice). */
export function readConsent(storage: Pick<Storage, 'getItem'>): ConsentChoice | null {
  try {
    const stored = storage.getItem(CONSENT_STORAGE_KEY)
    return stored !== null && CONSENT_CHOICES.includes(stored) ? (stored as ConsentChoice) : null
  } catch {
    return null
  }
}

/**
 * Saves the choice and updates `analytics_storage`. Also supports later changes
 * (footer «Analytics preferences»): from «granted» to «denied» and back.
 */
export function applyConsent(choice: ConsentChoice, storage: ConsentStorage, gtag: Gtag | undefined): void {
  try {
    storage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Without storage the choice applies only for this visit.
  }
  updateConsent(choice, gtag)
}

/** Updates `analytics_storage` without persisting (outside notice zone, granted each visit). */
export function updateConsent(choice: ConsentChoice, gtag: Gtag | undefined): void {
  gtag?.('consent', 'update', { analytics_storage: choice })
}

/**
 * How long gtag waits for a `consent update` before the first page_view: just enough for
 * `/geo` to grant consent in time outside the notice zone.
 */
export const CONSENT_WAIT_FOR_UPDATE_MS = 500

/**
 * Inline script (before gtag.js): default consent «denied», restores stored «granted»,
 * and configures GA without ads signals. Hash is in CSP via `scripts/build-headers.mjs`.
 */
export function buildAnalyticsInlineScript(measurementId: string): string {
  return (
    'window.dataLayer=window.dataLayer||[];' +
    'function gtag(){dataLayer.push(arguments)}window.gtag=gtag;' +
    `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:${CONSENT_WAIT_FOR_UPDATE_MS}});` +
    `try{if(localStorage.getItem('${CONSENT_STORAGE_KEY}')==='granted')gtag('consent','update',{analytics_storage:'granted'})}catch(e){}` +
    "gtag('js',new Date());" +
    `gtag('config','${measurementId}',{allow_google_signals:false,allow_ad_personalization_signals:false});`
  )
}
