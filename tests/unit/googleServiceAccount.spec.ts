import { createVerify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_READONLY_SCOPE,
  GOOGLE_TOKEN_URL,
  buildJwtAssertion,
  fetchAccessToken,
  parseServiceAccount,
} from '../../lib/googleServiceAccount'
import { NOW, TEST_PUBLIC_KEY, TEST_SERVICE_ACCOUNT, TEST_SERVICE_ACCOUNT_JSON, TEST_TOKEN, fakeGoogleFetch } from './fixtures/ga4'

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<string, unknown>

describe('parseServiceAccount', () => {
  it('reads client_email and private_key from the key JSON', () => {
    expect(parseServiceAccount(TEST_SERVICE_ACCOUNT_JSON)).toEqual(TEST_SERVICE_ACCOUNT)
  })

  it('fails without echoing key contents', () => {
    expect(() => parseServiceAccount('{"private_key": "secret')).toThrow('not valid JSON')
    const error = (() => {
      try {
        parseServiceAccount(JSON.stringify({ private_key: 'secret-PRIVATE KEY' }))
      } catch (caught) {
        return caught as Error
      }
    })()
    expect(error?.message).toContain('client_email')
    expect(error?.message).not.toContain('secret')
  })
})

describe('buildJwtAssertion', () => {
  it('signs an RS256 JWT for the Google token with read-only scope and 1 h lifetime', () => {
    const jwt = buildJwtAssertion(TEST_SERVICE_ACCOUNT, NOW)
    const [header = '', claims = '', signature = ''] = jwt.split('.')
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
    const iat = NOW.getTime() / 1000
    expect(decode(claims)).toEqual({
      iss: TEST_SERVICE_ACCOUNT.client_email,
      scope: ANALYTICS_READONLY_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: Math.floor(iat),
      exp: Math.floor(iat) + 3600,
    })
    const valid = createVerify('RSA-SHA256').update(`${header}.${claims}`).verify(TEST_PUBLIC_KEY, Buffer.from(signature, 'base64url'))
    expect(valid).toBe(true)
  })
})

describe('fetchAccessToken', () => {
  it('exchanges the JWT for the token (grant jwt-bearer)', async () => {
    const google = fakeGoogleFetch()
    expect(await fetchAccessToken(TEST_SERVICE_ACCOUNT, google.fetch, NOW)).toBe(TEST_TOKEN)
    const body = new URLSearchParams(String(google.calls[0]?.init?.body))
    expect(google.calls[0]?.url).toBe(GOOGLE_TOKEN_URL)
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(body.get('assertion')?.split('.')).toHaveLength(3)
  })

  it('a Google error only reports the HTTP status', async () => {
    const failing = (async () => Response.json({ error: 'invalid_grant' }, { status: 400 })) as unknown as typeof fetch
    await expect(fetchAccessToken(TEST_SERVICE_ACCOUNT, failing, NOW)).rejects.toThrow('Google OAuth returned 400')
  })
})
