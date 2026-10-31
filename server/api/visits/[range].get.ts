import { isVisitsRange } from '~~/lib/visits'
import { buildMockReport } from '~~/lib/visitsMock'
import { VisitsReportSchema } from '~~/lib/visitsSchema'

/**
 * `GET /api/visits/:range` (1d · 7d · 30d): visitas agregadas, sin IPs ni identificadores.
 *
 * Hoy devuelve datos de ejemplo y se prerrenderiza a JSON estático (`nuxt generate`).
 * Para Google Analytics se sustituye `buildMockReport` por una llamada a la Data API (runReport)
 * con la credencial en variables de entorno del servidor; el contrato (`VisitsReportSchema`) no cambia.
 */
export default defineEventHandler((event) => {
  const range = getRouterParam(event, 'range')
  if (!isVisitsRange(range)) throw createError({ statusCode: 404, statusMessage: 'Unknown range' })
  return VisitsReportSchema.parse(buildMockReport(range))
})
