import { getStore } from '@netlify/blobs'
import { VISITS_BLOB_STORE, VISITS_SNAPSHOT_KEY, type SnapshotStore } from './visitsSnapshot'

/**
 * Snapshot in Netlify Blobs (site store `visits`, key `snapshot`). Only inside Netlify
 * functions, which provide the Blobs context; `getStore` is called on use, not on import.
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
