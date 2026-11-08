import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from '../../lib/zod'

const SOURCE_DIRECTORIES = ['app', 'lib', 'data', 'server', 'netlify', 'scripts']
const ZOD_ENTRY = join('lib', 'zod.ts')
const DIRECT_ZOD_IMPORT = /from ['"]zod['"]/

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(ts|mjs|vue)$/.test(file))
    .map((file) => join(directory, file))
}

describe('zod without JIT (CSP without unsafe-eval)', () => {
  it('disables JIT, which would use `new Function` and be blocked by CSP', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('nothing imports zod directly except lib/zod.ts', () => {
    const offenders = SOURCE_DIRECTORIES.flatMap(sourceFiles).filter(
      (file) => file !== ZOD_ENTRY && DIRECT_ZOD_IMPORT.test(readFileSync(file, 'utf8'))
    )
    expect(offenders).toEqual([])
  })
})
