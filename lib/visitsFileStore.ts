import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SnapshotStore } from './visitsSnapshot'

/** Snapshot in a JSON file (local testing only; `.data/` is in .gitignore). */
export const LOCAL_SNAPSHOT_FILE = '.data/visits-snapshot.json'

export function fileSnapshotStore(path: string): SnapshotStore {
  return {
    read: async () => {
      try {
        return JSON.parse(await readFile(path, 'utf8')) as unknown
      } catch {
        return undefined
      }
    },
    write: async (snapshot) => {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`)
    },
  }
}
