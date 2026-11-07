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

describe('instantánea en Netlify Blobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    blobs.getStore.mockReturnValue({ get: blobs.get, setJSON: blobs.setJSON })
  })

  it('no abre el store al crearse (solo hay contexto de Blobs dentro de la función)', () => {
    blobSnapshotStore()
    expect(blobs.getStore).not.toHaveBeenCalled()
  })

  it('lee y escribe la clave de la instantánea como JSON en el store «visits»', async () => {
    blobs.get.mockResolvedValue(SNAPSHOT)
    const store = blobSnapshotStore()
    expect(await store.read()).toEqual(SNAPSHOT)
    expect(blobs.getStore).toHaveBeenCalledWith(VISITS_BLOB_STORE)
    expect(blobs.get).toHaveBeenCalledWith(VISITS_SNAPSHOT_KEY, { type: 'json' })
    await store.write(SNAPSHOT)
    expect(blobs.setJSON).toHaveBeenCalledWith(VISITS_SNAPSHOT_KEY, SNAPSHOT)
  })

  it('sin instantánea guardada lee undefined', async () => {
    blobs.get.mockResolvedValue(null)
    expect(await blobSnapshotStore().read()).toBeUndefined()
  })
})

describe('instantánea en fichero (pruebas en local)', () => {
  it('escribe JSON legible creando la carpeta y lo vuelve a leer', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'visits-')), '.data/visits-snapshot.json')
    const store = fileSnapshotStore(file)
    await store.write(SNAPSHOT)
    expect(readFileSync(file, 'utf8')).toBe(`${JSON.stringify(SNAPSHOT, null, 2)}\n`)
    expect(await store.read()).toEqual(SNAPSHOT)
  })

  it('si el fichero no existe o no es JSON lee undefined', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'visits-'))
    expect(await fileSnapshotStore(join(directory, 'no-existe.json')).read()).toBeUndefined()
    writeFileSync(join(directory, 'roto.json'), '{')
    expect(await fileSnapshotStore(join(directory, 'roto.json')).read()).toBeUndefined()
  })
})
