import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blobSnapshotStore } from '../../lib/visitsBlobStore'
import { fileSnapshotStore } from '../../lib/visitsFileStore'
import { VISITS_BLOB_STORE, VISITS_SNAPSHOT_KEY, VISITS_SNAPSHOT_VERSION, type VisitsSnapshot } from '../../lib/visitsSnapshot'

const blobs = vi.hoisted(() => ({ get: vi.fn(), setJSON: vi.fn(), getStore: vi.fn() }))
vi.mock('@netlify/blobs', () => ({ getStore: blobs.getStore }))

const SNAPSHOT: VisitsSnapshot = { version: VISITS_SNAPSHOT_VERSION, updatedAt: '2026-11-07T00:00:00Z', reports: {} }

describe('snapshot in Netlify Blobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    blobs.getStore.mockReturnValue({ get: blobs.get, setJSON: blobs.setJSON })
  })

  it('does not open store on create (Blobs context only inside function)', () => {
    blobSnapshotStore()
    expect(blobs.getStore).not.toHaveBeenCalled()
  })

  it('reads and writes snapshot key as JSON in «visits» store', async () => {
    blobs.get.mockResolvedValue(SNAPSHOT)
    const store = blobSnapshotStore()
    expect(await store.read()).toEqual(SNAPSHOT)
    expect(blobs.getStore).toHaveBeenCalledWith(VISITS_BLOB_STORE)
    expect(blobs.get).toHaveBeenCalledWith(VISITS_SNAPSHOT_KEY, { type: 'json' })
    await store.write(SNAPSHOT)
    expect(blobs.setJSON).toHaveBeenCalledWith(VISITS_SNAPSHOT_KEY, SNAPSHOT)
  })

  it('reads undefined when no snapshot saved', async () => {
    blobs.get.mockResolvedValue(null)
    expect(await blobSnapshotStore().read()).toBeUndefined()
  })
})

describe('snapshot on file (local tests)', () => {
  it('writes readable JSON creating folder and reads back', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'visits-')), '.data/visits-snapshot.json')
    const store = fileSnapshotStore(file)
    await store.write(SNAPSHOT)
    expect(readFileSync(file, 'utf8')).toBe(`${JSON.stringify(SNAPSHOT, null, 2)}\n`)
    expect(await store.read()).toEqual(SNAPSHOT)
  })

  it('reads undefined when file missing or not JSON', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'visits-'))
    expect(await fileSnapshotStore(join(directory, 'missing.json')).read()).toBeUndefined()
    writeFileSync(join(directory, 'broken.json'), '{')
    expect(await fileSnapshotStore(join(directory, 'broken.json')).read()).toBeUndefined()
  })
})
