import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_CSP_SOURCES,
  ANALYTICS_MEASUREMENT_ID,
  CONSENT_STORAGE_KEY,
  CONSENT_WAIT_FOR_UPDATE_MS,
  GTAG_SCRIPT_URL,
  applyConsent,
  updateConsent,
  buildAnalyticsInlineScript,
  readConsent,
} from '../../lib/analytics'

function fakeStorage(initial?: string) {
  const store = new Map<string, string>()
  if (initial !== undefined) store.set(CONSENT_STORAGE_KEY, initial)
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  }
}

/** Runs the inline script and returns gtag calls left on dataLayer. */
function runInlineScript(stored?: string) {
  const context: Record<string, unknown> = { localStorage: fakeStorage(stored), Date }
  context.window = context
  runInNewContext(buildAnalyticsInlineScript(ANALYTICS_MEASUREMENT_ID), context)
  return (context.dataLayer as ArrayLike<unknown>[]).map((call) => Array.from(call))
}

describe('Consent Mode v2 (inline script)', () => {
  it('all «denied» by default, before configuring GA', () => {
    const [consentDefault, , config] = runInlineScript()
    expect(consentDefault).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS,
      },
    ])
    expect(config?.[0]).toBe('config')
    expect(config?.[1]).toBe(ANALYTICS_MEASUREMENT_ID)
  })

  it('with no stored choice or «denied», does not enable analytics_storage', () => {
    for (const stored of [undefined, 'denied']) {
      const updates = runInlineScript(stored).filter(([, action]) => action === 'update')
      expect(updates).toEqual([])
    }
  })

  it('with stored «granted», only enables analytics_storage', () => {
    const updates = runInlineScript('granted').filter(([, action]) => action === 'update')
    expect(updates).toEqual([['consent', 'update', { analytics_storage: 'granted' }]])
  })

  it('does not include personal data or ad signals', () => {
    const script = buildAnalyticsInlineScript(ANALYTICS_MEASUREMENT_ID)
    expect(script).toContain('allow_google_signals:false')
    expect(script).toContain('allow_ad_personalization_signals:false')
  })
})

describe('consent banner', () => {
  it('reads only valid values', () => {
    expect(readConsent(fakeStorage())).toBeNull()
    expect(readConsent(fakeStorage('other'))).toBeNull()
    expect(readConsent(fakeStorage('granted'))).toBe('granted')
    expect(readConsent(fakeStorage('denied'))).toBe('denied')
  })

  it('Accept stores «granted» and enables analytics_storage', () => {
    const storage = fakeStorage()
    const calls: unknown[][] = []
    applyConsent('granted', storage, (...args) => void calls.push(args))
    expect(storage.store.get(CONSENT_STORAGE_KEY)).toBe('granted')
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'granted' }]])
  })

  it('Reject stores «denied» and keeps analytics_storage «denied»', () => {
    const storage = fakeStorage()
    const calls: unknown[][] = []
    applyConsent('denied', storage, (...args) => void calls.push(args))
    expect(storage.store.get(CONSENT_STORAGE_KEY)).toBe('denied')
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'denied' }]])
  })

  it('changing stored choice (Analytics preferences) updates consent both ways', () => {
    const storage = fakeStorage('granted')
    const calls: unknown[][] = []
    const gtag = (...args: unknown[]) => void calls.push(args)
    applyConsent('denied', storage, gtag)
    expect(readConsent(storage)).toBe('denied')
    applyConsent('granted', storage, gtag)
    expect(readConsent(storage)).toBe('granted')
    expect(calls.map(([, , params]) => params)).toEqual([
      { analytics_storage: 'denied' },
      { analytics_storage: 'granted' },
    ])
  })

  it('outside notice region: grant without storing choice', () => {
    const calls: unknown[][] = []
    updateConsent('granted', (...args) => void calls.push(args))
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'granted' }]])
    expect(() => updateConsent('granted', undefined)).not.toThrow()
  })

  it('when localStorage is blocked, does not break', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readConsent(blocked)).toBeNull()
    expect(() => applyConsent('granted', blocked, undefined)).not.toThrow()
  })
})

describe('analytics CSP', () => {
  it('script-src only allows the exact gtag.js host', () => {
    expect(ANALYTICS_CSP_SOURCES['script-src']).toEqual(['https://www.googletagmanager.com'])
    expect(GTAG_SCRIPT_URL.startsWith(`${ANALYTICS_CSP_SOURCES['script-src'][0]}/`)).toBe(true)
  })

  it('measurement requests go to Google Analytics origins over https', () => {
    for (const directive of ['connect-src', 'img-src'] as const) {
      const sources = ANALYTICS_CSP_SOURCES[directive]
      expect(sources.every((source) => source.startsWith('https://'))).toBe(true)
      expect(sources).toEqual(
        expect.arrayContaining(['https://*.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com']),
      )
    }
  })
})
