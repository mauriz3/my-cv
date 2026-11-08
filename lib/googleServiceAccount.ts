import { createSign } from 'node:crypto'
import { z } from './zod'

/**
 * Google OAuth token for a service account (JWT bearer flow, RFC 7523) signing the JWT
 * with `node:crypto`: no `google-auth-library` or extra dependencies.
 * Private key and token are never logged or returned in error messages.
 */

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const ANALYTICS_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
/** Signed JWT lifetime (Google accepts at most 1 h). */
const ASSERTION_LIFETIME_SEC = 3600
const MS_PER_SECOND = 1000

/** Only fields used from the service account key JSON. */
const ServiceAccountSchema = z.object({
  client_email: z.email(),
  private_key: z.string().includes('PRIVATE KEY'),
})
export type ServiceAccount = z.infer<typeof ServiceAccountSchema>

export class GoogleAuthError extends Error {
  override name = 'GoogleAuthError'
}

/** Key JSON (env var) → service account. Error does not echo the payload. */
export function parseServiceAccount(json: string): ServiceAccount {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new GoogleAuthError('Service account key is not valid JSON')
  }
  const parsed = ServiceAccountSchema.safeParse(raw)
  if (!parsed.success) throw new GoogleAuthError('Service account key missing client_email or private_key')
  return parsed.data
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

/** RS256 JWT signed with the service account key (exchanged for the token). */
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

/** Exchanges the JWT for a read-only Analytics access token. */
export async function fetchAccessToken(account: ServiceAccount, fetchFn: typeof fetch, now: Date): Promise<string> {
  const response = await fetchFn(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion: buildJwtAssertion(account, now) }),
  })
  if (!response.ok) throw new GoogleAuthError(`Google OAuth returned ${response.status}`)
  const parsed = TokenResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new GoogleAuthError('Google OAuth did not return access_token')
  return parsed.data.access_token
}
