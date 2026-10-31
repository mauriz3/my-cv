/**
 * Google Analytics (gtag.js) con Consent Mode v2: todo «denied» por defecto y `analytics_storage`
 * solo pasa a «granted» si la persona acepta el aviso. Lógica pura para poder probarla en Vitest.
 */

/** ID de medición de GA4 (público). Solo se carga en el build de producción. */
export const ANALYTICS_MEASUREMENT_ID = 'G-9HF9362QE9'
export const GTAG_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_MEASUREMENT_ID}`

/** Orígenes que la CSP debe permitir (script-src, connect-src e img-src) cuando hay analytics. */
export const ANALYTICS_CSP_SOURCES = [
  'https://*.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
] as const

export const CONSENT_STORAGE_KEY = 'analytics-consent'
export type ConsentChoice = 'granted' | 'denied'

const CONSENT_CHOICES: readonly string[] = ['granted', 'denied']

export type ConsentStorage = Pick<Storage, 'getItem' | 'setItem'>
export type Gtag = (command: 'consent', action: 'update', params: Record<string, string>) => void

/** Elección guardada, o `null` si aún no hay (entonces se muestra el aviso). */
export function readConsent(storage: Pick<Storage, 'getItem'>): ConsentChoice | null {
  try {
    const stored = storage.getItem(CONSENT_STORAGE_KEY)
    return stored !== null && CONSENT_CHOICES.includes(stored) ? (stored as ConsentChoice) : null
  } catch {
    return null
  }
}

/**
 * Guarda la elección y actualiza `analytics_storage` con ella. Así también se puede cambiar después
 * (pie «Preferencias de analítica»): de «granted» a «denied» y al revés.
 */
export function applyConsent(choice: ConsentChoice, storage: ConsentStorage, gtag: Gtag | undefined): void {
  try {
    storage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Sin almacenamiento, la elección vale solo para esta visita.
  }
  updateConsent(choice, gtag)
}

/** Actualiza `analytics_storage` sin guardar nada (fuera de la zona con aviso se concede en cada visita). */
export function updateConsent(choice: ConsentChoice, gtag: Gtag | undefined): void {
  gtag?.('consent', 'update', { analytics_storage: choice })
}

/**
 * Cuánto espera gtag a un `consent update` antes de enviar la primera visita: lo justo para que,
 * fuera de la zona con aviso, la respuesta de `/geo` conceda el consentimiento a tiempo.
 */
export const CONSENT_WAIT_FOR_UPDATE_MS = 500

/**
 * Script inline (antes de gtag.js): consentimiento «denied» por defecto, restaura un «granted»
 * guardado y configura GA sin señales de anuncios. Su hash entra en la CSP con `scripts/build-headers.mjs`.
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
