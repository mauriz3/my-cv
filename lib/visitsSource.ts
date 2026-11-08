import type { VisitsRange, VisitsReport } from './visits'
import { buildMockReport } from './visitsMock'
import { snapshotReport, type SnapshotStore } from './visitsSnapshot'
import { VisitsReportSchema } from './visitsSchema'

/**
 * Data sources for `/api/visits/:range`, in preference order. Today: snapshot → mock.
 * To add live data, add another `VisitsDataSource` (e.g. `live` with `fetchGa4Report`) ahead of snapshot.
 */
export type VisitsSourceName = 'live' | 'snapshot' | 'mock'

export interface VisitsDataSource {
  name: VisitsSourceName
  /** Report for the range, or `undefined` if this source does not have it. */
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

/** First valid report from the sources; if none respond (or fail), the mock. Never throws. */
export async function selectVisitsReport(range: VisitsRange, sources: readonly VisitsDataSource[]): Promise<SelectedReport> {
  for (const source of sources) {
    try {
      const parsed = VisitsReportSchema.safeParse(await source.report(range))
      if (parsed.success && parsed.data.range === range) return { report: parsed.data, source: source.name }
    } catch {
      // Source down (Blobs, file…): try the next one.
    }
  }
  return { report: VisitsReportSchema.parse(buildMockReport(range)), source: 'mock' }
}
