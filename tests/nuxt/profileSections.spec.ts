import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AboutSection from '~/components/AboutSection.vue'
import LanguagesSection from '~/components/LanguagesSection.vue'
import { BODY_DELAY_MS, QUOTE_TEXT_DELAY_MS } from '~~/lib/profileSections'
import { stubIntersectionObserver, withSetup } from './helpers'

async function useLocale(locale: 'en' | 'es') {
  const { result } = await withSetup(() => useI18n())
  await result.setLocale(locale)
}

describe('profile about and languages', () => {
  beforeEach(() => {
    stubIntersectionObserver()
    document.documentElement.setAttribute('data-motion', 'reduced')
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('data-motion')
    await useLocale('en')
  })

  it('renders the English about card without an example badge', async () => {
    const wrapper = await mountSuspended(AboutSection)
    expect(wrapper.get('h2').text()).toBe('About me')
    expect(wrapper.get('blockquote').text()).toContain('Creative thinking + UX + prototyping = Minimum Viable Product.')
    expect(wrapper.text()).toContain('I build web platforms, dashboards, PWAs and CMS sites')
    expect(wrapper.text().toLowerCase()).not.toContain('example')
    expect(wrapper.get('[data-testid="mvp-equation"]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('data-reveal')).toBe('hidden')
    expect(wrapper.get('.about__quote-bar').attributes('style')).toContain('--enter-delay: 0ms')
    expect(wrapper.get('.about__quote-text').attributes('style')).toContain(`--enter-delay: ${QUOTE_TEXT_DELAY_MS}ms`)
    expect(wrapper.get('.about__body').attributes('style')).toContain(`--enter-delay: ${BODY_DELAY_MS}ms`)
    wrapper.unmount()
  })

  it('renders the Spanish about copy', async () => {
    await useLocale('es')
    const wrapper = await mountSuspended(AboutSection)
    expect(wrapper.get('h2').text()).toBe('Sobre mí')
    expect(wrapper.text()).toContain('«Pensamiento creativo + UX + prototipado = Producto Mínimo Viable.»')
    expect(wrapper.text()).toContain('Construyo plataformas web, dashboards, PWAs y sitios CMS')
    expect(wrapper.text().toLowerCase()).not.toContain('ejemplo')
    wrapper.unmount()
  })

  it('renders three language cards with fractions, badges, and an accessible scale', async () => {
    const wrapper = await mountSuspended(LanguagesSection)
    expect(wrapper.get('h2').text()).toBe('Languages')
    expect(wrapper.text()).toContain('Six-step scale (A1–C2)')
    expect(wrapper.text().toLowerCase()).not.toContain('example')

    const spanish = wrapper.get('[data-testid="language-spanish"]')
    const english = wrapper.get('[data-testid="language-english"]')
    const italian = wrapper.get('[data-testid="language-italian"]')

    expect(spanish.text()).toContain('Spanish')
    expect(spanish.text()).toContain('C2 · Mastery')
    expect(spanish.text()).toContain('6/6')
    expect(spanish.text()).toContain('Native use: architecture, documentation and daily communication.')
    expect(spanish.findAll('[data-filled="true"]')).toHaveLength(6)
    expect(spanish.get('[role="img"]').attributes('aria-label')).toBe('Level C2, 6 of 6')
    expect(spanish.get('[data-current="true"]').text()).toBe('C2')
    expect(spanish.attributes('style')).toContain('--enter-delay: 0ms')
    expect(spanish.get('.language-card__badge').attributes('style')).toContain('--enter-delay: 495ms')

    expect(english.text()).toContain('B2 · Upper intermediate')
    expect(english.text()).toContain('4/6')
    expect(english.findAll('[data-filled="true"]')).toHaveLength(4)
    expect(english.get('[role="img"]').attributes('aria-label')).toBe('Level B2, 4 of 6')
    expect(english.get('[data-current="true"]').text()).toBe('B2')
    expect(english.attributes('style')).toContain('--enter-delay: 90ms')

    expect(italian.text()).toContain('B1 · Intermediate')
    expect(italian.text()).toContain('3/6')
    expect(italian.findAll('[data-filled="true"]')).toHaveLength(3)
    expect(italian.get('[role="img"]').attributes('aria-label')).toBe('Level B1, 3 of 6')
    expect(italian.attributes('style')).toContain('--enter-delay: 180ms')
    expect(wrapper.get('ul').attributes('data-reveal')).toBe('hidden')
    wrapper.unmount()
  })

  it('renders the Spanish language labels', async () => {
    await useLocale('es')
    const wrapper = await mountSuspended(LanguagesSection)
    expect(wrapper.get('h2').text()).toBe('Idiomas')
    expect(wrapper.text()).toContain('Escala de 6 tramos (A1–C2) con nivel y contexto de uso')
    expect(wrapper.get('[data-testid="language-spanish"]').text()).toContain('C2 · Maestría')
    expect(wrapper.get('[data-testid="language-spanish"]').text()).toContain('Uso nativo: arquitectura, documentación y comunicación diaria.')
    expect(wrapper.get('[data-testid="language-english"]').text()).toContain('B2 · Intermedio alto')
    expect(wrapper.get('[data-testid="language-italian"]').text()).toContain('B1 · Intermedio')
    expect(wrapper.get('[data-testid="language-spanish"] [role="img"]').attributes('aria-label')).toBe('Nivel C2, 6 de 6')
    expect(wrapper.text().toLowerCase()).not.toContain('ejemplo')
    wrapper.unmount()
  })
})
