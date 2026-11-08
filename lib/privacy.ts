/**
 * Privacy page (/privacy) data from code, not loose copy:
 * if the GA ID or retention changes, what we state changes too.
 */
import { ANALYTICS_MEASUREMENT_ID } from './analytics'

export const PRIVACY_PATH = '/privacy'
/** Maximum lifetime of GA4 cookies (`_ga`, `_ga_<ID>`), per Google. */
export const GA_COOKIE_MAX_AGE_MONTHS = 24
/**
 * GA4 user/event data retention. Must match the GA UI
 * (Admin → Data collection → Data retention): 14 months.
 */
export const GA_DATA_RETENTION_MONTHS = 14

/** Cookie names GA4 sets on accept: `_ga` and `_ga_` + ID without the «G-» prefix. */
export function analyticsCookieNames(measurementId: string = ANALYTICS_MEASUREMENT_ID): [string, string] {
  return ['_ga', `_ga_${measurementId.replace(/^G-/, '')}`]
}
