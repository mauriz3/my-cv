import { getStore } from '@netlify/blobs'
import { VISITS_BLOB_STORE, VISITS_SNAPSHOT_KEY, type SnapshotStore } from './visitsSnapshot'

/**
 * Instantánea en Netlify Blobs (store de sitio `visits`, clave `snapshot`). Solo dentro de las
 * funciones de Netlify, que dan el contexto de Blobs; `getStore` se llama al usarlo, no al importar.
 */
export function blobSnapshotStore(): SnapshotStore {
  const store = () => getStore(VISITS_BLOB_STORE)
  return {
    read: async () => (await store().get(VISITS_SNAPSHOT_KEY, { type: 'json' })) ?? undefined,
    write: async (snapshot) => {
      await store().setJSON(VISITS_SNAPSHOT_KEY, snapshot)
    },
  }
}
