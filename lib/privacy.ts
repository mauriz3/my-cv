/**
 * Datos de la página de privacidad (/privacy) que salen del código y no de un texto suelto:
 * así, si cambia el ID de GA o la retención, cambia también lo que se cuenta.
 */
import { ANALYTICS_MEASUREMENT_ID } from './analytics'

export const PRIVACY_PATH = '/privacy'
/** Vida máxima de las cookies de GA4 (`_ga`, `_ga_<ID>`), según Google. */
export const GA_COOKIE_MAX_AGE_MONTHS = 24
/**
 * Retención de datos de GA4 a nivel de usuario/evento. Debe coincidir con la interfaz de GA
 * (Admin → Recogida de datos → Retención de datos): 14 meses.
 */
export const GA_DATA_RETENTION_MONTHS = 14

/** Nombres de las cookies que crea GA4 al aceptar: `_ga` y `_ga_` + el ID sin el prefijo «G-». */
export function analyticsCookieNames(measurementId: string = ANALYTICS_MEASUREMENT_ID): [string, string] {
  return ['_ga', `_ga_${measurementId.replace(/^G-/, '')}`]
}
