import { z } from 'zod'

/**
 * Zod with `jitless`: without it, validating the first object tries `new Function('')` to compile
 * validators; CSP (no `unsafe-eval`) blocks it and Chrome flags it as a violation (Lighthouse,
 * best practices). Validating without JIT is enough for this data. All code imports `z` from here.
 */
z.config({ jitless: true })

export { z }
