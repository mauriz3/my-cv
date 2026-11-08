import { describe, expect, it } from 'vitest'
import { getCv } from '~~/data/cv'
import { withSetup } from './helpers'

describe('useConsentBanner', () => {
  it('reopen shows banner and requests focus; state is shared across calls', () => {
    const banner = useConsentBanner()
    banner.isOpen.value = false
    banner.wantsFocus.value = false
    useConsentBanner().reopen()
    expect(banner.isOpen.value).toBe(true)
    expect(banner.wantsFocus.value).toBe(true)
  })
})

describe('useLegendToggle', () => {
  it('hides and shows a series by key without affecting others', () => {
    const { isHidden, toggle } = useLegendToggle()
    toggle('current')
    toggle('previous')
    toggle(undefined)
    expect(isHidden('current')).toBe(true)
    toggle('current')
    expect(isHidden('current')).toBe(false)
    expect(isHidden('previous')).toBe(true)
  })
})

describe('useCv and useProfileTitle', () => {
  it('return CV and Profile title in the active locale', async () => {
    const { result } = await withSetup(() => ({ cv: useCv(), title: useProfileTitle(), i18n: useI18n() }))
    expect(result.cv.value).toEqual(getCv('en'))
    expect(result.title()).toBe(`${getCv('en').fullName} · Profile`)
    await result.i18n.setLocale('es')
    expect(result.cv.value).toEqual(getCv('es'))
    expect(result.title()).toBe(`${getCv('es').fullName} · Perfil`)
    await result.i18n.setLocale('en')
  })
})
