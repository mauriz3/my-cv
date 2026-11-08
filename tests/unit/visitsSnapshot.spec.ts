import { describe, expect, it } from 'vitest'
import type { VisitsRange, VisitsReport } from '../../lib/visits'
import { buildMockReport } from '../../lib/visitsMock'
import {
  VISITS_SNAPSHOT_VERSION,
  refreshSnapshot,
  snapshotReport,
  validSnapshotReports,
  type SnapshotStore,
  type VisitsSnapshot,
} from '../../lib/visitsSnapshot'
import { mockSource, selectVisitsReport, snapshotSource, type VisitsDataSource } from '../../lib/visitsSource'
import { NOW } from './fixtures/ga4'

/** «Real» test report: mock marked as not sample. */
const realReport = (range: VisitsRange): VisitsReport => ({ ...buildMockReport(range), sample: false, generatedAt: NOW.toISOString() })

function memoryStore(initial?: unknown): SnapshotStore & { saved: VisitsSnapshot[] } {
  let value = initial
  const saved: VisitsSnapshot[] = []
  return {
    saved,
    read: async () => value,
    write: async (snapshot) => {
      saved.push(snapshot)
      value = JSON.parse(JSON.stringify(snapshot))
    },
  }
}

const snapshotWith = (reports: Record<string, unknown>) => ({ version: VISITS_SNAPSHOT_VERSION, updatedAt: NOW.toISOString(), reports })

describe('snapshotReport', () => {
  it('returns valid report for range', () => {
    expect(snapshotReport(snapshotWith({ '7d': realReport('7d') }), '7d')?.sample).toBe(false)
  })

  it('nothing when missing, wrong version, invalid contract, or wrong range', () => {
    expect(snapshotReport(undefined, '7d')).toBeUndefined()
    expect(snapshotReport({ ...snapshotWith({ '7d': realReport('7d') }), version: 2 }, '7d')).toBeUndefined()
    expect(snapshotReport(snapshotWith({ '7d': { ...realReport('7d'), kpis: null } }), '7d')).toBeUndefined()
    expect(snapshotReport(snapshotWith({ '7d': realReport('30d') }), '7d')).toBeUndefined()
  })

  it('one broken range does not invalidate others', () => {
    const reports = validSnapshotReports(snapshotWith({ '1d': { broken: true }, '30d': realReport('30d') }))
    expect(Object.keys(reports)).toEqual(['30d'])
  })
})

describe('selectVisitsReport', () => {
  it('prefers snapshot', async () => {
    const store = memoryStore(snapshotWith({ '7d': realReport('7d') }))
    const selected = await selectVisitsReport('7d', [snapshotSource(store), mockSource])
    expect(selected.source).toBe('snapshot')
    expect(selected.report.sample).toBe(false)
  })

  it('without snapshot, invalid, or store down: mock', async () => {
    for (const store of [memoryStore(), memoryStore({ nope: 1 })]) {
      const selected = await selectVisitsReport('30d', [snapshotSource(store), mockSource])
      expect(selected).toEqual({ report: buildMockReport('30d'), source: 'mock' })
    }
    const down: VisitsDataSource = { name: 'snapshot', report: () => Promise.reject(new Error('Blobs unavailable')) }
    expect((await selectVisitsReport('1d', [down])).source).toBe('mock')
  })

  it('leaves room for a «live» source ahead', async () => {
    const live: VisitsDataSource = { name: 'live', report: async (range) => realReport(range) }
    expect((await selectVisitsReport('1d', [live, mockSource])).source).toBe('live')
  })
})

describe('refreshSnapshot', () => {
  it('saves all three ranges with update timestamp', async () => {
    const store = memoryStore()
    const result = await refreshSnapshot(store, async (range) => realReport(range), NOW)
    expect(result).toEqual({ updated: ['1d', '7d', '30d'], failed: [], written: true })
    expect(store.saved[0]?.updatedAt).toBe(NOW.toISOString())
    expect(Object.keys(store.saved[0]?.reports ?? {})).toEqual(['1d', '7d', '30d'])
  })

  it('failed or invalid range keeps previous report', async () => {
    const old = { ...realReport('1d'), generatedAt: '2026-10-31T21:00:00.000Z' }
    const store = memoryStore(snapshotWith({ '1d': old }))
    const result = await refreshSnapshot(
      store,
      async (range) => {
        if (range === '1d') throw new Error('GA4 runReport returned 429 RESOURCE_EXHAUSTED')
        if (range === '30d') return { ...realReport('30d'), countries: [{ iso: 'españa', visits: 1 }] }
        return realReport(range)
      },
      NOW,
    )
    expect(result.updated).toEqual(['7d'])
    expect(result.failed.map((failure) => failure.range)).toEqual(['1d', '30d'])
    expect(store.saved[0]?.reports['1d']?.generatedAt).toBe(old.generatedAt)
    expect(store.saved[0]?.reports['30d']).toBeUndefined()
  })

  it('when nothing refreshes, does not write', async () => {
    const store = memoryStore()
    const result = await refreshSnapshot(store, () => Promise.reject(new Error('no network')), NOW)
    expect(result.written).toBe(false)
    expect(store.saved).toHaveLength(0)
  })
})
