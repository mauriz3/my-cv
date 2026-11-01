import type { VisitsRange, VisitsReport } from './visits'
import { buildMockReport } from './visitsMock'
import { snapshotReport, type SnapshotStore } from './visitsSnapshot'
import { VisitsReportSchema } from './visitsSchema'

/**
 * Fuentes de datos de `/api/visits/:range`, en orden de preferencia. Hoy: instantánea → mock.
 * Para añadir datos en vivo basta otra `VisitsDataSource` (p. ej. `live` con `fetchGa4Report`) delante.
 */
export type VisitsSourceName = 'live' | 'snapshot' | 'mock'

export interface VisitsDataSource {
  name: VisitsSourceName
  /** Informe del rango, o `undefined` si esta fuente no lo tiene. */
  report(range: VisitsRange): Promise<VisitsReport | undefined>
}

export function snapshotSource(store: SnapshotStore): VisitsDataSource {
  return { name: 'snapshot', report: async (range) => snapshotReport(await store.read(), range) }
}

export const mockSource: VisitsDataSource = { name: 'mock', report: async (range) => buildMockReport(range) }

export interface SelectedReport {
  report: VisitsReport
  source: VisitsSourceName
}

/** Primer informe válido de las fuentes; si ninguna responde (o falla), el mock. Nunca lanza. */
export async function selectVisitsReport(range: VisitsRange, sources: readonly VisitsDataSource[]): Promise<SelectedReport> {
  for (const source of sources) {
    try {
      const parsed = VisitsReportSchema.safeParse(await source.report(range))
      if (parsed.success && parsed.data.range === range) return { report: parsed.data, source: source.name }
    } catch {
      // Fuente caída (Blobs, fichero…): se prueba la siguiente.
    }
  }
  return { report: VisitsReportSchema.parse(buildMockReport(range)), source: 'mock' }
}
