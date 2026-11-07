import { createSign } from 'node:crypto'
import { z } from './zod'

/**
 * Token OAuth de Google para una cuenta de servicio (flujo JWT bearer, RFC 7523) firmando el JWT
 * con `node:crypto`: sin `google-auth-library` ni dependencias nuevas.
 * Nunca se registra ni se devuelve la clave privada ni el token en mensajes de error.
 */

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const ANALYTICS_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
/** Vida del JWT firmado (Google acepta como máximo 1 h). */
const ASSERTION_LIFETIME_SEC = 3600
const MS_PER_SECOND = 1000

/** Lo único que se usa del JSON de la clave de la cuenta de servicio. */
const ServiceAccountSchema = z.object({
  client_email: z.email(),
  private_key: z.string().includes('PRIVATE KEY'),
})
export type ServiceAccount = z.infer<typeof ServiceAccountSchema>

export class GoogleAuthError extends Error {
  override name = 'GoogleAuthError'
}

/** JSON de la clave (variable de entorno) → cuenta de servicio. El error no repite el contenido. */
export function parseServiceAccount(json: string): ServiceAccount {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new GoogleAuthError('La clave de la cuenta de servicio no es JSON válido')
  }
  const parsed = ServiceAccountSchema.safeParse(raw)
  if (!parsed.success) throw new GoogleAuthError('A la clave de la cuenta de servicio le falta client_email o private_key')
  return parsed.data
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

/** JWT RS256 firmado con la clave de la cuenta de servicio (lo que se canjea por el token). */
export function buildJwtAssertion(account: ServiceAccount, now: Date, scope = ANALYTICS_READONLY_SCOPE): string {
  const issuedAt = Math.floor(now.getTime() / MS_PER_SECOND)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope,
      aud: GOOGLE_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + ASSERTION_LIFETIME_SEC,
    }),
  )
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key)
  return `${header}.${claims}.${base64Url(signature)}`
}

const TokenResponseSchema = z.object({ access_token: z.string().min(1) })

/** Canjea el JWT por un token de acceso de solo lectura de Analytics. */
export async function fetchAccessToken(account: ServiceAccount, fetchFn: typeof fetch, now: Date): Promise<string> {
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion: buildJwtAssertion(account, now) }),
  })
  if (!response.ok) throw new GoogleAuthError(`Google OAuth respondió ${response.status}`)
  const parsed = TokenResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new GoogleAuthError('Google OAuth no devolvió access_token')
  return parsed.data.access_token
}
