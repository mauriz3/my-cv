import { z } from './zod'
import { VISITS_RANGES, type VisitsRange, type VisitsReport } from './visits'
import { VisitsReportSchema } from './visitsSchema'

/**
 * Visits snapshot: all three range reports stored together (Netlify Blobs in production,
 * a file locally). The store is an interface so logic can be tested with an in-memory one.
 */

export const VISITS_SNAPSHOT_VERSION = 1
/** Store and key in Netlify Blobs (site store: survives deploys). */
export const VISITS_BLOB_STORE = 'visits'
export const VISITS_SNAPSHOT_KEY = 'snapshot'

export interface VisitsSnapshot {
  version: typeof VISITS_SNAPSHOT_VERSION
  updatedAt: string
  reports: Partial<Record<VisitsRange, VisitsReport>>
}

export interface SnapshotStore {
  /** Stored content as-is (unvalidated) or `undefined` if missing. */
  read(): Promise<unknown>
  write(snapshot: VisitsSnapshot): Promise<void>
}

/** Envelope: each report is validated separately so one broken report does not invalidate the rest. */
const SnapshotEnvelopeSchema = z.object({
  version: z.literal(VISITS_SNAPSHOT_VERSION),
  updatedAt: z.iso.datetime(),
  reports: z.record(z.string(), z.unknown()),
})

/** Valid report for a range in storage, or `undefined` (missing, wrong version, or contract mismatch). */
export function snapshotReport(raw: unknown, range: VisitsRange): VisitsReport | undefined {
  const envelope = SnapshotEnvelopeSchema.safeParse(raw)
  if (!envelope.success) return undefined
  const report = VisitsReportSchema.safeParse(envelope.data.reports[range])
  return report.success && report.data.range === range ? report.data : undefined
}

/** All valid reports from storage. */
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
 * Fetches all three ranges and saves the snapshot. A range that fails (or breaks the contract)
 * keeps its previous report; if none refresh, nothing is written.
 */
export async function refreshSnapshot(
  store: SnapshotStore,
  fetchReport: (range: VisitsRange) => Promise<VisitsReport>,
  now: Date,
): Promise<RefreshResult> {
  type Outcome = { range: VisitsRange; report: VisitsReport } | { range: VisitsRange; error: string }
  // One range after another: each fires 7 parallel runReport calls and GA4 allows 10 concurrent requests per property.
  const results: Outcome[] = []
  for (const range of VISITS_RANGES) {
    try {
      results.push({ range, report: VisitsReportSchema.parse(await fetchReport(range)) })
    } catch (error) {
      results.push({ range, error: error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error' })
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
