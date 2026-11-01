import { z } from 'zod'
import { VISITS_RANGES, type VisitsRange, type VisitsReport } from './visits'
import { VisitsReportSchema } from './visitsSchema'

/**
 * Instantánea de visitas: los informes de los 3 rangos guardados juntos (Netlify Blobs en producción,
 * un fichero en local). El almacén es una interfaz, así la lógica se prueba con uno en memoria.
 */

export const VISITS_SNAPSHOT_VERSION = 1
/** Store y clave en Netlify Blobs (store de sitio: sobrevive a los despliegues). */
export const VISITS_BLOB_STORE = 'visits'
export const VISITS_SNAPSHOT_KEY = 'snapshot'

export interface VisitsSnapshot {
  version: typeof VISITS_SNAPSHOT_VERSION
  updatedAt: string
  reports: Partial<Record<VisitsRange, VisitsReport>>
}

export interface SnapshotStore {
  /** Contenido guardado tal cual (sin validar) o `undefined` si no hay. */
  read(): Promise<unknown>
  write(snapshot: VisitsSnapshot): Promise<void>
}

/** Envoltorio: cada informe se valida por separado, así uno roto no invalida los demás. */
const SnapshotEnvelopeSchema = z.object({
  version: z.literal(VISITS_SNAPSHOT_VERSION),
  updatedAt: z.iso.datetime(),
  reports: z.record(z.string(), z.unknown()),
})

/** Informe válido de un rango dentro de lo guardado, o `undefined` (no hay, versión distinta o no cumple el contrato). */
export function snapshotReport(raw: unknown, range: VisitsRange): VisitsReport | undefined {
  const envelope = SnapshotEnvelopeSchema.safeParse(raw)
  if (!envelope.success) return undefined
  const report = VisitsReportSchema.safeParse(envelope.data.reports[range])
  return report.success && report.data.range === range ? report.data : undefined
}

/** Todos los informes válidos de lo guardado. */
export function validSnapshotReports(raw: unknown): VisitsSnapshot['reports'] {
  return Object.fromEntries(
    VISITS_RANGES.flatMap((range) => {
      const report = snapshotReport(raw, range)
      return report ? [[range, report]] : []
    }),
  )
}

export interface RefreshResult {
  updated: VisitsRange[]
  failed: { range: VisitsRange; error: string }[]
  written: boolean
}

/**
 * Pide los 3 rangos y guarda la instantánea. Un rango que falla (o no cumple el contrato)
 * conserva su informe anterior; si no se renueva ninguno, no se escribe nada.
 */
export async function refreshSnapshot(
  store: SnapshotStore,
  fetchReport: (range: VisitsRange) => Promise<VisitsReport>,
  now: Date,
): Promise<RefreshResult> {
  type Outcome = { range: VisitsRange; report: VisitsReport } | { range: VisitsRange; error: string }
  // Un rango tras otro: cada uno lanza 7 runReport en paralelo y GA4 admite 10 peticiones simultáneas por propiedad.
  const results: Outcome[] = []
  for (const range of VISITS_RANGES) {
    try {
      results.push({ range, report: VisitsReportSchema.parse(await fetchReport(range)) })
    } catch (error) {
      results.push({ range, error: error instanceof Error ? `${error.name}: ${error.message}` : 'Error desconocido' })
    }
  }
  const fresh = results.filter((result) => 'report' in result)
  const failed = results.filter((result) => 'error' in result)
  if (fresh.length === 0) return { updated: [], failed, written: false }

  const previous = validSnapshotReports(await store.read().catch(() => undefined))
  const reports = { ...previous, ...Object.fromEntries(fresh.map(({ range, report }) => [range, report])) }
  await store.write({ version: VISITS_SNAPSHOT_VERSION, updatedAt: now.toISOString(), reports })
  return { updated: fresh.map(({ range }) => range), failed, written: true }
}
