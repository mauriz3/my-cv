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

/** Ejecuta el script inline y devuelve las llamadas a gtag que dejó en dataLayer. */
function runInlineScript(stored?: string) {
  const context: Record<string, unknown> = { localStorage: fakeStorage(stored), Date }
  context.window = context
  runInNewContext(buildAnalyticsInlineScript(ANALYTICS_MEASUREMENT_ID), context)
  return (context.dataLayer as ArrayLike<unknown>[]).map((call) => Array.from(call))
}

describe('Consent Mode v2 (script inline)', () => {
  it('todo «denied» por defecto, antes de configurar GA', () => {
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

  it('sin elección guardada o con «denied» no activa analytics_storage', () => {
    for (const stored of [undefined, 'denied']) {
      const updates = runInlineScript(stored).filter(([, action]) => action === 'update')
      expect(updates).toEqual([])
    }
  })

  it('con «granted» guardado, solo activa analytics_storage', () => {
    const updates = runInlineScript('granted').filter(([, action]) => action === 'update')
    expect(updates).toEqual([['consent', 'update', { analytics_storage: 'granted' }]])
  })

  it('no lleva datos personales ni señales de anuncios', () => {
    const script = buildAnalyticsInlineScript(ANALYTICS_MEASUREMENT_ID)
    expect(script).toContain('allow_google_signals:false')
    expect(script).toContain('allow_ad_personalization_signals:false')
  })
})

describe('aviso de consentimiento', () => {
  it('lee solo valores válidos', () => {
    expect(readConsent(fakeStorage())).toBeNull()
    expect(readConsent(fakeStorage('otra-cosa'))).toBeNull()
    expect(readConsent(fakeStorage('granted'))).toBe('granted')
    expect(readConsent(fakeStorage('denied'))).toBe('denied')
  })

  it('Aceptar guarda «granted» y activa analytics_storage', () => {
    const storage = fakeStorage()
    const calls: unknown[][] = []
    applyConsent('granted', storage, (...args) => void calls.push(args))
    expect(storage.store.get(CONSENT_STORAGE_KEY)).toBe('granted')
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'granted' }]])
  })

  it('Rechazar guarda «denied» y deja analytics_storage en «denied»', () => {
    const storage = fakeStorage()
    const calls: unknown[][] = []
    applyConsent('denied', storage, (...args) => void calls.push(args))
    expect(storage.store.get(CONSENT_STORAGE_KEY)).toBe('denied')
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'denied' }]])
  })

  it('cambiar la elección guardada (Preferencias de analítica) actualiza el consentimiento en ambos sentidos', () => {
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

  it('fuera de la zona con aviso: concede sin guardar la elección', () => {
    const calls: unknown[][] = []
    updateConsent('granted', (...args) => void calls.push(args))
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'granted' }]])
    expect(() => updateConsent('granted', undefined)).not.toThrow()
  })

  it('si localStorage está bloqueado no rompe', () => {
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

describe('CSP de analytics', () => {
  it('script-src solo admite el host exacto de gtag.js', () => {
    expect(ANALYTICS_CSP_SOURCES['script-src']).toEqual(['https://www.googletagmanager.com'])
    expect(GTAG_SCRIPT_URL.startsWith(`${ANALYTICS_CSP_SOURCES['script-src'][0]}/`)).toBe(true)
  })

  it('las peticiones de medición van a los orígenes de Google Analytics por https', () => {
    for (const directive of ['connect-src', 'img-src'] as const) {
      const sources = ANALYTICS_CSP_SOURCES[directive]
      expect(sources.every((source) => source.startsWith('https://'))).toBe(true)
      expect(sources).toEqual(
        expect.arrayContaining(['https://*.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com']),
      )
    }
  })
})
