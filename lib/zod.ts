import { z } from 'zod'

/**
 * Zod con `jitless`: sin esto, al validar el primer objeto prueba `new Function('')` para compilar
 * validadores; la CSP (sin `unsafe-eval`) lo bloquea y Chrome lo anota como violación (Lighthouse,
 * buenas prácticas). Validar sin JIT basta para estos datos. Todo el código importa `z` desde aquí.
 */
z.config({ jitless: true })

export { z }
