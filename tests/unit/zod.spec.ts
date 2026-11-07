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

describe('zod sin JIT (CSP sin unsafe-eval)', () => {
  it('desactiva el JIT, que probaría `new Function` y la CSP lo bloquearía', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('nadie importa zod directamente salvo lib/zod.ts', () => {
    const offenders = SOURCE_DIRECTORIES.flatMap(sourceFiles).filter(
      (file) => file !== ZOD_ENTRY && DIRECT_ZOD_IMPORT.test(readFileSync(file, 'utf8'))
    )
    expect(offenders).toEqual([])
  })
})
