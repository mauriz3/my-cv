import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { brandColor, brandPalette, ogImageHtml } from '../../scripts/og-image.mjs'

const MAIN_CSS = readFileSync(new URL('../../app/assets/css/main.css', import.meta.url), 'utf8')
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

describe('scripts/og-image.mjs', () => {
  it('lee los azules de la marca de main.css', () => {
    const palette = brandPalette(MAIN_CSS)
    for (const color of Object.values(palette)) expect(color).toMatch(HEX_COLOR)
    expect(palette.brand).toBe(brandColor(MAIN_CSS, 700))
  })

  it('falla si main.css pierde un token de marca', () => {
    expect(() => brandColor('--color-brand-700: #123456;', 900)).toThrow('--color-brand-900')
  })

  it('compone la imagen con nombre, titular y dominio, sin datos de contacto', () => {
    const palette = { brand: '#111111', brandDeep: '#222222', brandSoft: '#333333', brandAccent: '#444444' }
    const html = ogImageHtml(palette)
    expect(html).toContain('<h1>Maurizio Rendon</h1>')
    expect(html).toContain('Senior Software Engineer')
    expect(html).toContain('mauriziorendon.com')
    expect(html).toContain('linear-gradient(135deg, #111111 0%, #111111 55%, #222222 100%)')
    expect(html).not.toMatch(/mailto:|tel:|\w@\w/)
  })
})
