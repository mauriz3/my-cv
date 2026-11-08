import { fetchAccessToken, parseServiceAccount, type ServiceAccount } from './googleServiceAccount'
import type { VisitsRange } from './visits'
import { fetchGa4Report } from './visitsGa4'

/**
 * GA4 configuration from environment variables (server only: Netlify or local).
 * `GA_PROPERTY_ID`: numeric property ID. `GA_SERVICE_ACCOUNT_JSON`: service account key JSON.
 */
export const GA_PROPERTY_ID_ENV = 'GA_PROPERTY_ID'
export const GA_SERVICE_ACCOUNT_ENV = 'GA_SERVICE_ACCOUNT_JSON'
const PROPERTY_ID = /^\d+$/

export interface Ga4Config {
  propertyId: string
  serviceAccount: ServiceAccount
}

/** `undefined` if any variable is missing (then keep the previous snapshot or mock). Throws if malformed. */
export function readGa4Config(env: Record<string, string | undefined>): Ga4Config | undefined {
  const propertyId = env[GA_PROPERTY_ID_ENV]?.trim()
  const serviceAccountJson = env[GA_SERVICE_ACCOUNT_ENV]
  if (!propertyId || !serviceAccountJson) return undefined
  if (!PROPERTY_ID.test(propertyId)) throw new Error(`${GA_PROPERTY_ID_ENV} must be the numeric property ID`)
  return { propertyId, serviceAccount: parseServiceAccount(serviceAccountJson) }
}

/** `(range) → GA4 report` with a single OAuth token per run. */
export function createGa4ReportFetcher(config: Ga4Config, fetchFn: typeof fetch, now: Date) {
  let token: Promise<string> | undefined
  const getAccessToken = () => (token ??= fetchAccessToken(config.serviceAccount, fetchFn, now))
  return (range: VisitsRange) => fetchGa4Report(range, { propertyId: config.propertyId, getAccessToken, fetch: fetchFn, now })
}
